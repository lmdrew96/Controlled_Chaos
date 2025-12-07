/**
 * Controlled Chaos - Main Application
 * An AI assistant for ADHD executive function
 */

import { Task, AppState, ChatMessage, ProposedTask } from './types.js';
import * as Storage from './storage.js';
import * as UI from './ui.js';
import * as API from './api.js';

// Application state
let state: AppState = Storage.load();

// Pending proposed tasks from AI
let pendingProposedTasks: ProposedTask[] = [];

// Speech recognition instance (using any for browser compatibility)
let recognition: any = null;

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
      }, 500);
    } else {
      // Uncompleting - no animation needed
      task.completed = !task.completed;
      saveAndRender();
    }
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

  // Modal buttons
  UI.elements.confirmTasks.addEventListener('click', confirmProposedTasks);
  UI.elements.cancelModal.addEventListener('click', cancelProposedTasks);

  // Global keyboard shortcuts
  document.addEventListener('keydown', handleGlobalKeyboard);
}

/**
 * Handle global keyboard shortcuts
 */
function handleGlobalKeyboard(e: KeyboardEvent): void {
  // Escape - close modals and forms
  if (e.key === 'Escape') {
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
function init(): void {
  // Apply saved theme
  UI.applyTheme(state.settings.theme);

  // Render initial state
  UI.renderTasks(state.tasks);
  UI.renderChatMessages(state.chatHistory);

  // Set up event listeners
  initEventListeners();

  // Initialize voice recognition
  initVoiceRecognition();

  console.log('Controlled Chaos initialized');
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', init);
