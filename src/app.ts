/**
 * Controlled Chaos - Main Application
 * An AI assistant for ADHD executive function
 */

import { Task, AppState, ChatMessage, ProposedTask } from './types.js';
import * as Storage from './storage.js';
import * as UI from './ui.js';
import * as API from './api.js';
import * as Auth from './auth.js';
import * as DB from './db.js';

// Application state
let state: AppState = Storage.load();

// Auth mode: 'signin' or 'signup'
let authMode: 'signin' | 'signup' = 'signin';

// Pending proposed tasks from AI
let pendingProposedTasks: ProposedTask[] = [];

// Speech recognition instance (using any for browser compatibility)
let recognition: any = null;

/**
 * Save state to localStorage and optionally to Supabase
 */
async function saveState(): Promise<void> {
  Storage.save(state);
}

/**
 * Save and re-render
 */
function saveAndRender(): void {
  saveState();
  UI.renderTasks(state.tasks);
}

/**
 * Add a new task
 */
async function addTask(taskData: {
  title: string;
  dueDate?: string | null;
  dueTime?: string | null;
  category?: 'school' | 'work' | 'life';
}): Promise<Task> {
  const task: Task = {
    id: Storage.generateId(),
    title: taskData.title,
    dueDate: taskData.dueDate || null,
    dueTime: taskData.dueTime || null,
    category: taskData.category || 'life',
    completed: false,
    createdAt: new Date().toISOString()
  };

  state.tasks.push(task);
  saveAndRender();

  // Save to Supabase in background
  DB.saveTask(task);

  return task;
}

/**
 * Toggle task completion with animation
 */
function toggleTask(id: string): void {
  const task = state.tasks.find(t => t.id === id);
  if (task) {
    const taskElement = document.querySelector(`.task-item[data-id="${id}"]`);

    // If completing (not uncompleting), add animation
    if (!task.completed && taskElement) {
      taskElement.classList.add('completing');

      // Wait for animation before updating state
      setTimeout(() => {
        task.completed = true;
        saveAndRender();
        DB.saveTask(task);
      }, 500);
    } else {
      // Uncompleting - no animation needed
      task.completed = !task.completed;
      saveAndRender();
      DB.saveTask(task);
    }
  }
}

/**
 * Delete a task
 */
function deleteTask(id: string): void {
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveAndRender();
  DB.deleteTask(id);
}

/**
 * Toggle theme
 */
function toggleTheme(): void {
  const newTheme = state.settings.theme === 'light' ? 'dark' : 'light';
  state.settings.theme = newTheme;
  UI.applyTheme(newTheme);
  Storage.save(state);
  DB.saveSettings(state.settings);
}

/**
 * Add a chat message to state
 */
function addChatMessage(role: 'user' | 'assistant', content: string): ChatMessage {
  const message: ChatMessage = {
    id: Storage.generateId(),
    role,
    content,
    timestamp: new Date().toISOString()
  };

  state.chatHistory.push(message);
  Storage.save(state);
  UI.renderChatMessages(state.chatHistory);

  // Save to Supabase in background
  DB.saveChatMessage(message);

  return message;
}

/**
 * Send a message to the AI
 */
async function sendMessage(messageText?: string): Promise<void> {
  const text = messageText || UI.elements.chatInput.value.trim();
  if (!text) return;

  // Clear input
  UI.elements.chatInput.value = '';

  // Add user message
  addChatMessage('user', text);

  // Show loading state
  UI.setChatLoading(true);
  UI.showTypingIndicator();

  try {
    // Get last 10 messages for context
    const recentMessages = state.chatHistory.slice(-10);

    // Call AI API
    const response = await API.sendChatMessage(recentMessages, state.tasks);

    // Hide loading
    UI.hideTypingIndicator();
    UI.setChatLoading(false);

    // Process tool calls
    if (response.toolCalls && response.toolCalls.length > 0) {
      // Check for proposed tasks
      const proposedTasks = API.extractProposedTasks(response.toolCalls);
      if (proposedTasks.length > 0) {
        pendingProposedTasks = proposedTasks;
        UI.showTaskConfirmationModal(proposedTasks);
      }

      // Check for task recommendation
      const recommendation = API.extractRecommendation(response.toolCalls);
      if (recommendation) {
        UI.highlightRecommendedTask(recommendation.taskId);
      }
    }

    // Add assistant message if present
    if (response.message) {
      addChatMessage('assistant', response.message);
    }

  } catch (error) {
    console.error('Chat error:', error);
    UI.hideTypingIndicator();
    UI.setChatLoading(false);

    addChatMessage('assistant', "Sorry, I had trouble processing that. Please try again.");
  }
}

