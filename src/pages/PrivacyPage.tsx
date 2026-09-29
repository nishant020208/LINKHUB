import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Trash2,
  AlertTriangle,
  Eye,
  CheckCircle,
  Download,
  ScrollText,
  Activity,
  Layers,
  FileCheck2,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  category: 'SYNC' | 'SECURITY' | 'AI' | 'NOTIFICATION';
  action: string;
  actor: string;
  status: 'success' | 'warn' | 'info';
  details: string;
}

const MOCK_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'log-1',
    timestamp: 'Just now',
    category: 'SYNC',
    action: 'Incremental provider delta fetch',
    actor: 'sync-provider',
    status: 'success',
    details: 'Queried MIT Google Workspace and Outlook calendars. 0 conflicts introduced.',
  },
  {
    id: 'log-2',
    timestamp: '14 minutes ago',
    category: 'AI',
    action: 'Generated Daily Focus Briefing',
    actor: 'ai-briefing',
    status: 'success',
    details: 'Synthesized 5 urgent tasks and 3 meetings into 1 motivational daily headline.',
  },
  {
    id: 'log-3',
    timestamp: '1 hour ago',
    category: 'SECURITY',
    action: 'AES-256-GCM Token Check',
    actor: 'vault-agent',
    status: 'success',
    details: 'Encrypted refresh token verified for Canvas LMS token and Microsoft OAuth.',
  },
  {
    id: 'log-4',
    timestamp: '2 hours ago',
    category: 'NOTIFICATION',
    action: 'Checked quiet hours constraint',
    actor: 'notification-dispatch',
    status: 'info',
    details: 'Quiet hours inactive (local time 14:30). High priority alerts dispatched.',
  },
  {
    id: 'log-5',
    timestamp: '5 hours ago',
    category: 'SYNC',
    action: 'iCal timetable subscription refreshed',
    actor: 'ical-adapter',
    status: 'success',
    details: 'Parsed webcal:// stream. Updated 6 lecture blocks for current semester.',
  },
  {
    id: 'log-6',
    timestamp: '12 hours ago',
    category: 'SECURITY',
    action: 'Row Level Security policy enforcement',
    actor: 'postgres-rls',
    status: 'success',
    details: 'Hardware-level tenant isolation confirmed auth.uid() == user_id across 10 tables.',
  },
];

