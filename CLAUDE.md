# Claude Code Instructions for Controlled Chaos

## About This Project
Controlled Chaos is a minimalist AI assistant that takes on executive function for scheduling and task decisions. It answers ONE question: **"What should I do right now?"**

**Tech Stack:** TypeScript (no frameworks), CSS, localStorage, Vercel Edge Functions, Claude API

## Core Philosophy

**SIMPLICITY IS SACRED**

This app is intentionally minimal. Every feature cut was deliberate. Don't add complexity.

**The App Does Two Things:**
1. Shows your tasks
2. AI tells you what to do next

That's it. If a feature doesn't directly serve "what should I do now?", it doesn't belong here.

**NO BANDAID FIXES - ONLY SOLUTIONS TO THE ROOT CAUSE!**

If something's broken, fix it properly. Don't patch over symptoms.

**COMPLETE ALL ASPECTS OF EVERY PLAN!**

When given a task, execute it fully. Don't leave loose ends or partial implementations.

## 🚦 Before You Start ANY Work

1. Read these instructions fully
2. Remember: **TypeScript only, no frameworks** — keep it simple
3. Run `tsc --watch` during development
4. Test changes by opening `index.html` in a browser

## What This App IS

- ✅ An AI that picks ONE task for you
- ✅ A simple task list with due dates
- ✅ A brain dump parser (chaos → organized tasks)
- ✅ localStorage-only (no accounts, no sync)

## What This App is NOT

- ❌ A calendar app
- ❌ A habit tracker
- ❌ A mood journal
- ❌ A project management tool
- ❌ A Pomodoro timer
- ❌ A note-taking app

**Do not add features from this list.** They were intentionally cut.

## Project Structure

```
controlled-chaos/
├── src/
│   ├── app.ts              # Main app logic
│   ├── storage.ts          # localStorage wrapper
│   ├── ui.ts               # DOM manipulation
│   ├── api.ts              # Claude API calls
│   └── types.ts            # TypeScript interfaces
├── dist/                   # Compiled JS (git-ignored)
├── index.html              # Points to dist/app.js
├── style.css               # Minimal, clean CSS
├── tsconfig.json           # TypeScript config
├── api/
│   └── chat.ts             # Vercel serverless function
├── CLAUDE.md               # This file
└── README.md
```

## Build Process

```bash
tsc              # Compile once
tsc --watch      # Watch mode (use during development)
```

**No bundlers, no Vite, no Webpack.** Just the TypeScript compiler.

**tsconfig.json should be minimal:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"]
}
```

## Data Model

```typescript
// src/types.ts

export interface Task {
  id: string;
  title: string;
  dueDate: string | null;      // ISO string or null
  dueTime: string | null;      // "14:00" or null
  category: string;            // "school" | "work" | "life" | custom
  completed: boolean;
  createdAt: string;
  notes?: string;              // Optional extra context
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface AppState {
  tasks: Task[];
  chatHistory: ChatMessage[];
  settings: {
    name?: string;             // User's name for personalization
    theme: 'light' | 'dark';
  };
}
```

**Storage:** `localStorage` only. No cloud sync for MVP.

## AI Behavior

The AI is an **executive function assistant for ADHD**. Key principles:

1. **NEVER give multiple options** — pick ONE thing
2. **Be specific** — "work on essay intro" not "make progress on essay"
3. **Keep responses SHORT** — coach, not lecturer
4. **Pick the smallest step** when user is overwhelmed
5. **Celebrate briefly** then move on

### AI Modes

| Mode | Trigger | AI Response |
|------|---------|-------------|
| Brain Dump | User shares chaos | Parse into tasks, add to list |
| "What Now?" | 🎲 button or "what should I do" | Pick ONE strategic task |
| Planning | User shares time constraints | Block out specific tasks |
| Context | User shares energy/mood | Adjust recommendation |

## Core Interactions

1. **Add Task** — Click "+ Add task", enter details, save
2. **Brain Dump** — Type stream of consciousness → AI parses into tasks
3. **"What Should I Do Now?"** — Click 🎲 → AI picks ONE task
4. **Complete Task** — Check box → moves to completed
5. **Quick Context** — "I'm exhausted" → AI adjusts recommendation

## How to Communicate with Lanae ⚡

**Lead with ACTION, then explain WHY:**
✅ "Add this CSS to fix the layout"  
❌ "You might want to consider adjusting the styles"

**No Decision Paralysis:**
- Max 2-3 options with pros/cons
- **Always recommend ONE** with clear reasoning

**Keep it Simple:**
- Break big tasks into 3-5 concrete steps
- Use code examples
- Pivot quickly if something isn't working

**Never:**
- Dump 5+ options without a recommendation
- Suggest features that were intentionally cut
- Add complexity "just in case"
- Leave tasks partially completed

## Code Standards

**Rules:**
- TypeScript strict mode — no `any`
- No frameworks, no bundlers — just `tsc`
- Keep files small and readable
- CSS variables for theming
- All state in localStorage
- API key goes through Vercel Edge (never in client code)

**When making changes:**
1. Does this serve "what should I do now?"
2. Am I adding complexity?
3. Run `tsc` to check for errors
4. Test by opening index.html in browser
5. **Complete ALL aspects before moving on**

## Security

- **NEVER expose API keys in client code**
- Claude API calls go through Vercel Edge function
- No user accounts = no auth to worry about
- All data stays in localStorage

## Future Features (Earn Their Place)

Only add if MVP works AND users specifically ask:

| Feature | Add Only If... |
|---------|----------------|
| Google Calendar import | "I keep forgetting to add class times" |
| Recurring tasks | "I have the same tasks every week" |
| Time estimates | "I always underestimate how long things take" |
| Categories/filters | Task list gets too long to scan |
| Cloud sync | User wants multi-device |
| Voice input | User explicitly asks |

**Each feature must prove it helps more than it complicates.**

## The Mantra

> "What should I do right now?"
> 
> That's the only question this app answers.

---

*Built for ADHD brains, by an ADHD brain.*
