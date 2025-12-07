/**
 * Client-side API calls for Controlled Chaos
 */

import { Task, ChatMessage, ChatResponse, ProposedTask, TaskRecommendation } from './types.js';

/**
 * Send a chat message to the AI
 */
export async function sendChatMessage(
  messages: ChatMessage[],
  tasks: Task[]
): Promise<ChatResponse> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        tasks
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('API response error:', error);
      throw new Error(error.details || error.error || 'Request failed');
    }

    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
}

/**
 * Extract proposed tasks from tool calls
 */
export function extractProposedTasks(toolCalls: ChatResponse['toolCalls']): ProposedTask[] {
  for (const call of toolCalls) {
    if (call.name === 'propose_tasks' && call.input.tasks) {
      return call.input.tasks;
    }
  }
  return [];
}

/**
 * Extract task recommendation from tool calls
 */
export function extractRecommendation(toolCalls: ChatResponse['toolCalls']): TaskRecommendation | null {
  for (const call of toolCalls) {
    if (call.name === 'get_recommendation' && call.input.taskId) {
      return {
        taskId: call.input.taskId,
        reasoning: call.input.reasoning || '',
        firstStep: call.input.firstStep || ''
      };
    }
  }
  return null;
}
