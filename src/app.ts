/**
 * Controlled Chaos - Main Application
 * An AI assistant for ADHD executive function
 */

import { Task, AppState } from './types.js';
import * as Storage from './storage.js';
import * as UI from './ui.js';

// Application state
let state: AppState = Storage.load();

/**
 * Save state and re-render
 */
function saveAndRender(): void {
  Storage.save(state);
  UI.renderTasks(state.tasks);
}

/**
 * Add a new task
 */
function addTask(taskData: {
  title: string;
  dueDate?: string | null;
  dueTime?: string | null;
  category?: 'school' | 'work' | 'life';
}): Task {
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
  return task;
}

/**
 * Toggle task completion
 */
function toggleTask(id: string): void {
  const task = state.tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    saveAndRender();
  }
}

/**
 * Delete a task
 */
function deleteTask(id: string): void {
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveAndRender();
}

/**
 * Toggle theme
 */
function toggleTheme(): void {
  const newTheme = state.settings.theme === 'light' ? 'dark' : 'light';
  state.settings.theme = newTheme;
  UI.applyTheme(newTheme);
  Storage.save(state);
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

  // Chat send (placeholder for Phase 2)
  UI.elements.sendBtn.addEventListener('click', () => {
    const message = UI.elements.chatInput.value.trim();
    if (message) {
      console.log('Send message:', message);
      UI.elements.chatInput.value = '';
    }
  });

  // Enter to send in chat
  UI.elements.chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      UI.elements.sendBtn.click();
    }
  });

  // What now button (placeholder for Phase 2)
  UI.elements.whatNowBtn.addEventListener('click', () => {
    console.log('What should I do now?');
  });
}

/**
 * Initialize the application
 */
function init(): void {
  // Apply saved theme
  UI.applyTheme(state.settings.theme);

  // Render initial state
  UI.renderTasks(state.tasks);
  UI.renderChatMessages(state.chatHistory);

  // Set up event listeners
  initEventListeners();

  console.log('Controlled Chaos initialized');
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', init);
