# UnifyHub

A single, quiet dashboard for your calendar, deadlines, tickets, and emails across work, school, and personal accounts.

**Live Demo:** [unifyhubz.vercel.app](https://unifyhubz.vercel.app/)

---

## Why this exists

If you juggle university classes, internships or jobs, open-source projects, and personal tasks, your day probably looks like this:
- Google Calendar for work
- A second Google or Outlook account for university
- Canvas or Moodle for assignment due dates
- GitHub notifications and Jira / Linear tickets for code
- Slack and Discord for team chatter

Checking 6 different tabs throughout the day wastes focus, and things inevitably fall through the cracks (like a surprise lecture assignment conflicting with a sprint review).

UnifyHub syncs read-only feeds from those services into one local view. It flags calendar conflicts between accounts, gives you a rapid swipe triage deck for daily tasks, and keeps your schedule organized in one spot.

---

## What it does

- **Unified Agenda & Collision Detection:** Merges events from all connected accounts onto a single timeline and alerts you when events overlap across different calendars (e.g., a college lab conflicting with a work sync).
- **Free Focus Finder:** Automatically scans your day between 8:00 AM and 8:00 PM to highlight open 45+ minute blocks for deep work.
- **Triage Deck:** A quick keyboard/touch card stack to triage incoming tasks and emails—mark them done, snooze them until later, or flag them as high priority.
- **Natural Language Quick Add (`Ctrl+K` / `⌘K`):** Type things like *"Submit OS assignment Friday 5pm"* and it parses the title, date, and workspace automatically.
- **Isolated Workspaces:** Filter your entire dashboard between College, Work, and Personal so you can focus on one context at a time.
- **Offline / Zero-Config Demo Mode:** Works immediately on first clone with realistic mock data. No cloud keys, database setup, or OAuth apps required to try it out.
- **Read-Only & Local-First Mindset:** Only asks for read-only OAuth permissions. When connected to Supabase, credentials are stored in Supabase Vault (AES-256-GCM) with strict Row Level Security (RLS).

---

## Supported Integrations (Read-Only)

| Category | Providers | What gets synced |
| :--- | :--- | :--- |
| **Calendars & Email** | Google Calendar, Gmail, Custom IMAP | Events, meeting links, high-priority threads |
| **Engineering** | GitHub, GitLab, Bitbucket, Linear, Jira | PR reviews, assigned issues, sprint tickets |
| **Task Management** | Todoist, Notion, Trello, Asana, ClickUp | Due dates, task lists, project milestones |
| **Academic** | Moodle LMS | Assignment deadlines, syllabus dates |
| **Storage & Calls** | Dropbox, Box, Zoom | Pinned documents, meeting join links |

---

## Quickstart

You only need Node.js 18+ installed.

### 1. Clone & run locally (Demo Mode)

```bash
git clone https://github.com/nishant020208/LINKHUB.git
cd LINKHUB
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The app will load with demo data enabled so you can explore all views, shortcuts, and themes without setting up any credentials.

### 2. Connect Live Services (Optional)

If you want to sync real accounts via Supabase:

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Add your Supabase credentials to `.env.local`:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   GEMINI_API_KEY=your-gemini-key          # Optional: for morning briefing summary
   TOKEN_ENCRYPTION_KEY=your-32-byte-hex   # For Edge Function token storage
   ```

3. Deploy database tables and functions:
   ```bash
   npx supabase db push
   npx supabase functions deploy oauth-callback
   npx supabase functions deploy sync-provider
   ```

---

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **Styling & Motion:** Tailwind CSS v4, Framer Motion
- **State Management:** Zustand (client state) + TanStack Query (server state)
- **Natural Language Parsing:** chrono-node + date-fns
- **Backend & Auth:** Supabase (PostgreSQL, Row Level Security, Edge Functions)
- **Icons:** Lucide React

---

## Project Structure

```
src/
├── components/          # Reusable UI primitives and domain widgets
│   ├── calendar/        # Day, week, and agenda timeline components
│   ├── dashboard/       # Bento grid widgets and quick statistics
│   ├── deadlines/       # Kanban boards and countdown cards
│   ├── triage/          # Rapid task triage card deck
│   └── ui/              # Buttons, inputs, modals, ambient backdrops
├── desktop/             # Desktop command station views
├── lib/                 # Conflict detectors, filters, time formatting
├── store/               # Zustand stores (useAppStore, useAuthStore)
└── types/               # TypeScript models for accounts, tasks, events
supabase/
├── functions/           # Deno Edge Functions for OAuth and sync jobs
└── migrations/          # Postgres schema and RLS policies
```

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl+K` or `⌘K` | Open command palette / search |
| `N` | Quick-add deadline or task |
| `T` | Toggle Triage deck mode |
| `Esc` | Close any modal or active drawer |

---

## Contributing

Contributions and feedback are welcome. If you find a bug or want to add an adapter for another tool:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m "add support for Cal.com"`)
4. Push to your branch and open a Pull Request

---

## License

MIT © [Nishant](https://github.com/nishant020208)