/**
 * Handle "What should I do now?" button
 */
function handleWhatNow(): void {
  sendMessage("What should I do right now?");
}

/**
 * Confirm and add proposed tasks
 */
function confirmProposedTasks(): void {
  const selected = UI.getSelectedProposedTasks(pendingProposedTasks);

  selected.forEach(task => {
    addTask({
      title: task.title,
      dueDate: task.dueDate,
      dueTime: task.dueTime,
      category: task.category
    });
  });

  UI.hideTaskConfirmationModal();
  pendingProposedTasks = [];

  // Add confirmation message to chat
  if (selected.length > 0) {
    addChatMessage('assistant', `Added ${selected.length} task${selected.length > 1 ? 's' : ''}. What would you like to tackle first?`);
  }
}

/**
 * Cancel proposed tasks modal
 */
function cancelProposedTasks(): void {
  UI.hideTaskConfirmationModal();
  pendingProposedTasks = [];
}

/**
 * Initialize voice recognition
 */
function initVoiceRecognition(): void {
  // Check for browser support
  const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognitionAPI) {
    // Hide voice button if not supported
    UI.elements.voiceBtn.style.display = 'none';
    return;
  }

  recognition = new SpeechRecognitionAPI();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onresult = (event: any) => {
    const transcript = Array.from(event.results)
      .map((result: any) => result[0].transcript)
      .join('');
    UI.elements.chatInput.value = transcript;
  };

  recognition.onend = () => {
    UI.setVoiceRecording(false);
    // Focus the input so user can review/edit before sending
    UI.elements.chatInput.focus();
  };

  recognition.onerror = (event: any) => {
    console.error('Speech recognition error:', event.error);
    UI.setVoiceRecording(false);
  };
}

/**
 * Toggle voice recording
 */
function toggleVoiceInput(): void {
  if (!recognition) {
    initVoiceRecognition();
    if (!recognition) return;
  }

  if (UI.elements.voiceBtn.classList.contains('recording')) {
    recognition.stop();
    UI.setVoiceRecording(false);
  } else {
    UI.setVoiceRecording(true);
    recognition.start();
  }
}

/**
 * Handle add task form submission
 */
function handleAddTaskSubmit(e: Event): void {
  e.preventDefault();

  const title = UI.elements.taskTitle.value.trim();
  if (!title) return;

  addTask({
    title,
    dueDate: UI.elements.taskDate.value || null,
    dueTime: UI.elements.taskTime.value || null,
    category: UI.elements.taskCategory.value as 'school' | 'work' | 'life'
  });

  UI.hideAddTaskForm();
}

/**
 * Handle task checkbox and delete clicks (event delegation)
 */
function handleTaskClick(e: Event): void {
  const target = e.target as HTMLElement;

  // Handle checkbox
  if (target.classList.contains('task-checkbox')) {
    const taskId = target.getAttribute('data-task-id');
    if (taskId) toggleTask(taskId);
  }

  // Handle delete button
  if (target.classList.contains('task-delete')) {
    const taskId = target.getAttribute('data-task-id');
    if (taskId) deleteTask(taskId);
  }
}

// ============ AUTH HANDLERS ============

/**
 * Handle auth button click
 */
function handleAuthBtnClick(): void {
  UI.showAuthModal();
}

/**
 * Handle auth form submission
 */
async function handleAuthSubmit(e: Event): Promise<void> {
  e.preventDefault();

  const email = UI.elements.authEmail.value.trim();
  const password = UI.elements.authPassword.value;

  if (!email || !password) return;

  UI.setAuthLoading(true);
  UI.hideAuthError();

  let result;
  if (authMode === 'signin') {
    result = await Auth.signIn(email, password);
  } else {
    result = await Auth.signUp(email, password);
  }

  UI.setAuthLoading(false);

  if (result.error) {
    UI.showAuthError(result.error);
  } else if (authMode === 'signup') {
    // Show success message for signup
    UI.showAuthError('Check your email to confirm your account!');
  }
}

/**
 * Toggle between sign in and sign up modes
 */
function toggleAuthMode(): void {
  authMode = authMode === 'signin' ? 'signup' : 'signin';
  if (authMode === 'signin') {
    UI.setAuthModeSignIn();
  } else {
    UI.setAuthModeSignUp();
  }
  UI.hideAuthError();
}

/**
 * Handle sign out
 */
async function handleSignOut(): Promise<void> {
  await Auth.signOut();
  UI.hideAuthModal();
}

/**
 * Handle skip auth (continue without account)
 */
function handleAuthSkip(): void {
  UI.hideAuthModal();
}

/**
 * Handle auth state change
 */
