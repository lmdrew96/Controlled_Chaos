# Controlled Chaos: The Collapse
## From Feature Bloat to Focused MVP

> **Core Vision:** An AI assistant that takes on the executive function of decision-making regarding scheduling and task completion.

---

## The Brutal Cut

### ❌ What's Gone (for now)

| Feature | Size | Why It's Cut |
|---------|------|--------------|
| Mood Tracker | 95KB | Separate concern, doesn't help decide "what now?" |
| Setup Wizard | 40KB | Overkill for 2-panel app |
| Calendar Import | 45KB | Manual entry is fine for MVP |
| Google Calendar Sync | 19KB | Add later if needed |
| Course Management | 26KB | Just use task labels |
| Location Awareness | 18KB | Nice-to-have, not essential |
| 7shifts Import | 12KB | Manual entry works |
| Projects System | 10KB | Tasks are enough |
| Google Drive Sync | 33KB | localStorage for now |
| Complex UI System | 54KB | Fresh start |

**Total cut: ~350KB+ of JavaScript**

### ✅ What Stays

1. **Task List** — See what's due
2. **AI Chat** — Get decisions made for you
3. **That's literally it**

---

## The New UI

```
┌──────────────────────────────────────────────────────────────────┐
│  Controlled Chaos 🌀                               [⚙️] [?]      │
├───────────────────────────────┬──────────────────────────────────┤
│                               │                                  │
│  📋 TASKS                     │  💬 ASSISTANT                    │
│                               │                                  │
│  ┌─────────────────────────┐  │  ┌──────────────────────────┐   │
│  │ ⚠️ TODAY                │  │  │ Hi! I'm here to help you │   │
│  │                         │  │  │ figure out what to do.   │   │
│  │ □ Essay draft           │  │  │                          │   │
│  │   Due 11:59pm · School  │  │  │ You can:                 │   │
│  │                         │  │  │ • Tell me what's on your │   │
│  │ □ Call mom              │  │  │   plate                  │   │
│  │   No due date · Life    │  │  │ • Ask "what should I do  │   │
│  └─────────────────────────┘  │  │   right now?"            │   │
│                               │  │ • Brain dump your chaos  │   │
│  ┌─────────────────────────┐  │  └──────────────────────────┘   │
│  │ 📅 TOMORROW             │  │                                  │
│  │                         │  │                                  │
│  │ □ Bio exam              │  │                                  │
│  │   2:00pm · School       │  │                                  │
│  └─────────────────────────┘  │                                  │
│                               │                                  │
│  ┌─────────────────────────┐  │                                  │
│  │ 📅 THIS WEEK            │  │                                  │
│  │                         │  │                                  │
│  │ □ Spanish quiz (Thu)    │  │                                  │
│  │ □ History reading (Fri) │  │                                  │
│  └─────────────────────────┘  │                                  │
│                               │                                  │
│  ┌─────────────────────────┐  │                                  │
│  │ 📦 LATER / NO DATE      │  │                                  │
│  │                         │  │                                  │
│  │ □ Clean room            │  │                                  │
│  │ □ Return library books  │  │                                  │
│  └─────────────────────────┘  │                                  │
│                               │                                  │
│  ──────────────────────────   ├──────────────────────────────────│
│  [ + Add task... ]            │  [ What should I do now? 🎲 ]    │
│                               ├──────────────────────────────────│
│                               │  [Type or talk...]        Send   │
└───────────────────────────────┴──────────────────────────────────┘
```

---

## Data Model

### Task
```typescript
interface Task {
  id: string;
  title: string;
  dueDate: string | null;      // ISO string or null
  dueTime: string | null;      // "14:00" or null
  category: string;            // "school" | "work" | "life" | custom
  completed: boolean;
  createdAt: string;
  notes?: string;              // Optional extra context
}
```

### Chat Message
```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
```

### App State
```typescript
interface AppState {
  tasks: Task[];
  chatHistory: ChatMessage[];
  settings: {
    name?: string;             // User's name for personalization
    theme: 'light' | 'dark';
  };
}
```

**Storage:** `localStorage` only. No cloud sync for MVP.

---

## AI System Prompt

