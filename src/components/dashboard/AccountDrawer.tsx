import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, RefreshCw, Pause, Play, Trash2, Sliders } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useSyncData } from '@/hooks/useSyncData';
import { formatTimeAgo } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface AccountDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccountDrawer: React.FC<AccountDrawerProps> = ({ isOpen, onClose }) => {
  const {
    accounts,
    isSyncing,
    disconnectAccount,
    reconnectAccount,
    wipeAccountData,
  } = useAppStore();
  const { triggerSync } = useSyncData();

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex justify-end"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-drawer-title"
    >
      <div className="w-full max-w-md bg-card border-l border-border/70 h-full p-4 sm:p-6 shadow-2xl flex flex-col justify-between space-y-6 overflow-y-auto">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-border/40">
            <div>
              <h3 id="account-drawer-title" className="font-display font-bold text-lg text-foreground">
                Connected Accounts Health
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {accounts.length} linked logins monitored
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
              aria-label="Close accounts health drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {accounts.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground bg-muted/20 rounded-2xl border border-border/40">
                No accounts connected yet. Add an account from the Integrations page.
              </div>
            ) : (
              accounts.map((acc) => {
                const hasError = acc.status === 'needs_reconnect' || acc.status === 'error';
                const isPaused = acc.status === 'paused';

                return (
                  <div
                    key={acc.id}
                    className={`p-4 rounded-2xl border transition-all space-y-3 ${
                      hasError ? 'border-status-error/40 bg-status-error/10' : 'border-border/40 bg-card/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-3 h-3 rounded-full ring-2 ring-background shrink-0"
                          style={{ backgroundColor: acc.color }}
                        />
                        <div>
                          <h4 className="font-display font-semibold text-xs text-foreground">
                            {acc.label}
                          </h4>
                          <p className="text-[11px] font-mono text-muted-foreground">{acc.email}</p>
                        </div>
                      </div>

                      <span
                        className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-full font-semibold ${
                          hasError
                            ? 'bg-status-error/20 text-status-error'
                            : isPaused
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-status-connected/20 text-status-connected'
                        }`}
                      >
                        {acc.status}
                      </span>
                    </div>

                    {acc.error_message && (
                      <p className="text-[11px] text-status-error bg-status-error/10 p-2 rounded-lg font-mono break-words leading-tight">
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
                          className="p-1 rounded hover:bg-muted text-status-error/80 hover:text-status-error cursor-pointer"
                          title="Delete items from this account"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-border/40">
          <Link
            to="/integrations"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-card border border-border/70 text-xs text-foreground font-medium flex items-center justify-center gap-2 hover:bg-muted transition-colors cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Manage All Adapters & Integrations</span>
          </Link>
        </div>
      </div>
    </div>,
    document.body
  );
};
