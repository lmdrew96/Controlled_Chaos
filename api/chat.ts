/**
 * Vercel Serverless Function for Claude API
 * Endpoint: POST /api/chat
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

// Tool definitions for function calling
const TOOLS = [
  {
    name: 'propose_tasks',
    description: "Propose new tasks to add to the user's task list. Use this when the user brain dumps or mentions things they need to do. The user will review and confirm before tasks are added.",
    input_schema: {
      type: 'object',
      properties: {
        tasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'Clear, actionable task title'
              },
              dueDate: {
                type: 'string',
                description: 'ISO date string (YYYY-MM-DD) or null if no specific date'
              },
              dueTime: {
                type: 'string',
                description: 'Time in HH:MM format or null if no specific time'
              },
              category: {
                type: 'string',
                enum: ['school', 'work', 'life'],
                description: 'Task category'
              }
            },
            required: ['title', 'category']
          },
          description: 'Array of tasks to propose'
        }
      },
      required: ['tasks']
    }
  },
  {
    name: 'get_recommendation',
    description: "Analyze the user's current tasks and recommend what they should work on right now. Consider due dates, times, and any context the user has provided about their energy or constraints.",
    input_schema: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'ID of the recommended task'
        },
        reasoning: {
          type: 'string',
          description: 'Brief explanation of why this task (1-2 sentences max)'
        },
        firstStep: {
          type: 'string',
          description: 'The specific first action to take right now'
        }
      },
      required: ['taskId', 'reasoning', 'firstStep']
    }
  }
];

// Build system prompt with current date/time
function getSystemPrompt(): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  });

  return `You are the executive function assistant for someone with ADHD. Your job is to make decisions FOR them, not give them options to choose from.

## Your Personality
- Direct and decisive
- Warm but not verbose
- You make the call — they follow
- No "you could..." or "maybe try..." — just "Do this."

## Current Context
Today is ${dateStr}.
Current time is ${timeStr}.

## Your Tasks
You have access to the user's current task list (provided in each message).

## How You Help

### Brain Dump Mode
When users share chaos (multiple things on their mind), use the propose_tasks tool to organize it into actionable tasks. Be specific and break down vague items into concrete actions.

### "What Now?" Mode
When users ask what to do, use the get_recommendation tool to pick ONE task. Never give options — make the decision for them. Consider:
- What's due soonest
- What will reduce their stress most
- What matches their current energy (if they mentioned it)

### Conversation Mode
For general chat, provide brief, encouraging responses. Celebrate completions quickly then suggest the next thing.

## Rules
1. NEVER give multiple options — pick one
2. NEVER be vague — be specific ("work on essay intro for 25 minutes" not "make progress on essay")
3. Keep responses SHORT — you're a coach, not a lecturer
4. When they complete something, celebrate briefly then move on
5. If they're overwhelmed, pick the smallest possible next step
6. Always use tools when appropriate — propose_tasks for brain dumps, get_recommendation for "what now?"`;
}

// Build task context for Claude
function buildTaskContext(tasks: any[]): string {
  if (!tasks || tasks.length === 0) {
    return 'No tasks currently.';
  }

  const incomplete = tasks.filter((t: any) => !t.completed);
  if (incomplete.length === 0) {
    return `All tasks completed! (Total: ${tasks.length})`;
  }

  return incomplete.map((task: any) => {
    let str = `- [${task.id}] ${task.title}`;
    if (task.dueDate) str += ` (Due: ${task.dueDate}`;
    if (task.dueTime) str += ` at ${task.dueTime}`;
    if (task.dueDate) str += ')';
    str += ` [${task.category}]`;
    return str;
  }).join('\n');
}

// Process Claude's response
function processClaudeResponse(data: any): { message: string; toolCalls: any[] } {
  const result = {
    message: '',
    toolCalls: [] as any[]
  };

  for (const block of data.content) {
    if (block.type === 'text') {
      result.message += block.text;
    } else if (block.type === 'tool_use') {
      result.toolCalls.push({
        name: block.name,
        input: block.input
      });
    }
  }

  return result;
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  // Only allow POST
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  // Get API key from environment
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return response.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { messages, tasks } = request.body;

    if (!messages || !Array.isArray(messages)) {
      return response.status(400).json({ error: 'Messages array required' });
    }

    // Build context with current tasks
    const taskContext = buildTaskContext(tasks || []);

    // Prepare messages for Claude
    const claudeMessages = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content
    }));

    // Add task context to the latest user message
    if (claudeMessages.length > 0) {
      const lastIdx = claudeMessages.length - 1;
      if (claudeMessages[lastIdx].role === 'user') {
        claudeMessages[lastIdx].content =
          `[Current Tasks]\n${taskContext}\n\n[User Message]\n${claudeMessages[lastIdx].content}`;
      }
    }

    // Call Claude API
    const claudeResponse = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 1024,
        system: getSystemPrompt(),
        tools: TOOLS,
        messages: claudeMessages
      })
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error('Claude API error:', errorText);
      return response.status(500).json({ error: 'AI request failed' });
    }

    const data = await claudeResponse.json();
    const result = processClaudeResponse(data);

    return response.status(200).json(result);

  } catch (error) {
    console.error('Handler error:', error);
    return response.status(500).json({ error: 'Internal server error' });
  }
}
