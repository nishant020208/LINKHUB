import React from 'react';
import { X, RefreshCw, Pause, Play, Trash2, Sliders } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { formatTimeAgo } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface AccountDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccountDrawer: React.FC<AccountDrawerProps> = ({ isOpen, onClose }) => {
  const {
    accounts,
    triggerSync,
    isSyncing,
    disconnectAccount,
    reconnectAccount,
    wipeAccountData,
  } = useAppStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-md bg-[#0f1626] border-l border-border/70 h-full p-6 shadow-2xl flex flex-col justify-between space-y-6 overflow-y-auto">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-border/40">
            <div>
              <h3 className="font-heading font-bold text-lg text-white">Connected Accounts Health</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {accounts.length} linked logins monitored
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {accounts.map((acc) => {
              const hasError = acc.status === 'needs_reconnect' || acc.status === 'error';
              const isPaused = acc.status === 'paused';

              return (
                <div
                  key={acc.id}
                  className={`p-4 rounded-2xl border transition-all space-y-3 ${
                    hasError ? 'border-rose-500/40 bg-rose-950/20' : 'border-border/40 bg-card/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3 h-3 rounded-full ring-2 ring-background shrink-0"
                        style={{ backgroundColor: acc.color }}
                      />
                      <div>
                        <h4 className="font-heading font-semibold text-xs text-foreground">
                          {acc.label}
                        </h4>
                        <p className="text-[11px] font-mono text-muted-foreground">{acc.email}</p>
                      </div>
                    </div>

                    <span
                      className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-full font-semibold ${
                        hasError
                          ? 'bg-rose-500/20 text-rose-300'
                          : isPaused
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {acc.status}
                    </span>
                  </div>

                  {acc.error_message && (
                    <p className="text-[11px] text-rose-300 bg-rose-500/10 p-2 rounded-lg">
                      {acc.error_message}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-border/30 text-[11px] font-mono text-muted-foreground">
                    <span>Synced {formatTimeAgo(acc.last_synced_at)}</span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => triggerSync(acc.id)}
                        disabled={isSyncing}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Sync this account now"
                      >
                        <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                      </button>

                      {isPaused ? (
                        <button
                          onClick={() => reconnectAccount(acc.id)}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Resume sync"
                        >
                          <Play className="w-3 h-3" />
                        </button>
                      ) : (
                        <button
                          onClick={() => disconnectAccount(acc.id)}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Pause sync"
                        >
                          <Pause className="w-3 h-3" />
                        </button>
                      )}

                      <button
                        onClick={() => wipeAccountData(acc.id)}
                        className="p-1 rounded hover:bg-muted text-rose-400 hover:text-rose-300 cursor-pointer"
                        title="Delete items from this account"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-4 border-t border-border/40">
          <Link
            to="/integrations"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-card border border-border text-xs text-foreground font-medium flex items-center justify-center gap-2 hover:bg-muted transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Manage All 18 Adapters in Hub</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