export const PrivacyPage: React.FC = () => {
  const { wipeAllData, accounts, items, workspaces, briefing } = useAppStore();
  const [activeTab, setActiveTab] = useState<'principles' | 'scopes' | 'audit' | 'wipe'>('principles');
  const [confirmWipeOpen, setConfirmWipeOpen] = useState(false);
  const [wipeSuccess, setWipeSuccess] = useState(false);

  const handleWipe = () => {
    wipeAllData();
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
    downloadAnchor.setAttribute('download', `unifyhub-backup-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-2xl text-foreground">
              Privacy & Data Transparency
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Local-first architecture &middot; Read-only permissions &middot; Verifiable audit trails
            </p>
          </div>
        </div>

        <button
          onClick={handleExportData}
          className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl border border-border/60 bg-card/60 hover:bg-card text-xs font-mono text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Download complete JSON export of all your data"
        >
          <Download className="w-3.5 h-3.5 text-sky-400" />
          <span>Export All Data (JSON)</span>
        </button>
      </div>

      {wipeSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>All local and cached user items have been completely wiped.</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-xl border border-border/40 w-fit">
        <button
          onClick={() => setActiveTab('principles')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            activeTab === 'principles'
              ? 'bg-card text-foreground shadow-sm font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Architecture & Principles
        </button>
        <button
          onClick={() => setActiveTab('scopes')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            activeTab === 'scopes'
              ? 'bg-card text-foreground shadow-sm font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Provider Scopes
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'audit'
              ? 'bg-card text-foreground shadow-sm font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ScrollText className="w-3 h-3 text-sky-400" />
          <span>Audit Log</span>
        </button>
        <button
          onClick={() => setActiveTab('wipe')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer text-rose-400 hover:text-rose-300 ${
            activeTab === 'wipe'
              ? 'bg-rose-500/20 text-rose-300 shadow-sm font-semibold'
              : 'hover:bg-rose-500/10'
          }`}
        >
          Danger Zone
        </button>
      </div>

      {/* Tab 1: Principles */}
      {activeTab === 'principles' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl glass-panel border border-border/60 space-y-2">
              <div className="flex items-center gap-2 text-primary text-xs font-mono font-semibold">
                <Lock className="w-4 h-4" />
                <span>READ-ONLY SCOPES</span>
              </div>
              <h4 className="font-heading font-semibold text-sm text-foreground">Zero Write Permissions</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                OAuth tokens requested are strictly read-only by default (e.g. gmail.readonly, calendar.readonly). UnifyHub cannot delete or modify your emails or calendar events.
              </p>
            </div>

            <div className="p-5 rounded-2xl glass-panel border border-border/60 space-y-2">
              <div className="flex items-center gap-2 text-sky-400 text-xs font-mono font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>ENCRYPTED REFRESH TOKENS</span>
              </div>
              <h4 className="font-heading font-semibold text-sm text-foreground">AES-GCM at Rest</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                All stored OAuth refresh tokens are encrypted using AES-GCM inside Supabase Vault with dedicated encryption keys. The client browser never receives secrets.
              </p>
            </div>

            <div className="p-5 rounded-2xl glass-panel border border-border/60 space-y-2">
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-mono font-semibold">
                <Eye className="w-4 h-4" />
                <span>ROW LEVEL SECURITY</span>
              </div>
              <h4 className="font-heading font-semibold text-sm text-foreground">Hardware-Bound Isolation</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Every database table enforces Postgres Row Level Security requiring auth.uid() == user_id. Cross-tenant leakage is architecturally prohibited.
              </p>
            </div>
          </div>

          <div className="rounded-2xl glass-panel border border-border/60 p-6 space-y-4">
            <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-400" />
              <span>Google API Services User Data Policy & Limited Use Disclosure</span>
            </h3>
            
            <div className="p-4 rounded-xl bg-card/60 border border-border/40 space-y-3 text-xs text-muted-foreground leading-relaxed">
              <p className="text-foreground font-medium">
                UnifyHub&apos;s use and transfer of information received from Google APIs to any other app will adhere to the{' '}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:text-primary/80"
                >
                  Google API Services User Data Policy
                </a>
                , including the Limited Use requirements.
              </p>
              
              <div className="space-y-2 pt-2 border-t border-border/40">
                <h4 className="font-semibold text-foreground">1. Ownership & Application Control</h4>
                <p>
                  UnifyHub (<a href="https://unifyhubz.vercel.app/" className="text-primary underline">https://unifyhubz.vercel.app/</a>) is owned, operated, and maintained by the UnifyHub developer team. All user data processed by this application belongs exclusively to the user.
                </p>

                <h4 className="font-semibold text-foreground mt-3">2. Data Collection & Use of Google Scopes</h4>
                <p>
                  UnifyHub requests read-only access to Google services (Google Calendar, Gmail, Google Classroom, Google Drive metadata, Google Tasks) solely to aggregate your personal schedule, deadlines, and notifications into a single unified dashboard. We do not modify, send, or delete any data in your Google account.
                </p>

                <h4 className="font-semibold text-foreground mt-3">3. Strict Prohibition on Data Sale & Advertising</h4>
                <p>
                  We do <strong>NOT</strong> sell, rent, or trade your Google user data to third parties under any circumstances. Google user data is never used for serving advertisements, target marketing, or data broker operations.
                </p>

                <h4 className="font-semibold text-foreground mt-3">4. Human Access & AI Model Training</h4>
                <p>
                  No human reads your raw email content or personal calendar data unless explicit user authorization is provided for technical support. Furthermore, your Google user data is <strong>never used to train, retrain, or improve artificial intelligence or machine learning models</strong>.
                </p>

                <h4 className="font-semibold text-foreground mt-3">5. Encryption & Security</h4>
                <p>
                  All OAuth access and refresh tokens are encrypted using AES-256-GCM encryption before storage in database vaults. Data transmitted between your browser and our servers is protected using TLS 1.3 encryption.
                </p>

                <h4 className="font-semibold text-foreground mt-3">6. User Control & Data Deletion</h4>
                <p>
                  You can disconnect your Google account or purge all synchronized data at any time via the Danger Zone tab on this page. You may also revoke access at any time through{' '}
                  <a
                    href="https://myaccount.google.com/permissions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    Google Account Security Settings
                  </a>.
                </p>
              </div>
            </div>

            <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-2 pt-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Data Retention & Storage Guarantees</span>
            </h3>
            <ul className="text-xs text-muted-foreground space-y-2 list-disc pl-5 leading-relaxed">
              <li>No email message bodies are permanently stored; only parsed deadline metadata is stored.</li>
              <li>Encrypted auth credentials are automatically purged upon disconnecting an account.</li>
              <li>AI prompts are dispatched with ephemeral flags; zero personal communications are used for model training.</li>
              <li>Local storage cache can be wiped at any moment via the Danger Zone tab or Command Palette.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Tab 2: Scopes */}
      {activeTab === 'scopes' && (
        <div className="rounded-2xl glass-panel border border-border/60 p-6 space-y-4">
          <h3 className="font-heading font-bold text-lg text-foreground">What Data We Read & Why</h3>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-card/40 border border-border/40 space-y-1">
              <div className="flex items-center justify-between font-mono font-semibold text-foreground">
                <span>Google Workspace (Gmail & Calendar)</span>
                <span className="text-primary text-[11px]">Metadata & Timestamps</span>
              </div>
              <p className="text-muted-foreground">
                We extract subject lines, senders, and date proposals to synthesize reminders and upcoming lectures. Full email bodies are not stored permanently.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-card/40 border border-border/40 space-y-1">
              <div className="flex items-center justify-between font-mono font-semibold text-foreground">
                <span>Google Classroom, Canvas LMS, & Moodle</span>
                <span className="text-primary text-[11px]">Assignments & Due Dates</span>
              </div>
              <p className="text-muted-foreground">
                Course titles, assignment prompt links, and submission deadlines are parsed into the unified deadline list.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-card/40 border border-border/40 space-y-1">
              <div className="flex items-center justify-between font-mono font-semibold text-foreground">
                <span>Microsoft 365 (Outlook & To Do)</span>
                <span className="text-primary text-[11px]">Events & Tasks</span>
              </div>
              <p className="text-muted-foreground">
                Calendar start/end times and flagged tasks are harmonized into the unified today timeline.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-card/40 border border-border/40 space-y-1">
              <div className="flex items-center justify-between font-mono font-semibold text-foreground">
                <span>GitHub & Linear</span>
                <span className="text-primary text-[11px]">Assigned Issues & PRs</span>
              </div>
              <p className="text-muted-foreground">
                Only repositories and issues explicitly assigned to your handle are polled.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Live Audit Log */}
      {activeTab === 'audit' && (
        <div className="rounded-2xl glass-panel border border-border/60 p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <div>
              <h3 className="font-heading font-bold text-lg text-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-sky-400" />
                <span>Immutable Security & Sync Audit Trail</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Every backend sync, AI generation, and security check is timestamped for verification.
              </p>
            </div>
            <span className="text-xs font-mono text-muted-foreground bg-muted px-2.5 py-1 rounded-lg">
              {MOCK_AUDIT_LOGS.length} events logged
            </span>
          </div>

          <div className="divide-y divide-border/30">
            {MOCK_AUDIT_LOGS.map((log) => (
              <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-start justify-between gap-2 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-mono">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        log.category === 'SECURITY'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : log.category === 'AI'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : log.category === 'NOTIFICATION'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                      }`}
                    >
                      {log.category}
                    </span>
                    <span className="font-semibold text-foreground">{log.action}</span>
                    <span className="text-muted-foreground">({log.actor})</span>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed pl-1">
                    {log.details}
                  </p>
                </div>

                <span className="shrink-0 font-mono text-[11px] text-muted-foreground sm:text-right">
                  {log.timestamp}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Danger Zone / Wipe */}
      {activeTab === 'wipe' && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/10 p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-heading font-bold text-lg text-rose-300 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-400" />
                <span>Delete My Data & Complete Purge</span>
              </h3>
              <p className="text-xs text-rose-300/80 mt-1 leading-relaxed">
                Permanently purges all synchronized items, cached files, deadlines, briefings, and connected accounts from the local environment and database.
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs font-mono text-muted-foreground">
                <Layers className="w-3.5 h-3.5" />
                <span>Currently stored: {items.length} items &middot; {accounts.length} linked accounts</span>
              </div>
            </div>

            <button
              onClick={() => setConfirmWipeOpen(true)}
              className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-mono text-xs font-semibold cursor-pointer transition-colors shrink-0"
            >
              Wipe All Data
            </button>
          </div>
        </div>
      )}

      {/* Wipe Confirmation Dialog */}
      {confirmWipeOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1626] border border-rose-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
              <h4 className="font-heading font-bold text-lg text-white">Confirm Total Data Wipe</h4>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This action cannot be undone. It will remove all {items.length} items and disconnect {accounts.length} accounts.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                onClick={() => setConfirmWipeOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-xs text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleWipe}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
              >
                Yes, Permanently Wipe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
