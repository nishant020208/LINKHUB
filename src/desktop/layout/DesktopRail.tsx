import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  FolderOpen,
  Sparkles,
  Sliders,
  Settings,
  ShieldCheck,
  RefreshCw,
  Plus,
  Search,
  Sun,
  Moon,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useSyncData } from '@/hooks/useSyncData';
import { formatTimeAgo, cn } from '@/lib/utils';

export const DesktopRail: React.FC = () => {
  const navigate = useNavigate();
  const {
    accounts,
    theme,
    toggleTheme,
    setCommandPaletteOpen,
    setQuickAddOpen,
  } = useAppStore();
  const { user, signOut } = useAuthStore();
  const { isSyncing, triggerSync } = useSyncData();

  const navLinks = [
    { to: '/dashboard', label: 'Command Station', icon: LayoutDashboard },
    { to: '/deadlines', label: 'Deadlines Queue', icon: CheckSquare },
    { to: '/calendar', label: 'Unified Calendar', icon: Calendar },
    { to: '/files', label: 'Documents & Files', icon: FolderOpen },
    { to: '/digest', label: 'Weekly Synthesis', icon: Sparkles },
    { to: '/integrations', label: 'Connected Streams', icon: Sliders },
    { to: '/settings', label: 'System Settings', icon: Settings },
    { to: '/privacy', label: 'Privacy & Rights', icon: ShieldCheck },
  ];

  return (
    <aside className="w-72 shrink-0 h-screen sticky top-0 flex flex-col justify-between border-r border-border/50 bg-card/60 backdrop-blur-2xl z-30 select-none">
      {/* Top Brand Header */}
      <div>
        <div className="p-5 pb-4 border-b border-border/40 flex items-center justify-between">
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold font-display shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
              U
            </div>
            <div>
              <span className="font-display font-extrabold text-base tracking-tight text-foreground block leading-none">
                UnifyHub
              </span>
              <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mt-1 block">
                Command Deck
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setQuickAddOpen(true)}
            title="Quick add item (⌘N)"
            className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Global Search Bar */}
        <div className="px-4 py-3 border-b border-border/30">
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="w-full px-3 py-2 rounded-xl bg-card/50 border border-border/60 hover:border-primary/40 text-left flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-xs"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-primary" />
              <span>Search or command...</span>
            </span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted/60 text-[10px] font-mono text-muted-foreground border border-border/50">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Main Navigation */}
        <nav className="p-3 space-y-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group relative',
                    isActive
                      ? 'bg-primary/12 text-primary font-semibold shadow-xs border border-primary/25'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={cn(
                        'w-4 h-4 transition-colors',
                        isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                      )}
                    />
                    <span className="flex-1 truncate">{item.label}</span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Middle: Connected Accounts Deck */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 border-t border-border/30">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
            Live Stream Deck ({accounts.length})
          </span>
          <button
            type="button"
            onClick={() => triggerSync()}
            disabled={isSyncing}
            className="p-1 rounded-lg text-muted-foreground hover:text-primary transition-colors cursor-pointer disabled:opacity-50"
            title="Synchronize all streams"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isSyncing && 'animate-spin text-primary')} />
          </button>
        </div>

        <div className="space-y-1.5">
          {accounts.length === 0 ? (
            <div className="p-3 rounded-xl border border-dashed border-border/60 text-center">
              <p className="text-[11px] text-muted-foreground">No accounts connected</p>
              <button
                type="button"
                onClick={() => navigate('/integrations')}
                className="text-[11px] font-mono text-primary hover:underline mt-1 block w-full"
              >
                + Connect Provider
              </button>
            </div>
          ) : (
            accounts.slice(0, 6).map((acc) => {
              const isRecent =
                acc.last_synced_at &&
                Date.now() - new Date(acc.last_synced_at).getTime() < 15 * 60 * 1000;

              return (
                <div
                  key={acc.id}
                  onClick={() => navigate('/integrations')}
                  className="px-2.5 py-2 rounded-xl bg-card/40 border border-border/40 hover:border-border flex items-center justify-between text-xs transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: acc.color || '#e8a54b' }}
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate text-[11px] leading-tight">
                        {acc.label || acc.provider}
                      </p>
                      <span className="text-[10px] font-mono text-muted-foreground block truncate">
                        {acc.last_synced_at ? formatTimeAgo(acc.last_synced_at) : 'pending'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isRecent && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"
                        title="Live & up to date"
                      />
                    )}
                    <ChevronRight className="w-3 h-3 text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom Profile & Utilities */}
      <div className="p-4 border-t border-border/40 bg-card/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                className="w-8 h-8 rounded-xl ring-1 ring-border/60 object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                {user?.fullName?.charAt(0) || 'U'}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">
                {user?.fullName || 'Pilot'}
              </p>
              <p className="text-[10px] font-mono text-muted-foreground truncate">
                {user?.email || 'Active session'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
              title={
                theme === 'dark'
                  ? 'Active: Dark mode (Click for Light)'
                  : theme === 'light'
                  ? 'Active: Light mode (Click for Aesthetic)'
                  : 'Active: Aesthetic mode (Click for Dark)'
              }
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : theme === 'light' ? (
                <Sparkles className="w-3.5 h-3.5 text-primary" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-purple-400" />
              )}
            </button>

            <button
              type="button"
              onClick={async () => {
                await signOut();
                navigate('/', { replace: true });
              }}
              className="p-2 rounded-xl border border-border/50 text-muted-foreground hover:text-status-error hover:border-status-error/40 hover:bg-status-error/10 transition-colors cursor-pointer"
              title="Sign Out of UnifyHub"
              aria-label="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
