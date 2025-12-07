/**
 * localStorage wrapper for Controlled Chaos
 */

import { AppState } from './types.js';

const STORAGE_KEY = 'controlled-chaos-state';

const DEFAULT_STATE: AppState = {
  tasks: [],
  chatHistory: [],
  settings: {
    theme: 'light'
  }
};

/**
 * Load state from localStorage
 */
export function load(): AppState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULT_STATE };

    const parsed = JSON.parse(stored);

    // Merge with defaults to handle missing keys after updates
    return {
      tasks: parsed.tasks || [],
      chatHistory: parsed.chatHistory || [],
      settings: { ...DEFAULT_STATE.settings, ...parsed.settings }
    };
  } catch (error) {
    console.error('Failed to load state:', error);
    return { ...DEFAULT_STATE };
  }
}

/**
 * Save state to localStorage
 */
export function save(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save state:', error);
  }
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Clear all stored data (for debugging/reset)
 */
export function clear(): void {
  localStorage.removeItem(STORAGE_KEY);
}
