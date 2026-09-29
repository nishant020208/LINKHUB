# UnifyHub Master Plan & Roadmap

## Phase 1: Foundation, Design System, Layout, Demo Mode, Env Module [IN PROGRESS]
- [x] Configure `.gitignore` to prevent leaking `.env` or credentials
- [x] Write `BRAINSTORM.md` for Phase 1
- [x] Write `PLAN.md` master roadmap
- [ ] Create `.env.example` with comprehensive documentation of client and server variables
- [ ] Create `CONNECT_CHECKLIST.md` describing per-service requirements and test procedures
- [ ] Set up Vite + React + TypeScript + Tailwind CSS project configuration
- [ ] Create `src/lib/env.ts` for safe typed environment validation and `isConfigured` checks
- [ ] Define core domain TypeScript interfaces in `src/types/index.ts` (Account, Item, Workspace, Adapter)
- [ ] Implement rich mock datasets in `src/lib/demo-data.ts` (student assignments, meetings, emails, files)
- [ ] Build global application state with Zustand in `src/store/useAppStore.ts`
- [ ] Build theme tokens, typography, and glassmorphic UI base in `src/index.css`
- [ ] Build AppShell layout with top bar, workspace switcher, and demo mode indicator
- [ ] Verify build and local dev execution

## Phase 2: Database Migrations and Auth Architecture
- [ ] Brainstorm Phase 2 in `BRAINSTORM.md`
- [ ] Write Postgres SQL migrations with Row Level Security (RLS) policies for:
  - `connected_accounts`
  - `integrations`
  - `items`
  - `pinned_items`
  - `workspaces`
  - `user_settings`
  - `reminders`
  - `notification_channels`
  - `sync_logs`
  - `audit_log`
- [ ] Configure pg_cron triggers or functions for periodic syncs
- [ ] Set up Supabase client wrapper with auth state management
- [ ] Build Google sign-in UI, protected routes, and 3-step onboarding wizard
- [ ] Integrate mock auth for Demo Mode when unconfigured

## Phase 3: Adapter System, Registry, OAuth Edge Functions
- [ ] Brainstorm Phase 3 in `BRAINSTORM.md`
- [ ] Create Provider Adapter interface: `{ key, name, authType, connect, fetchItems, normalize, refreshAuth }`
- [ ] Build centralized Adapter Registry (`src/adapters/index.ts`)
- [ ] Implement Supabase Edge Functions for OAuth code exchange, refresh, and data sync:
  - `oauth-callback`
  - `oauth-refresh`
  - `sync-provider`
- [ ] Implement token encryption helper with `TOKEN_ENCRYPTION_KEY`
- [ ] Build rate limiting and exponential backoff retry helpers

## Phase 4: Dashboard UI on Demo Data
- [ ] Brainstorm Phase 4 in `BRAINSTORM.md`
- [ ] Build Hero "Right now" strip: next event, urgent deadline, countdown timer, briefing teaser
- [ ] Build Bento-grid layout:
  - Unified Deadlines Board (Overdue, Today, This Week, Later) with heat urgency colors
  - Daily Events Timeline
  - Key Emails & Action Requests list
  - Pinned Files & Quick-Access Folders
- [ ] Account color badges and filter toggles
- [ ] Snooze and Mark Done interactive controls

## Phase 5: Search, Command Palette, Unified Calendar
- [ ] Brainstorm Phase 5 in `BRAINSTORM.md`
- [ ] Implement Ctrl+K Command Palette with fuzzy search across accounts, items, actions
- [ ] Build Unified Calendar (Day, Week, and Agenda views)
- [ ] Implement global search bar with type filters and account chips
- [ ] Workspaces system (College, Work, Personal, Custom)

## Phase 6: Smart Features
- [ ] Brainstorm Phase 6 in `BRAINSTORM.md`
- [ ] Priority score ranking algorithm
- [ ] Calendar conflict detector
- [ ] Free-time slot finder across multi-account calendars
- [ ] Duplicate item deduplication and merging
- [ ] Smart reminders calculation (24h, 3h, 30m)
- [ ] Detection rules for email-to-task, bills, subscriptions, and travel

## Phase 7: AI Daily Briefing and Notifications
- [ ] Brainstorm Phase 7 in `BRAINSTORM.md`
- [ ] Supabase Edge Function with Gemini API for daily briefing generation
- [ ] Email-to-task extraction with AI date/action parsing
- [ ] Notification channels config (Email, Web Push, Telegram, SMS, WhatsApp)
- [ ] Quiet hours and per-channel preferences

## Phase 8: Integrations Hub & All Provider Adapters
- [ ] Brainstorm Phase 8 in `BRAINSTORM.md`
- [ ] Integrations management page with toggle cards, health indicators, reconnect flows
- [ ] Implement adapters:
  - Google (Gmail, Calendar, Classroom, Drive, Tasks)
  - Microsoft (Outlook, Calendar, To Do, OneDrive, Teams)
  - iCal URL importer
  - GitHub, Notion, Todoist
  - Slack, Jira, Linear, Trello, Asana, ClickUp
  - Dropbox, Box, Zoom, GitLab, Bitbucket
  - Canvas, Moodle
  - IMAP (with security warning)

## Phase 9: PWA, Polish, Privacy Page, Verification
- [ ] Brainstorm Phase 9 in `BRAINSTORM.md`
- [ ] Installable PWA manifest and offline cache handling
- [ ] Privacy page with itemized provider permissions and data boundaries
- [ ] Audit log and data wipe ("Delete my data") interface
- [ ] Accessibility audit, reduced motion checks, responsive test pass
- [ ] Final documentation and user verification guide
