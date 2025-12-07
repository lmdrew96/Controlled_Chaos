/**
 * DOM manipulation and rendering for Controlled Chaos
 */

import { Task, ChatMessage, TaskGroup, ProposedTask } from './types.js';

// Cached DOM elements
export const elements = {
  // Task panel
  taskGroups: document.getElementById('task-groups') as HTMLDivElement,
  addTaskToggle: document.getElementById('add-task-toggle') as HTMLButtonElement,
  addTaskForm: document.getElementById('add-task-form') as HTMLFormElement,
  taskTitle: document.getElementById('task-title') as HTMLInputElement,
  taskDate: document.getElementById('task-date') as HTMLInputElement,
  taskTime: document.getElementById('task-time') as HTMLInputElement,
  taskCategory: document.getElementById('task-category') as HTMLSelectElement,
  cancelTask: document.getElementById('cancel-task') as HTMLButtonElement,

  // Chat panel
  chatMessages: document.getElementById('chat-messages') as HTMLDivElement,
  chatInput: document.getElementById('chat-input') as HTMLTextAreaElement,
  sendBtn: document.getElementById('send-btn') as HTMLButtonElement,
  voiceBtn: document.getElementById('voice-btn') as HTMLButtonElement,
  whatNowBtn: document.getElementById('what-now-btn') as HTMLButtonElement,

  // Modal
  taskModal: document.getElementById('task-modal') as HTMLDivElement,
  proposedTasks: document.getElementById('proposed-tasks') as HTMLDivElement,
  confirmTasks: document.getElementById('confirm-tasks') as HTMLButtonElement,
  cancelModal: document.getElementById('cancel-modal') as HTMLButtonElement,

  // Header
  themeToggle: document.getElementById('theme-toggle') as HTMLButtonElement
};

/**
 * Group tasks by date: TODAY, TOMORROW, THIS WEEK, LATER
 */
