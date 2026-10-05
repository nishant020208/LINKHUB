import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Download,
  Mail,
  ExternalLink,
  Layers,
  HardDrive,
  ListTodo,
  Github,
  Sun,
  Moon,
  ArrowLeft,
  Server,
  Database,
  UserCheck,
  FileText,
  Clock,
  Key,
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

  const [exporting, setExporting] = useState(false);

  const handleExportData = async () => {
    setExporting(true);
    try {
      if (user?.id) {
        const { supabase } = await import('@/lib/supabase');
        const { data, error } = await supabase.functions.invoke('export-user-data', {
          body: { user_id: user.id },
        });
        if (!error && data) {
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const downloadAnchor = document.createElement('a');
          downloadAnchor.setAttribute('href', url);
          downloadAnchor.setAttribute('download', `unifyhub-backup-${new Date().toISOString().split('T')[0]}.json`);
          document.body.appendChild(downloadAnchor);
          downloadAnchor.click();
          downloadAnchor.remove();
          URL.revokeObjectURL(url);
          setExporting(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Backend export fallback:', err);
    } finally {
      setExporting(false);
    }

    const exportBundle = {
      export_version: '2.0.0',
      exported_at: new Date().toISOString(),
      account_summary: {
        total_accounts: accounts.length,
        accounts: accounts.map((a) => ({
          id: a.id,
          provider: a.provider,
          email: a.email,
          label: a.label,
          status: a.status,
          storage_used_bytes: a.storage_used_bytes || 0,
          items_full_synced_count: a.items_full_synced_count || 0,
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
    downloadAnchor.setAttribute('download', `unifyhub-full-export-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary transition-colors">
      {/* Top Standalone Header */}
      <header className="w-full border-b border-border/40 backdrop-blur-xl bg-background/80 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md shadow-primary/20">
              <span className="font-heading font-black text-base tracking-tight">U</span>
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
                onClick={() => navigate('/dashboard')}
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
              {theme === 'dark' ? <Sun className="w-4 h-4 text-primary" /> : <Moon className="w-4 h-4 text-primary" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        {/* Title Banner */}
        <div className="p-8 rounded-3xl glass-panel border border-border/60 space-y-4 shadow-xl relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-status-connected/10 text-status-connected border border-status-connected/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Full-Content Deep Sync &amp; Privacy Transparency</span>
            </div>

            <div className="text-xs font-mono text-muted-foreground">
              Last Updated: <span className="text-foreground font-semibold">March 2026</span>
            </div>
          </div>

          <h1 className="font-heading font-black text-3xl sm:text-4xl text-foreground tracking-tight">
            How UnifyHub Collects, Stores, and Protects Your Full Content
          </h1>

          <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
            UnifyHub is a personal command station for students and professionals. To deliver unified full-text search, cross-platform date detection, rich in-app previews, and comment feeds, UnifyHub synchronizes <strong>full text content, email bodies, file contents (under 10MB), comments, and attachments</strong>. Every byte of stored data is encrypted at rest, strictly isolated by PostgreSQL Row-Level Security, and completely wiped the moment you disconnect an account.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-mono text-muted-foreground">
            <span>Developer &amp; Data Controller: <strong className="text-foreground">Nishant</strong></span>
            <span>&middot;</span>
            <span>Contact: <a href="mailto:nishant020208@gmail.com" className="text-primary hover:underline">nishant020208@gmail.com</a></span>
          </div>
        </div>

        {wipeSuccess && (
          <div className="p-4 rounded-2xl bg-status-connected/10 border border-status-connected/30 text-status-connected text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>All your synchronized content, comments, attachments, and storage files have been permanently wiped.</span>
          </div>
        )}

        {/* Section 1: Full Content Sync Architecture */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <Database className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-bold text-xl text-foreground">
              1. Full-Content Deep Sync Architecture
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            UnifyHub is built as a complete unified workspace, not a superficial metadata browser. When you connect an integration, UnifyHub downloads and stores:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            <div className="p-5 rounded-2xl glass-panel border border-border/60 space-y-2">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <Mail className="w-4 h-4" />
                <span>Full Email &amp; Message Bodies</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Full plain-text and sanitized HTML email bodies (Gmail, IMAP) and message threads (Slack) are stored in encrypted tables for rich in-app reading and search.
              </p>
            </div>

            <div className="p-5 rounded-2xl glass-panel border border-border/60 space-y-2">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <FileText className="w-4 h-4" />
                <span>Actual File Contents (&le; 10MB)</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Files and attachments under 10MB (Drive, Dropbox, Slack, GitHub, Jira, Asana, ClickUp) are stored in an encrypted private Storage bucket for instant inline preview.
              </p>
            </div>

            <div className="p-5 rounded-2xl glass-panel border border-border/60 space-y-2">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <Layers className="w-4 h-4" />
                <span>Descriptions &amp; Comment Streams</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Full issue descriptions, pull request file lists, Notion block markdown, and chronological comment activity feeds are synchronized and searchable from one bar.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Encryption and Access Control */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <Lock className="w-5 h-5 text-status-connected" />
            <h2 className="font-heading font-bold text-xl text-foreground">
              2. Encryption at Rest &amp; Strict Multi-Tenant Isolation
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl glass-panel border border-border/60 space-y-2">
              <h3 className="font-heading font-semibold text-sm text-foreground flex items-center gap-2">
                <Key className="w-4 h-4 text-primary" />
                <span>AES-GCM-256 Text &amp; Token Encryption</span>
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                OAuth refresh tokens, access tokens, and sensitive credential records are encrypted using AES-256-GCM prior to database insertion. Encryption keys reside in secure server-side environment variables and never touch client-side bundles or browser storage.
              </p>
            </div>

            <div className="p-5 rounded-2xl glass-panel border border-border/60 space-y-2">
              <h3 className="font-heading font-semibold text-sm text-foreground flex items-center gap-2">
                <Server className="w-4 h-4 text-status-connected" />
                <span>Row-Level Security (RLS) &amp; Storage Isolation</span>
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Every table (<code className="text-primary font-mono text-[11px]">items</code>, <code className="text-primary font-mono text-[11px]">item_contents</code>, <code className="text-primary font-mono text-[11px]">item_attachments</code>, <code className="text-primary font-mono text-[11px]">item_comments</code>) and our private Storage bucket enforce strict PostgreSQL Row-Level Security: <code className="text-primary font-mono text-[11px]">auth.uid() = user_id</code>. No user can ever access another user's files or content even if an object path or UUID is guessed.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Provider-by-Provider Deep Breakdown */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <Layers className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-bold text-xl text-foreground">
              3. Data Collected Per Connected Provider
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Google */}
            <div className="p-5 rounded-2xl glass-panel border border-border/60 space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-400" />
                <h3 className="font-heading font-semibold text-sm text-foreground">Google Workspace (Gmail, Drive, Classroom, Calendar, Tasks)</h3>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4 leading-relaxed">
                <li><strong>Gmail:</strong> Full MIME message parsing, plain text and sanitized HTML bodies, and attachment downloads (&le; 10MB) via official read-only Gmail APIs.</li>
                <li><strong>Drive:</strong> Text export for Google Docs and Sheets, direct binary downloads for files under 10MB into secure private Storage. Files over 10MB are flagged with size indicators without silent failure.</li>
                <li><strong>Classroom &amp; Tasks:</strong> Coursework descriptions, materials, submission status, and full task notes.</li>
                <li><strong>Calendar:</strong> Event start/end timestamps, descriptions, attendee counts, and conference meeting links.</li>
              </ul>
            </div>

            {/* GitHub */}
            <div className="p-5 rounded-2xl glass-panel border border-border/60 space-y-3">
              <div className="flex items-center gap-2">
                <Github className="w-4 h-4 text-primary" />
                <h3 className="font-heading font-semibold text-sm text-foreground">GitHub</h3>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4 leading-relaxed">
                <li><strong>Issues &amp; PRs:</strong> Full issue markdown bodies, pull request diffs, changed file lists, labels, and status.</li>
                <li><strong>Comments:</strong> Full chronological comment activity feeds including user logins and timestamps.</li>
                <li><strong>Attachments:</strong> Embedded image links and issue asset references.</li>
              </ul>
            </div>

            {/* Notion */}
            <div className="p-5 rounded-2xl glass-panel border border-border/60 space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-status-syncing" />
                <h3 className="font-heading font-semibold text-sm text-foreground">Notion</h3>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4 leading-relaxed">
                <li><strong>Block Content:</strong> Recursive block hierarchy traversal (headings, paragraphs, lists, code, quotes, callouts) structured into clean Markdown.</li>
                <li><strong>Embedded Media:</strong> Images and file blocks referenced inside shared pages.</li>
                <li><strong>Important Notice:</strong> Notion requires you to manually share pages or databases with the UnifyHub integration. UnifyHub only scans content explicitly shared with it.</li>
              </ul>
            </div>

            {/* Slack */}
            <div className="p-5 rounded-2xl glass-panel border border-border/60 space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-400" />
                <h3 className="font-heading font-semibold text-sm text-foreground">Slack</h3>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4 leading-relaxed">
                <li><strong>Messages:</strong> Full message text for saved items, reminders, and permitted channel/DM conversations.</li>
                <li><strong>Threads:</strong> Thread reply feeds via conversations.replies.</li>
                <li><strong>Files:</strong> Download of files and images under 10MB using your authorized user bearer token into Storage.</li>
                <li><strong>App Review Notice:</strong> Message content scopes (<code className="text-primary font-mono text-[10px]">channels:history</code>, <code className="text-primary font-mono text-[10px]">im:history</code>, <code className="text-primary font-mono text-[10px]">files:read</code>) function in developer workspaces and require standard Slack App Directory distribution review for public enterprise workspaces.</li>
              </ul>
            </div>

            {/* Project Tools: Todoist, Linear, Jira, Asana, ClickUp */}
            <div className="p-5 rounded-2xl glass-panel border border-border/60 space-y-3">
              <div className="flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-primary" />
                <h3 className="font-heading font-semibold text-sm text-foreground">Todoist, Linear, Jira, Asana &amp; ClickUp</h3>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4 leading-relaxed">
                <li><strong>Task Descriptions:</strong> Full Markdown / Atlassian Document Format descriptions.</li>
                <li><strong>Comments:</strong> Task comment discussions and activity logs.</li>
                <li><strong>Attachments:</strong> File attachments under 10MB downloaded into secure Storage for direct in-app access.</li>
              </ul>
            </div>

            {/* Cloud Storage: Dropbox */}
            <div className="p-5 rounded-2xl glass-panel border border-border/60 space-y-3">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-status-warning" />
                <h3 className="font-heading font-semibold text-sm text-foreground">Dropbox</h3>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4 leading-relaxed">
                <li><strong>File Contents:</strong> Binary downloads of documents, PDFs, images, and text files under 10MB into encrypted private Storage.</li>
                <li><strong>Text Previews:</strong> In-app text and syntax viewing for code, markdown, and plain text documents.</li>
                <li><strong>Oversized Handling:</strong> Files exceeding 10MB are indexed with exact size and provider links rather than being dropped silently.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 4: Data Retention & User Controls */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <Clock className="w-5 h-5 text-status-syncing" />
            <h2 className="font-heading font-bold text-xl text-foreground">
              4. Configurable Data Retention Policy
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Because full content synchronization involves larger storage footprints, UnifyHub provides user-configurable data retention controls directly in <Link to="/settings" className="text-primary hover:underline">Settings</Link>:
          </p>

          <div className="p-5 rounded-2xl glass-panel border border-border/60 space-y-3">
            <ul className="text-xs text-muted-foreground space-y-2 list-disc pl-4 leading-relaxed">
              <li><strong>Default Retention:</strong> By default, synchronized items are preserved to maintain your complete command center search archive.</li>
              <li><strong>Configurable Auto-Purge:</strong> Users can configure automatic deletion windows (30 days, 90 days, 180 days, or 365 days). When active, content rows and file attachments older than the selected window are automatically purged.</li>
              <li><strong>Storage Tracker:</strong> Settings displays real-time per-account and total storage usage in megabytes, with active warnings before approaching plan caps.</li>
            </ul>
          </div>
        </section>

        {/* Section 5: Complete Wipe on Disconnect */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <Trash2 className="w-5 h-5 text-status-error" />
            <h2 className="font-heading font-bold text-xl text-foreground">
              5. Guaranteed Complete Wipe on Disconnect
            </h2>
          </div>

          <div className="p-6 rounded-2xl border border-status-error/30 bg-status-error/10 space-y-3">
            <h3 className="font-heading font-bold text-base text-status-error">
              Zero Orphaned Blobs. Immediate Permanent Deletion.
            </h3>
            <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
              When you disconnect any provider account from UnifyHub, the server-side disconnect routine executes an immediate, irreversible wipe:
            </p>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4 leading-relaxed">
              <li>All database records for that account across <code className="text-foreground font-mono">items</code>, <code className="text-foreground font-mono">item_contents</code>, <code className="text-foreground font-mono">item_attachments</code>, <code className="text-foreground font-mono">item_comments</code>, and <code className="text-foreground font-mono">sync_logs</code> are deleted in a single transaction via foreign key cascade.</li>
              <li>All physical binary files stored under <code className="text-foreground font-mono">&#123;userId&#125;/&#123;accountId&#125;/</code> in the private Storage bucket are permanently deleted via storage APIs.</li>
              <li>OAuth refresh tokens and encrypted credentials are destroyed immediately.</li>
              <li>No soft-delete delay, no 30-day quarantine, and no orphaned storage objects remain.</li>
            </ul>
          </div>
        </section>

        {/* Section 6: Google API Limited Use Disclosure */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <ShieldCheck className="w-5 h-5 text-status-connected" />
            <h2 className="font-heading font-bold text-xl text-foreground">
              6. Google API Services User Data Policy Compliance
            </h2>
          </div>

          <div className="p-6 rounded-2xl glass-panel border border-border/60 space-y-3">
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              UnifyHub&apos;s use and transfer of information received from Google APIs to any other app will adhere to the{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline font-medium inline-flex items-center gap-1"
              >
                Google API Services User Data Policy
                <ExternalLink className="w-3 h-3" />
              </a>
              , including the Limited Use requirements:
            </p>
            <ul className="text-xs text-muted-foreground space-y-2 list-disc pl-4 leading-relaxed">
              <li>Google user data is used solely to provide and improve user-facing productivity features inside your personal UnifyHub interface.</li>
              <li>We never transfer or disclose Google user data to third parties, data brokers, or advertising platforms.</li>
              <li>We never use Google user data to serve advertisements, personalized promotions, or retargeting campaigns.</li>
              <li>We never use Google user data to train, fine-tune, or improve generalized machine learning or artificial intelligence models.</li>
            </ul>
          </div>
        </section>

        {/* Section 7: Export and Wipe Controls */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <UserCheck className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-bold text-xl text-foreground">
              7. User Data Tools &amp; Complete Account Deletion
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl glass-panel border border-border/60 space-y-3 flex flex-col justify-between">
              <div>
                <h3 className="font-heading font-semibold text-base text-foreground flex items-center gap-2">
                  <Download className="w-4 h-4 text-status-syncing" />
                  <span>Export Your Complete Archive</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Download a machine-readable JSON archive containing all synchronized items, metadata, workspace settings, and account details.
                </p>
              </div>

              <button
                onClick={handleExportData}
                disabled={exporting}
                className="w-fit px-4 py-2 rounded-xl bg-card border border-border/70 hover:bg-muted text-xs font-mono text-foreground flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Download className={`w-3.5 h-3.5 text-status-syncing ${exporting ? 'animate-bounce' : ''}`} />
                <span>{exporting ? 'Generating export...' : 'Download JSON Backup'}</span>
              </button>
            </div>

            <div className="p-6 rounded-2xl border border-status-error/30 bg-status-error/10 space-y-3 flex flex-col justify-between">
              <div>
                <h3 className="font-heading font-semibold text-base text-status-error flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-status-error" />
                  <span>Immediate Total Data Wipe</span>
                </h3>
                <p className="text-xs text-status-error/80 mt-1 leading-relaxed">
                  Permanently destroy all synchronized content, stored files, comments, and connected credentials from our servers and browser storage.
                </p>
              </div>

              <button
                onClick={() => setConfirmWipeOpen(true)}
                className="w-fit px-4 py-2 rounded-xl bg-status-error/20 hover:bg-status-error/30 border border-status-error/40 text-status-error font-mono text-xs font-semibold cursor-pointer transition-colors"
              >
                Wipe All Data
              </button>
            </div>
          </div>
        </section>

        {/* Section 8: Contact */}
        <section className="p-6 rounded-3xl glass-panel border border-border/60 space-y-3">
          <h2 className="font-heading font-bold text-lg text-foreground flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            <span>8. Contact Information &amp; Data Rights Requests</span>
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            If you have questions regarding this Privacy Policy or wish to exercise statutory data protection rights under GDPR, CCPA, or applicable data privacy laws, please contact the developer directly:
          </p>
          <div className="p-4 rounded-2xl bg-card/60 border border-border/40 text-xs font-mono space-y-1">
            <p><strong className="text-foreground">Developer &amp; Data Controller:</strong> Nishant</p>
            <p><strong className="text-foreground">Direct Email:</strong> <a href="mailto:nishant020208@gmail.com" className="text-primary hover:underline">nishant020208@gmail.com</a></p>
            <p><strong className="text-foreground">Application URL:</strong> <a href="https://unifyhubz.vercel.app" className="text-primary hover:underline">https://unifyhubz.vercel.app</a></p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border/40 py-8 text-center text-xs text-muted-foreground font-mono mt-12">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-status-connected" />
            <span>UnifyHub &middot; Full Content Sync &middot; AES-GCM-256 Encryption &middot; Strict RLS</span>
          </div>
          <div>&copy; {new Date().getFullYear()} UnifyHub &middot; All Rights Reserved</div>
        </div>
      </footer>

      {/* Wipe Confirmation Dialog */}
      {confirmWipeOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmWipeOpen(false);
          }}
        >
          <div className="bg-card border border-status-error/40 rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl text-foreground space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center gap-3 text-status-error">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h4 className="font-heading font-bold text-lg text-foreground">Confirm Total Data Wipe</h4>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              This will permanently delete all {items.length} synchronized items, all stored email bodies, files, comments, and {accounts.length} connected account credentials from both our database and your browser. This action cannot be reversed.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setConfirmWipeOpen(false)}
                className="px-4 py-2 rounded-xl border border-border text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleWipe}
                className="px-4 py-2 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-semibold cursor-pointer shadow-lg"
              >
                Yes, Permanently Delete All
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default PrivacyPage;
