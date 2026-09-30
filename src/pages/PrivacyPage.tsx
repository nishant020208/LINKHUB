import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  Trash2,
  AlertTriangle,
  Eye,
  CheckCircle,
  Download,
  Mail,
  ExternalLink,
  Layers,
  FileCheck2,
  Calendar,
  GraduationCap,
  HardDrive,
  ListTodo,
  Github,
  Sun,
  Moon,
  ArrowLeft,
  Server,
  Database,
  UserCheck,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useAppStore } from '@/store/useAppStore';

export const PrivacyPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { wipeAllData, accounts, items, workspaces, briefing, theme, toggleTheme } = useAppStore();
  const [confirmWipeOpen, setConfirmWipeOpen] = useState(false);
  const [wipeSuccess, setWipeSuccess] = useState(false);

  const handleWipe = async () => {
    await wipeAllData();
    setConfirmWipeOpen(false);
    setWipeSuccess(true);
    setTimeout(() => setWipeSuccess(false), 5000);
  };

  const handleExportData = () => {
    const exportBundle = {
      export_version: '1.0.0',
      exported_at: new Date().toISOString(),
      account_summary: {
        total_accounts: accounts.length,
        accounts: accounts.map((a) => ({
          id: a.id,
          provider: a.provider,
          email: a.email,
          label: a.label,
          status: a.status,
          created_at: a.created_at,
        })),
      },
      workspaces,
      briefing,
      items,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportBundle, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `unifyhub-data-export-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary transition-colors">
      {/* Top Standalone Header */}
      <header className="w-full border-b border-border/40 backdrop-blur-xl bg-background/80 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to={user ? '/' : '/login'} className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-md shadow-sky-500/20">
              <span className="font-heading font-black text-white text-base tracking-tight">U</span>
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-bold text-lg tracking-tight text-foreground group-hover:text-primary transition-colors">
                UnifyHub
              </span>
              <span className="text-[10px] font-mono text-muted-foreground -mt-1">Command Center</span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {user ? (
              <button
                onClick={() => navigate('/')}
                className="px-3 py-1.5 rounded-xl border border-border/60 bg-card/60 hover:bg-card text-xs font-mono text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Dashboard</span>
              </button>
            ) : (
              <Link
                to="/login"
                className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                Sign In
              </Link>
            )}

            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-border/50 bg-card/60 hover:bg-card text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        {/* Title Banner */}
        <div className="p-8 rounded-3xl glass-panel border border-border/60 space-y-4 shadow-xl relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Official Privacy Policy &amp; Data Transparency</span>
            </div>

            <div className="text-xs font-mono text-muted-foreground">
              Last Updated: <span className="text-foreground font-semibold">September 30, 2026</span>
            </div>
          </div>

          <h1 className="font-heading font-black text-3xl sm:text-4xl text-foreground tracking-tight">
            How UnifyHub Collects, Uses, and Protects Your Data
          </h1>

          <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
            UnifyHub is a unified personal productivity command center built for students and knowledge workers. Our architecture is <strong>read-only by default</strong>, stores <strong>metadata only</strong>, encrypts credentials at rest, and provides verifiable user-controlled data deletion.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-mono text-muted-foreground">
            <span>Developer &amp; Data Controller: <strong className="text-foreground">Nishant</strong></span>
            <span>&middot;</span>
            <span>Contact: <a href="mailto:nishant020208@gmail.com" className="text-primary hover:underline">nishant020208@gmail.com</a></span>
          </div>
        </div>

        {wipeSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>All your synchronized items and credentials have been permanently deleted.</span>
          </div>
        )}

        {/* Section 1: Exactly What Data UnifyHub Reads Per Supported Provider */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <Layers className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-bold text-xl text-foreground">
              1. What Data UnifyHub Reads (Provider-by-Provider Breakdown)
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            UnifyHub connects to external third-party services exclusively through official OAuth 2.0 or secure token APIs. Below is the precise itemization of what data is collected from each provider we support:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Google Workspace: Gmail */}
            <div className="p-5 rounded-2xl glass-panel border border-border/60 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold text-xs">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-sm text-foreground">Google Workspace: Gmail</h3>
                  <span className="text-[10px] font-mono text-primary">Scope: gmail.readonly</span>
                </div>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4 leading-relaxed">
                <li><strong className="text-foreground">What we read:</strong> Metadata only — message subject line, sender name and email address, timestamp received, a short snippet preview (first 100 characters), and a web link to open the message directly in Gmail.</li>
                <li><strong className="text-rose-400">What we NEVER read:</strong> UnifyHub <strong>never</strong> requests, inspects, processes, or stores full email message bodies, email threads, drafts, sent messages, or file attachments.</li>
              </ul>
            </div>

            {/* Google Calendar */}
            <div className="p-5 rounded-2xl glass-panel border border-border/60 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-xs">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-sm text-foreground">Google Calendar</h3>
                  <span className="text-[10px] font-mono text-primary">Scope: calendar.readonly</span>
                </div>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4 leading-relaxed">
                <li><strong className="text-foreground">What we read:</strong> Event title, scheduled start and end timestamps, recurrence rules, location string, and video conference links (such as Google Meet).</li>
                <li><strong className="text-foreground">Purpose:</strong> Display your consolidated daily timetable alongside academic and work commitments. We never create, edit, or delete calendar events.</li>
              </ul>
            </div>

            {/* Google Classroom */}
            <div className="p-5 rounded-2xl glass-panel border border-border/60 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold text-xs">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-sm text-foreground">Google Classroom</h3>
                  <span className="text-[10px] font-mono text-primary">Scope: classroom.coursework.me.readonly</span>
                </div>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4 leading-relaxed">
                <li><strong className="text-foreground">What we read:</strong> Course names, assignment titles, assignment descriptions, due dates/times, and student submission status (turned in, graded, or missing).</li>
                <li><strong className="text-foreground">Purpose:</strong> Automatically surface upcoming coursework deadlines and mark submitted tasks as complete in your agenda.</li>
              </ul>
            </div>

            {/* Google Drive */}
            <div className="p-5 rounded-2xl glass-panel border border-border/60 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center font-bold text-xs">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-sm text-foreground">Google Drive</h3>
                  <span className="text-[10px] font-mono text-primary">Scope: drive.metadata.readonly</span>
                </div>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4 leading-relaxed">
                <li><strong className="text-foreground">What we read:</strong> File metadata only — file name, file MIME type, last modified date, and web view URL for recently accessed or starred documents.</li>
                <li><strong className="text-rose-400">What we NEVER read:</strong> We <strong>never</strong> download, read, alter, or delete the contents of your Google Drive files or folders.</li>
              </ul>
            </div>

            {/* Google Tasks */}
            <div className="p-5 rounded-2xl glass-panel border border-border/60 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-xs">
                  <ListTodo className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-sm text-foreground">Google Tasks</h3>
                  <span className="text-[10px] font-mono text-primary">Scope: tasks.readonly</span>
                </div>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4 leading-relaxed">
                <li><strong className="text-foreground">What we read:</strong> Task list titles, task titles, task descriptions/notes, and due dates.</li>
                <li><strong className="text-foreground">Purpose:</strong> Aggregate your Google tasks into your unified daily todo view.</li>
              </ul>
            </div>

            {/* Microsoft 365 */}
            <div className="p-5 rounded-2xl glass-panel border border-border/60 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-600/10 text-blue-400 border border-blue-600/20 flex items-center justify-center font-bold text-xs">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-sm text-foreground">Microsoft 365 (Outlook &amp; To Do)</h3>
                  <span className="text-[10px] font-mono text-primary">Scopes: Mail.Read, Calendars.Read, Tasks.Read</span>
                </div>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4 leading-relaxed">
                <li><strong className="text-foreground">What we read:</strong> Outlook message subjects and senders (no email bodies), calendar event start/end times, and To Do task titles and due dates.</li>
              </ul>
            </div>

            {/* GitHub */}
            <div className="p-5 rounded-2xl glass-panel border border-border/60 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs">
                  <Github className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-sm text-foreground">GitHub</h3>
                  <span className="text-[10px] font-mono text-primary">Scopes: read:user, repo:status, notifications</span>
                </div>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4 leading-relaxed">
                <li><strong className="text-foreground">What we read:</strong> Pull requests assigned to you, code review requests, repository issues assigned to your handle, and notifications.</li>
              </ul>
            </div>

            {/* Notion, Todoist, Slack, iCal */}
            <div className="p-5 rounded-2xl glass-panel border border-border/60 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center font-bold text-xs">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-sm text-foreground">Notion, Todoist, Slack, &amp; iCal</h3>
                  <span className="text-[10px] font-mono text-primary">Read-only metadata &amp; webcal</span>
                </div>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4 leading-relaxed">
                <li><strong className="text-foreground">Notion:</strong> Database item titles and deadline properties explicitly shared with UnifyHub.</li>
                <li><strong className="text-foreground">Todoist:</strong> Task titles, priority flags, and due dates.</li>
                <li><strong className="text-foreground">Slack:</strong> Direct mentions and saved-for-later messages only.</li>
                <li><strong className="text-foreground">iCal:</strong> Timetable lecture start and end times from subscribed university calendar feeds.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 2: Strict Read-Only Policy */}
        <section className="p-6 rounded-3xl glass-panel border border-emerald-500/30 bg-emerald-950/10 space-y-3">
          <div className="flex items-center gap-2.5 text-emerald-400">
            <Lock className="w-5 h-5" />
            <h2 className="font-heading font-bold text-lg text-emerald-300">
              2. Strict Read-Only Policy — Zero Actions on Your Behalf
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-emerald-200/90 leading-relaxed">
            All OAuth permission scopes requested by UnifyHub are <strong>strictly read-only</strong>. By architectural design, our backend does not have write, edit, delete, or send permissions for any connected service:
          </p>
          <ul className="text-xs text-emerald-200/80 space-y-1 list-disc pl-5 leading-relaxed font-mono">
            <li>UnifyHub NEVER sends emails on your behalf.</li>
            <li>UnifyHub NEVER creates, edits, or deletes calendar events.</li>
            <li>UnifyHub NEVER alters, downloads, or deletes Google Drive or OneDrive documents.</li>
            <li>UnifyHub NEVER submits coursework or alters grades in Google Classroom.</li>
            <li>UnifyHub NEVER posts messages, issues, or pull request comments on your behalf.</li>
          </ul>
        </section>

        {/* Section 3: Google API Services User Data Policy Compliance */}
        <section className="p-6 rounded-3xl glass-panel border border-border/60 space-y-4">
          <div className="flex items-center gap-2.5">
            <FileCheck2 className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-bold text-lg text-foreground">
              3. Google API Services User Data Policy &amp; Limited Use Disclosure
            </h2>
          </div>

          <div className="p-4 rounded-2xl bg-card/60 border border-border/40 space-y-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            <p className="text-foreground font-semibold">
              UnifyHub&apos;s use and transfer of information received from Google APIs to any other app will adhere to the{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline hover:text-primary/80 inline-flex items-center gap-1"
              >
                <span>Google API Services User Data Policy</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              , including the Limited Use requirements.
            </p>

            <ul className="space-y-2 list-disc pl-5 pt-1 text-xs">
              <li>
                <strong className="text-foreground">No Advertising:</strong> Google user data is NEVER used for serving advertisements, target marketing, retargeting, or data broker sales.
              </li>
              <li>
                <strong className="text-foreground">No AI Model Training:</strong> Google user data is <strong>never used to train, retrain, fine-tune, or improve artificial intelligence or generalized machine learning models</strong>.
              </li>
              <li>
                <strong className="text-foreground">No Human Access:</strong> No human reads your personal emails, calendar events, or documents, unless you explicitly grant written authorization for technical support debugging, or as required by law.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 4: Data Storage, Isolation & Encryption */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <Database className="w-5 h-5 text-indigo-400" />
            <h2 className="font-heading font-bold text-xl text-foreground">
              4. How Your Data is Stored &amp; Encrypted
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl glass-panel border border-border/60 space-y-2">
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-mono font-semibold">
                <Eye className="w-4 h-4" />
                <span>ROW LEVEL SECURITY (RLS)</span>
              </div>
              <h3 className="font-heading font-semibold text-sm text-foreground">Strict Tenant Isolation</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                All application records are stored in a dedicated Supabase PostgreSQL database protected by Row Level Security. Every database query enforces <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-[11px]">auth.uid() = user_id</code>. It is architecturally impossible for one user to see or query another user&apos;s synchronized items.
              </p>
            </div>

            <div className="p-5 rounded-2xl glass-panel border border-border/60 space-y-2">
              <div className="flex items-center gap-2 text-sky-400 text-xs font-mono font-semibold">
                <Lock className="w-4 h-4" />
                <span>ENCRYPTION AT REST</span>
              </div>
              <h3 className="font-heading font-semibold text-sm text-foreground">AES-256-GCM Token Encryption</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                OAuth refresh tokens are encrypted using AES-256-GCM before being stored in the database. The client browser only ever receives ephemeral session identifiers and never has direct access to third-party refresh secrets.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5: How Data is Used & No Data Sale */}
        <section className="p-6 rounded-3xl glass-panel border border-border/60 space-y-3">
          <div className="flex items-center gap-2.5">
            <UserCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="font-heading font-bold text-lg text-foreground">
              5. How Your Data is Used — Zero Third-Party Sharing
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Your data is used solely to render your own consolidated command center (such as calculating upcoming deadlines, formatting your daily agenda, and alerting you to urgent assigned tasks).
          </p>
          <div className="p-4 rounded-2xl bg-card/60 border border-border/40 text-xs text-foreground space-y-2 font-medium">
            <p>&bull; We do NOT sell, rent, monetize, or trade your data to any third party under any circumstances.</p>
            <p>&bull; We do NOT share your data with advertisers or data brokers.</p>
            <p>&bull; We do NOT track your browsing activity across other websites.</p>
          </div>
        </section>

        {/* Section 6: Data Retention & Instant Account Disconnect Purge */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <Trash2 className="w-5 h-5 text-rose-400" />
            <h2 className="font-heading font-bold text-xl text-foreground">
              6. Data Retention &amp; Automatic Disconnect Purge
            </h2>
          </div>

          <div className="p-6 rounded-3xl glass-panel border border-border/60 space-y-4 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            <p>
              Synchronized items are retained in your account only for as long as the provider remains actively connected:
            </p>
            <ul className="space-y-2 list-disc pl-5">
              <li>
                <strong className="text-foreground">Instant Disconnect Deletion:</strong> Clicking the <strong className="text-rose-400">Disconnect</strong> button for any account on the Integrations page immediately and permanently deletes its encrypted credentials from the database. A database cascading delete instantly removes all synchronized email headers, calendar events, tasks, and coursework associated with that account.
              </li>
              <li>
                <strong className="text-foreground">Total Data Wipe:</strong> You can purge all data across all providers at any time using the &quot;Wipe All Data&quot; option in the Danger Zone below.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 7: How to Revoke Access */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <ExternalLink className="w-5 h-5 text-sky-400" />
            <h2 className="font-heading font-bold text-xl text-foreground">
              7. How to Revoke Access at Any Time
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            You maintain 100% control over your permissions. You can revoke UnifyHub&apos;s access either within our application or directly inside your provider&apos;s account settings:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <a
              href="https://myaccount.google.com/connections"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 rounded-2xl glass-panel border border-border/60 hover:border-primary/50 text-xs space-y-1 transition-all group cursor-pointer"
            >
              <div className="font-semibold text-foreground flex items-center justify-between">
                <span>Google Permissions</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-muted-foreground text-[11px]">Revoke UnifyHub under Google Third-party apps &amp; services.</p>
            </a>

            <a
              href="https://account.live.com/consent/Manage"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 rounded-2xl glass-panel border border-border/60 hover:border-primary/50 text-xs space-y-1 transition-all group cursor-pointer"
            >
              <div className="font-semibold text-foreground flex items-center justify-between">
                <span>Microsoft Permissions</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-muted-foreground text-[11px]">Manage and revoke Microsoft 365 app consents.</p>
            </a>

            <a
              href="https://github.com/settings/applications"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 rounded-2xl glass-panel border border-border/60 hover:border-primary/50 text-xs space-y-1 transition-all group cursor-pointer"
            >
              <div className="font-semibold text-foreground flex items-center justify-between">
                <span>GitHub Permissions</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-muted-foreground text-[11px]">Revoke Authorized OAuth Apps in GitHub Settings.</p>
            </a>
          </div>
        </section>

        {/* Section 8: User Data Controls & Danger Zone */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="font-heading font-bold text-xl text-foreground">
              8. User Data Tools &amp; Complete Purge
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl glass-panel border border-border/60 space-y-3 flex flex-col justify-between">
              <div>
                <h3 className="font-heading font-semibold text-base text-foreground flex items-center gap-2">
                  <Download className="w-4 h-4 text-sky-400" />
                  <span>Export Your Data</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Download a complete, machine-readable JSON archive of all your stored items, workspace settings, and integration summaries.
                </p>
              </div>

              <button
                onClick={handleExportData}
                className="w-fit px-4 py-2 rounded-xl bg-card border border-border/70 hover:bg-muted text-xs font-mono text-foreground flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span>Download JSON Backup</span>
              </button>
            </div>

            <div className="p-6 rounded-2xl border border-rose-500/30 bg-rose-950/10 space-y-3 flex flex-col justify-between">
              <div>
                <h3 className="font-heading font-semibold text-base text-rose-300 flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>Total Data Wipe</span>
                </h3>
                <p className="text-xs text-rose-300/80 mt-1 leading-relaxed">
                  Permanently delete all synchronized items, briefings, and linked accounts from both our database and your local browser session.
                </p>
              </div>

              <button
                onClick={() => setConfirmWipeOpen(true)}
                className="w-fit px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-mono text-xs font-semibold cursor-pointer transition-colors"
              >
                Wipe All Data
              </button>
            </div>
          </div>
        </section>

        {/* Section 9: Real Contact Method */}
        <section className="p-6 rounded-3xl glass-panel border border-border/60 space-y-3">
          <h2 className="font-heading font-bold text-lg text-foreground flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            <span>9. Contact Information &amp; Data Rights Inquiries</span>
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            If you have questions regarding this Privacy Policy, wish to report an issue, or want to exercise your data protection rights under GDPR, CCPA, or other applicable laws, please contact the developer directly:
          </p>
          <div className="p-4 rounded-2xl bg-card/60 border border-border/40 text-xs font-mono space-y-1">
            <p><strong className="text-foreground">Developer:</strong> Nishant</p>
            <p><strong className="text-foreground">Direct Email:</strong> <a href="mailto:nishant020208@gmail.com" className="text-primary hover:underline">nishant020208@gmail.com</a></p>
            <p><strong className="text-foreground">Application URL:</strong> <a href="https://unifyhubz.vercel.app" className="text-primary hover:underline">https://unifyhubz.vercel.app</a></p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border/40 py-8 text-center text-xs text-muted-foreground font-mono mt-12">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>UnifyHub &middot; Read-Only Architecture &middot; AES-256 Encryption &middot; Strict RLS</span>
          </div>
          <div>&copy; {new Date().getFullYear()} UnifyHub &middot; All Rights Reserved</div>
        </div>
      </footer>

      {/* Wipe Confirmation Dialog */}
      {confirmWipeOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-status-error/40 rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl text-foreground space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h4 className="font-heading font-bold text-lg text-white">Confirm Total Data Wipe</h4>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              This will permanently delete all {items.length} synchronized items, {accounts.length} connected account credentials, and stored briefings from both our database and your browser. This action cannot be reversed.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                onClick={() => setConfirmWipeOpen(false)}
                className="px-4 py-2 rounded-xl border border-border text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleWipe}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer shadow-lg"
              >
                Yes, Permanently Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrivacyPage;