export function groupTasksByDate(tasks: Task[]): TaskGroup[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const endOfWeek = new Date(today);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const groups: Record<string, TaskGroup> = {
    today: { key: 'today', label: 'TODAY', emoji: '⚠️', tasks: [] },
    tomorrow: { key: 'tomorrow', label: 'TOMORROW', emoji: '📅', tasks: [] },
    thisWeek: { key: 'thisWeek', label: 'THIS WEEK', emoji: '📅', tasks: [] },
    later: { key: 'later', label: 'LATER / NO DATE', emoji: '📦', tasks: [] }
  };

  tasks.filter(t => !t.completed).forEach(task => {
    if (!task.dueDate) {
      groups.later.tasks.push(task);
      return;
    }

    const dueDate = new Date(task.dueDate);
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

    if (dueDateOnly.getTime() === today.getTime()) {
      groups.today.tasks.push(task);
    } else if (dueDateOnly.getTime() === tomorrow.getTime()) {
      groups.tomorrow.tasks.push(task);
    } else if (dueDateOnly <= endOfWeek && dueDateOnly > tomorrow) {
      groups.thisWeek.tasks.push(task);
    } else {
      groups.later.tasks.push(task);
    }
  });

  // Sort each group by time, then by creation date
  Object.values(groups).forEach(group => {
    group.tasks.sort((a, b) => {
      if (a.dueTime && b.dueTime) return a.dueTime.localeCompare(b.dueTime);
      if (a.dueTime) return -1;
      if (b.dueTime) return 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  });

  return Object.values(groups);
}

/**
 * Format time for display (24h to 12h)
 */
function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'pm' : 'am';
  const hour12 = h % 12 || 12;
  return `${hour12}:${minutes}${ampm}`;
}

/**
 * Format date for display (weekday name)
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
}

/**
 * Check if date is today
 */
function isToday(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Render a single task item
 */
function renderTaskItem(task: Task): string {
  const timeStr = task.dueTime ? formatTime(task.dueTime) : '';
  const dateStr = task.dueDate && !isToday(task.dueDate) ? formatDate(task.dueDate) : '';

  return `
    <div class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
      <input
        type="checkbox"
        class="task-checkbox"
        ${task.completed ? 'checked' : ''}
        data-task-id="${task.id}"
      >
      <div class="task-content">
        <span class="task-title">${escapeHtml(task.title)}</span>
        <div class="task-meta">
          ${timeStr ? `<span class="task-time">${timeStr}</span>` : ''}
          ${dateStr ? `<span class="task-date">${dateStr}</span>` : ''}
          <span class="category-badge category-${task.category}">${task.category}</span>
        </div>
      </div>
      <button class="task-delete" data-task-id="${task.id}" aria-label="Delete task">
        &times;
      </button>
    </div>
  `;
}

/**
 * Render all task groups
 */
export function renderTasks(tasks: Task[]): void {
  const groups = groupTasksByDate(tasks);

  elements.taskGroups.innerHTML = groups
    .map(group => {
      // Always show LATER group, hide others if empty
      if (group.tasks.length === 0 && group.key !== 'later') return '';

      return `
        <div class="task-group" data-group="${group.key}">
          <div class="task-group-header">
            <span class="group-emoji">${group.emoji}</span>
            <span class="group-label">${group.label}</span>
            <span class="task-count">(${group.tasks.length})</span>
          </div>
          <div class="task-list">
            ${group.tasks.map(task => renderTaskItem(task)).join('')}
            ${group.tasks.length === 0 ? '<p class="empty-message">No tasks here</p>' : ''}
          </div>
        </div>
      `;
    }).join('');
}

/**
 * Render chat messages
 */
export function renderChatMessages(messages: ChatMessage[]): void {
  // Show welcome message if no history
  if (messages.length === 0) {
    elements.chatMessages.innerHTML = `
      <div class="chat-message assistant">
        <p>Hi! I'm here to help you figure out what to do.</p>
        <p>You can:</p>
        <ul>
          <li>Tell me what's on your plate</li>
          <li>Ask "what should I do right now?"</li>
          <li>Brain dump your chaos</li>
        </ul>
      </div>
    `;
    return;
  }

  elements.chatMessages.innerHTML = messages
    .map(msg => `
      <div class="chat-message ${msg.role}">
        ${msg.content}
      </div>
    `).join('');

  // Scroll to bottom
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

/**
 * Apply theme to document
 */
export function applyTheme(theme: 'light' | 'dark'): void {
  document.documentElement.setAttribute('data-theme', theme);

  // Update theme toggle button icon
  if (elements.themeToggle) {
    elements.themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
  }
}

/**
 * Show add task form
 */
export function showAddTaskForm(): void {
  elements.addTaskForm.classList.remove('hidden');
  elements.addTaskToggle.classList.add('hidden');
  elements.taskTitle.focus();
}

/**
 * Hide add task form
 */
export function hideAddTaskForm(): void {
  elements.addTaskForm.classList.add('hidden');
  elements.addTaskToggle.classList.remove('hidden');
  elements.addTaskForm.reset();
}

/**
 * Show typing indicator in chat
 */
export function showTypingIndicator(): void {
  const indicator = document.createElement('div');
  indicator.className = 'chat-message assistant typing-indicator';
  indicator.id = 'typing-indicator';
  indicator.innerHTML = '<span></span><span></span><span></span>';
  elements.chatMessages.appendChild(indicator);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

/**
 * Hide typing indicator
 */
export function hideTypingIndicator(): void {
  const indicator = document.getElementById('typing-indicator');
  if (indicator) indicator.remove();
}

/**
 * Highlight a recommended task
 */
export function highlightRecommendedTask(taskId: string): void {
  // Remove existing highlights
  document.querySelectorAll('.task-item.recommended').forEach(el => {
    el.classList.remove('recommended');
  });

  // Find and highlight the task
  const taskElement = document.querySelector(`.task-item[data-id="${taskId}"]`);
  if (taskElement) {
    taskElement.classList.add('recommended');
    taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

/**
 * Show task confirmation modal with proposed tasks
 */
export function showTaskConfirmationModal(proposedTasks: ProposedTask[]): void {
  elements.proposedTasks.innerHTML = proposedTasks.map((task, index) => `
    <div class="proposed-task-item">
      <input type="checkbox" id="proposed-${index}" data-index="${index}" checked>
      <label for="proposed-${index}">
        <strong>${escapeHtml(task.title)}</strong>
        ${task.dueDate ? `<br><small>Due: ${task.dueDate}${task.dueTime ? ' at ' + task.dueTime : ''}</small>` : ''}
        <span class="category-badge category-${task.category}">${task.category}</span>
      </label>
    </div>
  `).join('');

  elements.taskModal.classList.remove('hidden');
}

/**
 * Hide task confirmation modal
 */
export function hideTaskConfirmationModal(): void {
  elements.taskModal.classList.add('hidden');
  elements.proposedTasks.innerHTML = '';
}

/**
 * Get selected tasks from confirmation modal
 */
export function getSelectedProposedTasks(proposedTasks: ProposedTask[]): ProposedTask[] {
  const selected: ProposedTask[] = [];
  const checkboxes = elements.proposedTasks.querySelectorAll('input[type="checkbox"]');

  checkboxes.forEach((checkbox) => {
    const input = checkbox as HTMLInputElement;
    if (input.checked) {
      const index = parseInt(input.getAttribute('data-index') || '0');
      if (proposedTasks[index]) {
        selected.push(proposedTasks[index]);
      }
    }
  });

  return selected;
}

/**
 * Set voice button recording state
 */
export function setVoiceRecording(isRecording: boolean): void {
  if (isRecording) {
    elements.voiceBtn.classList.add('recording');
    elements.voiceBtn.textContent = '🔴';
  } else {
    elements.voiceBtn.classList.remove('recording');
    elements.voiceBtn.textContent = '🎤';
  }
}

/**
 * Disable/enable chat input during API calls
 */
export function setChatLoading(isLoading: boolean): void {
  elements.chatInput.disabled = isLoading;
  elements.sendBtn.disabled = isLoading;
  elements.whatNowBtn.disabled = isLoading;
}
