import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Trash2,
  AlertTriangle,
  Eye,
  CheckCircle,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export const PrivacyPage: React.FC = () => {
  const { wipeAllData, accounts, items } = useAppStore();
  const [confirmWipeOpen, setConfirmWipeOpen] = useState(false);
  const [wipeSuccess, setWipeSuccess] = useState(false);

  const handleWipe = () => {
    wipeAllData();
    setConfirmWipeOpen(false);
    setWipeSuccess(true);
    setTimeout(() => setWipeSuccess(false), 5000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-2xl text-foreground">
              Privacy & Data Transparency
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              UnifyHub is engineered with local-first and zero-knowledge principles.
            </p>
          </div>
        </div>
      </div>

      {wipeSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>All local and cached user items have been completely wiped.</span>
        </div>
      )}

      {/* Core Privacy Guarantees */}
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
            <span>ROW LEVEL SECURITY (RLS)</span>
          </div>
          <h4 className="font-heading font-semibold text-sm text-foreground">Hardware-Bound Isolation</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Every database table enforces Postgres Row Level Security requiring auth.uid() == user_id. Cross-tenant leakage is architecturally prohibited.
          </p>
        </div>
      </div>

      {/* Itemized Provider Scopes */}
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
              <span>Google Classroom & Canvas LMS</span>
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
        </div>
      </div>

      {/* Delete My Data / Account Wipe */}
      <div className="rounded-2xl border border-rose-500/30 bg-rose-950/10 p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-heading font-bold text-lg text-rose-300 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-400" />
              Delete My Data & Full Wipe
            </h3>
            <p className="text-xs text-rose-300/80 mt-1 leading-relaxed">
              Permanently purges all synchronized items, cached files, deadlines, briefings, and connected accounts from the local environment and database.
            </p>
          </div>

          <button
            onClick={() => setConfirmWipeOpen(true)}
            className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-mono text-xs font-semibold cursor-pointer transition-colors shrink-0"
          >
            Wipe All Data
          </button>
        </div>
      </div>

      {/* Wipe Confirmation Dialog */}
      {confirmWipeOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1626] border border-rose-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
              <h4 className="font-heading font-bold text-lg text-white">Confirm Total Data Wipe</h4>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This action cannot be undone. It will remove {items.length} items across {accounts.length} connected accounts.
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
