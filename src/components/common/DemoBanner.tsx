import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronRight, Key, RefreshCw, X } from 'lucide-react';
import { env, isDemoMode } from '@/lib/env';
import { useAppStore } from '@/store/useAppStore';

export const DemoBanner: React.FC = () => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const { accounts, isSyncing, triggerSync } = useAppStore();
  const demoActive = isDemoMode();

  if (isDismissed) return null;

  return (
    <>
      <div className="bg-amber-950/40 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-200/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              DEMO MODE
            </span>
            <span className="hidden sm:inline text-amber-200/80">
              Running on synthetic fixtures. No external API keys configured yet.
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowDetails(true)}
              className="text-amber-300 hover:text-amber-100 underline underline-offset-2 flex items-center gap-0.5 cursor-pointer transition-colors"
            >
              <span>Setup Checklist</span>
              <ChevronRight className="w-3 h-3" />
            </button>

            <button
              onClick={() => triggerSync()}
              disabled={isSyncing}
              className="px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Simulate incremental sync"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline font-mono">Simulate Sync</span>
            </button>

            <button
              onClick={() => setIsDismissed(true)}
              className="text-amber-400/60 hover:text-amber-300 p-0.5 transition-colors cursor-pointer"
              aria-label="Dismiss banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Setup modal */}
      {showDetails && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1626] border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-sky-400" />
                <h3 className="font-heading font-semibold text-lg text-white">Integration Readiness</h3>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              UnifyHub is waiting for environment secrets according to the protocol in{' '}
              <code className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 font-mono text-xs">CONNECT_CHECKLIST.md</code>.
              When ready, paste credentials into <code className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 font-mono text-xs">.env.local</code> and trigger live mode.
            </p>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  Supabase Auth & Database
                </span>
                <span className="text-slate-400">{env.isConfigured.supabase ? 'Configured' : 'Mock Fallback'}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  Google Workspace OAuth
                </span>
                <span className="text-slate-400">Waiting for ENV READY</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  Microsoft 365 OAuth
                </span>
                <span className="text-slate-400">Waiting for ENV READY</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  Gemini AI Engine
                </span>
                <span className="text-slate-400">Waiting for ENV READY</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowDetails(false)}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-medium text-xs transition-colors cursor-pointer"
              >
                Close & Explore Demo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
