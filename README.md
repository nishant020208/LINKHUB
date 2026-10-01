# UnifyHub &middot; Unified Personal Command Center

> One calm, intelligent command station that harmonizes your college coursework, enterprise employment, side projects, and personal tasks across 18 separate accounts and services.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646cff.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-38bdf8.svg)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Edge%20Functions-3ecf8e.svg)](https://supabase.com/)

---

## Architecture Overview

UnifyHub solves context fragmentation by consolidating events, deadlines, tasks, key emails, and documents into a unified, local-first dashboard.

```
                    ┌───────────────────────────────────────────────┐
                    │                   UnifyHub                    │
                    │   React 19 + TypeScript + Zustand + Tailwind  │
                    └───────────────────────┬───────────────────────┘
                                            │
               ┌────────────────────────────┼───────────────────────────┐
               ▼                            ▼                           ▼
      ┌─────────────────┐          ┌─────────────────┐         ┌─────────────────┐
      │  Bento Command  │          │ Unified Calendar│         │ Command Palette │
      │  Center & Hero  │          │ Day/Week/Agenda │         │ (Ctrl+K / ⌘K)   │
      └─────────────────┘          └─────────────────┘         └─────────────────┘
               │                            │                           │
               └────────────────────────────┼───────────────────────────┘
                                            │
                                  ┌─────────▼─────────┐
                                  │ Smart Engine Core │
                                  │ Priority Ranking  │
                                  │ Conflict Detector │
                                  │ Free-Time Slots   │
                                  │ Deduplication     │
                                  └─────────┬─────────┘
                                            │
               ┌────────────────────────────┼───────────────────────────┐
               ▼                            ▼                           ▼
      ┌─────────────────┐          ┌─────────────────┐         ┌─────────────────┐
      │  OAuth Callback │          │  Sync Provider  │         │   AI Briefing   │
      │   Edge Runtime  │          │ Incremental RLS │         │ Google Gemini   │
      │   AES-256-GCM   │          │ Multi-Account   │         │ (Edge Function) │
      └─────────────────┘          └─────────────────┘         └─────────────────┘
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     │ 17 Uniform Provider Adapters (Read-Only)    │
                     │ Google, GitHub, Notion, Todoist, Slack,     │
                     │ Linear, Jira, Trello, Asana, ClickUp,       │
                     │ Dropbox, Box, Zoom, GitLab, Bitbucket,      │
                     │ Moodle LMS, Custom IMAP (TLS)               │
                     └─────────────────────────────────────────────┘
```

---

## Key Features

### 1. Bento Command Center
- **Right Now Strip**: Dual-pane real-time view highlighting the immediate upcoming meeting and the single most urgent deadline with active live countdown.
- **Urgency Heat Gradient**: Cards visually communicate urgency (Critical < 6h, High < 24h, Medium < 72h, Normal > 3d).
- **Customizable Layout**: Toggle visibility and re-order cards (Deadlines, Timeline, Emails, Pinned Files, and Metrics).
- **Custom Snooze Modal**: Snooze deadlines by 3h, 24h, next weekend, or custom timestamp.
- **Account Health Drawer**: Monitor sync health across accounts with 1-click pause and reconnect.

### 2. Multi-View Unified Calendar
- **Agenda View**: Chronologically organized meeting stream with direct 1-click video join links (Zoom, Google Meet, Teams).
- **Week View**: 7-day high-density schedule grid with overlapping collision markers.
- **Day View**: Vertical hourly schedule breakdown with current time line.
- **Multi-Account Conflict Detector**: Proactively scans across connected accounts (e.g. university lecture overlapping corporate sprint planning) and warns with an amber alert banner.
- **Free-Time Slot Finder**: Detects contiguous deep-work focus windows (45+ minutes) between 8 AM and 8 PM.

### 3. Global Command Palette (`Ctrl+K` / `⌘K`)
- Instant fuzzy search across items, deadlines, emails, files, workspaces, and navigation routes.
- Quick actions: "Sync all accounts", "Add new deadline", "Toggle dark/light theme", "Export all data".

### 4. Workspaces
- Isolate context between **College**, **Work**, **Personal**, or create custom workspaces (e.g. *Thesis*, *Startup*, *Athletics*).
- Filter items dynamically by workspace assignment.

### 5. Multi-Channel Notifications & Quiet Hours
- Configurable notification channels: **Email (Resend)**, **Browser Push**, **Telegram Bot**, **SMS (Twilio)**, and **WhatsApp**.
- **Timezone-aware Quiet Hours** (e.g. 22:00 to 08:00) with optional bypass for critical emergencies (deadlines due in < 2h).
- Built-in notification dispatcher and interactive testing tool.

### 6. AI Daily Briefing & Action Extraction
- Generates an executive daily briefing using **Google Gemini 2.0 Flash**.
- Automatically extracts actionable items and target dates from incoming email threads.
- Graceful offline fallback in demo mode when API keys are absent.

### 7. Privacy, Security & Audit Trail
- **Strict Read-Only Scopes**: No write permissions requested on external services.
- **Client-Side Zero Secrets**: OAuth tokens are encrypted with AES-256-GCM in Supabase Vault; browser never touches secrets.
- **Row Level Security (RLS)**: Enforced across all 10 Postgres tables.
- **Live Audit Log**: Real-time immutable record of synchronization, token rotation, AI queries, and security checks.
- **Complete Data Control**: 1-click complete data export (`.json`) and instant permanent data wipe ("Delete My Data").

---

## 17 Connected Provider Adapters

| Provider | Category | Auth Protocol | Supported Data Types |
| :--- | :--- | :--- | :--- |
| **Google** | Google | OAuth 2.0 | Gmail, Google Calendar, Tasks, Classroom, Drive |
| **GitHub** | Developer | OAuth 2.0 | Assigned PRs, Issue mentions, Review requests |
| **Notion** | Productivity | OAuth 2.0 | Database pages, Project deadlines |
| **Todoist** | Productivity | OAuth 2.0 | Tasks, Due dates, Checklists |
| **Slack** | Collaboration | OAuth 2.0 | Saved items, Reminders, Starred messages |
| **Linear** | Developer | OAuth 2.0 | Sprint cycles, Assigned issues |
| **Jira** | Enterprise | OAuth 2.0 | Backlog tickets, Sprint deliverables |
| **Trello** | Productivity | OAuth 2.0 | Kanban cards, Board checklists |
| **Asana** | Productivity | OAuth 2.0 | Assigned milestones, Portfolio tasks |
| **ClickUp** | Productivity | OAuth 2.0 | Space tasks, Sprint estimations |
| **Dropbox** | Cloud Storage | OAuth 2.0 | Pinned research papers, Shared project folders |
| **Box** | Cloud Storage | OAuth 2.0 | Institutional files, Collaborative notes |
| **Zoom** | Meetings | OAuth 2.0 | Lecture join URLs, Video conferences |
| **GitLab** | Developer | OAuth 2.0 | Merge requests, Pipeline milestones |
| **Bitbucket** | Developer | OAuth 2.0 | Pull requests, Code reviews |
| **Moodle LMS** | Academic | Web Token | Quizzes, Academic assignments, Portal announcements |
| **Custom IMAP** | Email | TLS (Port 993) | Legacy university webmail (with security banner) |

---

## Getting Started

### Demo Mode (Zero Keys Required)
The entire application runs out of the box in **Demo Mode** with rich, realistic synthetic data badged with "Demo data":

```bash
# 1. Clone the repository
git clone https://github.com/your-username/unifyhub.git
cd unifyhub

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Visit `http://localhost:5173` to explore the full dashboard, toggle themes, create tasks, inspect calendar conflicts, and customize notifications.

---

### Production Setup

When you are ready to connect live cloud services:

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Populate the required environment variables:
   - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY` (for live AI daily briefings)
   - `TOKEN_ENCRYPTION_KEY` (32-byte hex key for Edge Function AES-GCM encryption)
   - Provider OAuth Client IDs and Secrets as needed.
3. Deploy Supabase schema and Edge Functions:
   ```bash
   npx supabase db push
   npx supabase functions deploy oauth-callback
   npx supabase functions deploy sync-provider
   npx supabase functions deploy ai-briefing
   npx supabase functions deploy dispatch-notification
   ```

---

## Build Verification

Run production build and type checking:
```bash
npm run build
```
Builds cleanly with zero TypeScript errors.