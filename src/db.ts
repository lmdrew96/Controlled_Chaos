/**
 * Database service for Supabase
 * Handles tasks and chat messages persistence
 */

import { supabase, isSupabaseConfigured } from './supabase.js';
import { getCurrentUser } from './auth.js';
import { Task, ChatMessage, AppState } from './types.js';
import * as Storage from './storage.js';

/**
 * Load user data from Supabase (or localStorage if not configured)
 */
export async function loadUserData(): Promise<AppState> {
  const user = getCurrentUser();

  // If not logged in or Supabase not configured, use localStorage
  if (!user || !isSupabaseConfigured()) {
    return Storage.load();
  }

  try {
    // Load tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (tasksError) throw tasksError;

    // Load chat history
    const { data: chatHistory, error: chatError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: true });

    if (chatError) throw chatError;

    // Load settings
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Settings might not exist yet, that's okay
    const userSettings = settingsError ? { theme: 'light' as const } : {
      name: settings?.name,
      theme: (settings?.theme || 'light') as 'light' | 'dark'
    };

    return {
      tasks: tasks?.map(t => ({
        id: t.id,
        title: t.title,
        dueDate: t.due_date,
        dueTime: t.due_time,
        category: t.category,
        completed: t.completed,
        createdAt: t.created_at,
        notes: t.notes
      })) || [],
      chatHistory: chatHistory?.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp
      })) || [],
      settings: userSettings
    };
  } catch (error) {
    console.error('Error loading from Supabase:', error);
    // Fall back to localStorage
    return Storage.load();
  }
}

/**
 * Save a task to Supabase
 */
export async function saveTask(task: Task): Promise<void> {
  const user = getCurrentUser();

  if (!user || !isSupabaseConfigured()) {
    // Just update localStorage (handled by caller)
    return;
  }

  try {
    const { error } = await supabase
      .from('tasks')
      .upsert({
        id: task.id,
        user_id: user.id,
        title: task.title,
        due_date: task.dueDate,
        due_time: task.dueTime,
        category: task.category,
        completed: task.completed,
        created_at: task.createdAt,
        notes: task.notes
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error saving task:', error);
  }
}

/**
 * Delete a task from Supabase
 */
export async function deleteTask(taskId: string): Promise<void> {
  const user = getCurrentUser();

  if (!user || !isSupabaseConfigured()) {
    return;
  }

  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', user.id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting task:', error);
  }
}

/**
 * Save a chat message to Supabase
 */
export async function saveChatMessage(message: ChatMessage): Promise<void> {
  const user = getCurrentUser();

  if (!user || !isSupabaseConfigured()) {
    return;
  }

  try {
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        id: message.id,
        user_id: user.id,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error saving chat message:', error);
  }
}

/**
 * Save user settings to Supabase
 */
export async function saveSettings(settings: { name?: string; theme: 'light' | 'dark' }): Promise<void> {
  const user = getCurrentUser();

  if (!user || !isSupabaseConfigured()) {
    return;
  }

  try {
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        name: settings.name,
        theme: settings.theme
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

/**
 * Clear all chat history for user
 */
export async function clearChatHistory(): Promise<void> {
  const user = getCurrentUser();

  if (!user || !isSupabaseConfigured()) {
    return;
  }

  try {
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;
  } catch (error) {
    console.error('Error clearing chat history:', error);
  }
}

/**
 * Migrate localStorage data to Supabase for newly logged in user
 */
export async function migrateLocalDataToCloud(): Promise<void> {
  const user = getCurrentUser();

  if (!user || !isSupabaseConfigured()) {
    return;
  }

  const localData = Storage.load();

  // Check if user already has data in Supabase
  const { data: existingTasks } = await supabase
    .from('tasks')
    .select('id')
    .eq('user_id', user.id)
    .limit(1);

  // If user already has cloud data, don't migrate
  if (existingTasks && existingTasks.length > 0) {
    return;
  }

  // Migrate tasks
  for (const task of localData.tasks) {
    await saveTask(task);
  }

  // Migrate chat messages
  for (const message of localData.chatHistory) {
    await saveChatMessage(message);
  }

  // Migrate settings
  await saveSettings(localData.settings);

  console.log('Migrated local data to cloud');
}
