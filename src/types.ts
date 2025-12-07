/**
 * Core data types for Controlled Chaos
 */

export interface Task {
  id: string;
  title: string;
  dueDate: string | null;      // ISO date "2025-12-10"
  dueTime: string | null;      // "14:00" format
  category: 'school' | 'work' | 'life';
  completed: boolean;
  createdAt: string;           // ISO timestamp
  notes?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;           // ISO timestamp
}

export interface Settings {
  name?: string;
  theme: 'light' | 'dark';
}

export interface AppState {
  tasks: Task[];
  chatHistory: ChatMessage[];
  settings: Settings;
}

// Task groups for UI display
export interface TaskGroup {
  key: string;
  label: string;
  emoji: string;
  tasks: Task[];
}

// API response types (for Phase 2)
export interface ProposedTask {
  title: string;
  dueDate?: string | null;
  dueTime?: string | null;
  category: 'school' | 'work' | 'life';
}

export interface TaskRecommendation {
  taskId: string;
  reasoning: string;
  firstStep: string;
}

export interface ToolCall {
  name: 'propose_tasks' | 'get_recommendation';
  input: {
    tasks?: ProposedTask[];
    taskId?: string;
    reasoning?: string;
    firstStep?: string;
  };
}

export interface ChatResponse {
  message: string;
  toolCalls: ToolCall[];
}