async function handleAuthChange(user: any): Promise<void> {
  if (user) {
    // User logged in
    UI.setLoggedInState(user.email || 'User');

    // Migrate local data to cloud if needed
    await DB.migrateLocalDataToCloud();

    // Load user data from cloud
    const cloudData = await DB.loadUserData();
    state = cloudData;

    // Re-render with cloud data
    UI.applyTheme(state.settings.theme);
    UI.renderTasks(state.tasks);
    UI.renderChatMessages(state.chatHistory);

    // Also save to localStorage as cache
    Storage.save(state);
  } else {
    // User logged out
    UI.setLoggedOutState();

    // Load from localStorage
    state = Storage.load();
    UI.renderTasks(state.tasks);
    UI.renderChatMessages(state.chatHistory);
  }
}

// ============ EVENT LISTENERS ============

/**
 * Initialize event listeners
 */
function initEventListeners(): void {
  // Add task form toggle
  UI.elements.addTaskToggle.addEventListener('click', UI.showAddTaskForm);
  UI.elements.cancelTask.addEventListener('click', UI.hideAddTaskForm);

  // Add task form submission
  UI.elements.addTaskForm.addEventListener('submit', handleAddTaskSubmit);

  // Task interactions (event delegation)
  UI.elements.taskGroups.addEventListener('click', handleTaskClick);

  // Theme toggle
  UI.elements.themeToggle.addEventListener('click', toggleTheme);

  // Chat send
  UI.elements.sendBtn.addEventListener('click', () => sendMessage());

  // Enter to send in chat
  UI.elements.chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // What now button
  UI.elements.whatNowBtn.addEventListener('click', handleWhatNow);

  // Voice input
  UI.elements.voiceBtn.addEventListener('click', toggleVoiceInput);

  // Task modal buttons
  UI.elements.confirmTasks.addEventListener('click', confirmProposedTasks);
  UI.elements.cancelModal.addEventListener('click', cancelProposedTasks);

  // Auth listeners
  UI.elements.authBtn.addEventListener('click', handleAuthBtnClick);
  UI.elements.authForm.addEventListener('submit', handleAuthSubmit);
  UI.elements.authToggleBtn.addEventListener('click', toggleAuthMode);
  UI.elements.authSignout.addEventListener('click', handleSignOut);
  UI.elements.authSkip.addEventListener('click', handleAuthSkip);

  // Close auth modal on background click
  UI.elements.authModal.addEventListener('click', (e) => {
    if (e.target === UI.elements.authModal) {
      UI.hideAuthModal();
    }
  });

  // Global keyboard shortcuts
  document.addEventListener('keydown', handleGlobalKeyboard);
}

/**
 * Handle global keyboard shortcuts
 */
function handleGlobalKeyboard(e: KeyboardEvent): void {
  // Escape - close modals and forms
  if (e.key === 'Escape') {
    // Close auth modal if open
    if (!UI.elements.authModal.classList.contains('hidden')) {
      UI.hideAuthModal();
      return;
    }

    // Close task modal if open
    if (!UI.elements.taskModal.classList.contains('hidden')) {
      cancelProposedTasks();
      return;
    }

    // Close add task form if open
    if (!UI.elements.addTaskForm.classList.contains('hidden')) {
      UI.hideAddTaskForm();
      return;
    }
  }

  // Ctrl/Cmd + N - New task
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault();
    UI.showAddTaskForm();
    return;
  }

  // Ctrl/Cmd + Enter - What should I do now?
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    // Only trigger if not in a text input
    const activeElement = document.activeElement;
    const isInInput = activeElement instanceof HTMLInputElement ||
                      activeElement instanceof HTMLTextAreaElement;

    if (!isInInput) {
      e.preventDefault();
      handleWhatNow();
    }
    return;
  }

  // / - Focus chat input (if not already in an input)
  if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
    const activeElement = document.activeElement;
    const isInInput = activeElement instanceof HTMLInputElement ||
                      activeElement instanceof HTMLTextAreaElement;

    if (!isInInput) {
      e.preventDefault();
      UI.elements.chatInput.focus();
    }
  }
}

/**
 * Initialize the application
 */
async function init(): Promise<void> {
  // Apply saved theme
  UI.applyTheme(state.settings.theme);

  // Render initial state from localStorage
  UI.renderTasks(state.tasks);
  UI.renderChatMessages(state.chatHistory);

  // Set up event listeners
  initEventListeners();

  // Initialize voice recognition
  initVoiceRecognition();

  // Initialize auth (will trigger handleAuthChange with current user or null)
  await Auth.initAuth(handleAuthChange);

  console.log('Controlled Chaos initialized');
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', init);
