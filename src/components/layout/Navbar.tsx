import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  RefreshCw,
  Sun,
  Moon,
  Command,
  Bell,
  LogOut,
  ShieldCheck,
  Sliders,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useSyncData } from '@/hooks/useSyncData';
import { queryClient } from '@/lib/queryClient';
import { formatTimeAgo } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLiveAnnouncer } from '@/components/ui/live-announcer';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const {
    accounts,
    theme,
    toggleTheme,
    setCommandPaletteOpen,
    lastSyncedAt,
    setNotificationModalOpen,
  } = useAppStore();
  const { user, signOut } = useAuthStore();
  const { isSyncing, triggerSync } = useSyncData();
  const { announce } = useLiveAnnouncer();

  const handleManualSync = async () => {
    announce('Initiating synchronization across connected accounts...');
    await triggerSync();
    announce('Synchronization complete.');
  };

  const handleSignOut = async () => {
    queryClient.clear();
    await signOut();
    navigate('/', { replace: true });
  };

  const unhealthyAccountsCount = accounts.filter(
    (a) => a.status === 'needs_reconnect' || a.status === 'error'
  ).length;

  return (
    <header className="sticky top-0 z-40 w-full h-[var(--header-height)] border-b border-border/50 bg-background/85 backdrop-blur-xl transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-3">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3 shrink-0">
          <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2 group select-none">
            <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-display font-black text-base tracking-tighter shadow-md shadow-primary/25 group-hover:scale-105 shrink-0">
              U
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-display font-bold text-base sm:text-lg tracking-tight leading-none text-foreground truncate">
                UnifyHub
              </span>
              <span className="text-[10px] font-mono text-muted-foreground hidden sm:block">
                command center
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Command Palette Trigger */}
        <div className="flex-1 max-w-md hidden md:block">
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="w-full min-h-[40px] flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-card/60 hover:bg-card border border-border/60 hover:border-primary/40 text-muted-foreground hover:text-foreground text-xs cursor-pointer group shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 group-hover:text-primary transition-colors" />
              <span>Search mail, files, deadlines, tasks…</span>
            </div>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted/80 border border-border/60 text-[10px] font-mono text-muted-foreground group-hover:text-foreground">
              <Command className="w-3 h-3" />
              <span>K</span>
            </div>
          </button>
        </div>

        {/* Right: Quick actions, Sync, Theme, Profile */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Mobile search trigger */}
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            className="md:hidden"
            onClick={() => setCommandPaletteOpen(true)}
            title="Search (Ctrl+K)"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </Button>

          {/* Sync Trigger */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleManualSync}
            disabled={isSyncing}
            title="Trigger incremental sync across all accounts"
            className="gap-1.5 font-mono text-xs px-2 sm:px-3"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-primary ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline text-[11px]">
              {isSyncing ? 'Syncing…' : formatTimeAgo(lastSyncedAt)}
            </span>
          </Button>

          {/* Account status pill (if issues exist) */}
          {unhealthyAccountsCount > 0 && (
            <Link to="/integrations" title={`${unhealthyAccountsCount} account(s) need attention`}>
              <Badge tone="danger" icon={<AlertTriangle className="w-3 h-3" />}>
                {unhealthyAccountsCount} Alert
              </Badge>
            </Link>
          )}

          {/* Notification Preferences */}
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            onClick={() => setNotificationModalOpen(true)}
            title="Notification preferences"
            aria-label="Notification preferences"
          >
            <Bell className="w-4 h-4" />
          </Button>

          {/* Display Mode Toggle (Dark -> Light -> Aesthetic -> Dark) */}
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            onClick={toggleTheme}
            title={
              theme === 'dark'
                ? 'Active: Dark mode (Click for Light)'
                : theme === 'light'
                ? 'Active: Light mode (Click for Aesthetic)'
                : 'Active: Aesthetic mode (Click for Dark)'
            }
            aria-label="Toggle display theme mode"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-300" />
            ) : theme === 'light' ? (
              <Sparkles className="w-4 h-4 text-primary" />
            ) : (
              <Moon className="w-4 h-4 text-purple-400" />
            )}
          </Button>

          {/* User Profile / Menu */}
          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1 rounded-xl hover:bg-muted/60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-expanded={isUserMenuOpen}
                aria-label="User account menu"
              >
                <img
                  src={user.avatarUrl}
                  alt={user.fullName}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl object-cover ring-1 ring-border shadow-sm"
                />
              </button>

              {isUserMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setIsUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl glass-panel border border-border/70 shadow-2xl p-2 z-40 space-y-1">
                    <div className="px-3 py-2 border-b border-border/40">
                      <p className="font-semibold text-xs text-foreground truncate">{user.fullName}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                    </div>

                    <Link
                      to="/settings"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Account Settings</span>
                    </Link>

                    <Link
                      to="/privacy"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Privacy &amp; Permissions</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        handleSignOut();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-status-error hover:bg-status-error/10 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link to="/login">
              <Button variant="primary" size="sm">
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