```markdown
You are the executive function assistant for someone with ADHD. Your job is to make decisions FOR them, not give them options to choose from.

## Your Personality
- Direct and decisive
- Warm but not verbose  
- You make the call — they follow
- No "you could..." or "maybe try..." — just "Do this."

## What You Know
- Their current task list (provided in context)
- Current date/time
- What they tell you about energy, mood, constraints

## How You Help

### Brain Dump Mode
User shares chaos → You organize into tasks
"I have a test Thursday, essay due Friday, work tonight 5-9, haven't started anything, also need to call my mom and my room is a mess"
→ Create prioritized task list, add to their tasks

### "What Now?" Mode  
User asks what to do → You pick ONE thing
"What should I work on?"
→ Look at their tasks, pick the most strategic one, tell them to do it

### Planning Mode
User shares constraints → You make a schedule
"I have 3 hours before work"
→ Block out those hours with specific tasks

## Rules
1. NEVER give multiple options — pick one
2. NEVER be vague — be specific ("work on essay intro" not "make progress on essay")
3. Keep responses SHORT — you're a coach, not a lecturer
4. When they complete something, celebrate briefly then move on
5. If they're overwhelmed, pick the smallest possible next step
```

---

## Core Interactions

### 1. Add Task (Manual)
- Click "+ Add task"
- Enter title
- Optional: due date, time, category
- Save → appears in list

### 2. Brain Dump
- User types/speaks stream of consciousness in chat
- AI parses into tasks
- AI responds: "Got it. Added 5 tasks. [list]. What do you want to tackle first?"
- Tasks appear in list

### 3. "What Should I Do Now?"
- User clicks the 🎲 button (or asks in chat)
- AI looks at: tasks, due dates, current time
- AI responds: "Work on your essay intro. You have 3 hours before work — that's plenty for a solid draft. Start now."

### 4. Complete Task
- Check the box
- Task moves to "completed" (hidden or shown at bottom)
- If chat is active, AI might say "Nice! One down. Next up: [task]"

### 5. Quick Context
- User: "I'm exhausted"
- AI: "Okay, skip the essay for now. Call your mom — it's low effort and you'll feel good after. 10 minutes max."

---

## Technical Stack (Fresh Start)

```
controlled-chaos-v2/
├── index.html          # Single page
├── style.css           # Minimal, clean CSS
├── app.js              # Main app logic
├── storage.js          # localStorage wrapper
├── api/
│   └── chat.js         # Vercel serverless function for Claude API
└── README.md
```

**No build step. No frameworks. Just files.**

| Tech | Why |
|------|-----|
| Vanilla JS | No complexity, instant load |
| CSS Variables | Easy theming |
| localStorage | Zero auth/sync complexity |
| Vercel Edge | Claude API proxy |
| Claude API | The brain |

---

## MVP Scope

### Phase 1: Static Foundation (2-3 hours)
- [ ] HTML structure (two-panel layout)
- [ ] CSS styling (clean, minimal, ADHD-friendly)
- [ ] Task list rendering
- [ ] Add task form
- [ ] localStorage save/load

### Phase 2: AI Integration (2-3 hours)
- [ ] Chat interface
- [ ] Vercel API route for Claude
- [ ] System prompt with task context
- [ ] "What should I do now?" button
- [ ] Brain dump → task parsing

### Phase 3: Polish (1-2 hours)
- [ ] Task completion animation
- [ ] Mobile responsive
- [ ] Dark mode toggle
- [ ] Keyboard shortcuts

**Total: ~6-8 hours for working MVP**

---

## What This Is NOT

- ❌ A calendar app
- ❌ A habit tracker  
- ❌ A mood journal
- ❌ A project management tool
- ❌ A Pomodoro timer
- ❌ A note-taking app

**It's ONE thing:** An AI that tells you what to do next.

---

## Future Maybes (Earn Their Place)

Only add if the core works AND users ask for it:

| Feature | Condition to Add |
|---------|------------------|
| Google Calendar import | "I keep forgetting to add class times" |
| Recurring tasks | "I have the same tasks every week" |
| Time estimates | "I always underestimate how long things take" |
| Categories/filters | Task list gets too long to scan |
| Cloud sync | User wants multi-device |
| Voice input | User asks for it |

Each one must prove it helps more than it complicates.

---

## The Mantra

> "What should I do right now?"
> 
> That's the only question this app answers.

---

*Built for ADHD brains, by an ADHD brain.*
