import React, { useState } from 'react';
import {
  Search,
  RefreshCw,
  Sun,
  Moon,
  Command,
  Layers,
  GraduationCap,
  Briefcase,
  User,
  SlidersHorizontal,
  Calendar as CalendarIcon,
  ShieldCheck,
  AlertTriangle,
  Plus,
  Bell,
  LogOut,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { queryClient } from '@/lib/queryClient';
import { formatTimeAgo } from '@/lib/utils';
import { Link, useLocation } from 'react-router-dom';
import { WorkspaceModal } from '@/components/workspaces/WorkspaceModal';

const WORKSPACE_ICONS: Record<string, React.ReactNode> = {
  Layers: <Layers className="w-3.5 h-3.5" />,
  GraduationCap: <GraduationCap className="w-3.5 h-3.5" />,
  Briefcase: <Briefcase className="w-3.5 h-3.5" />,
  User: <User className="w-3.5 h-3.5" />,
};

export const Navbar: React.FC = () => {
  const location = useLocation();
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const {
    activeWorkspaceId,
    setActiveWorkspace,
    workspaces,
    accounts,
    theme,
    toggleTheme,
    setCommandPaletteOpen,
    isSyncing,
    triggerSync,
    lastSyncedAt,
    setNotificationModalOpen,
  } = useAppStore();
  const { user, signOut } = useAuthStore();

  const handleSignOut = async () => {
    queryClient.clear();
    await signOut();
  };

  const unhealthyAccountsCount = accounts.filter(
    (a) => a.status === 'needs_reconnect' || a.status === 'error'
  ).length;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand & Main Navigation */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
              <span className="font-heading font-black text-white text-base tracking-tighter">U</span>
            </div>
            <span className="font-heading font-bold text-lg tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
              UnifyHub
            </span>
          </Link>

          {/* Workspaces Switcher Pills (on desktop) */}
          <div className="hidden lg:flex items-center gap-1 p-1 bg-muted/60 rounded-xl border border-border/40">
            {workspaces.map((ws) => {
              const isActive = activeWorkspaceId === ws.id;
              return (
                <button
                  key={ws.id}
                  onClick={() => setActiveWorkspace(ws.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-card text-foreground shadow-sm shadow-black/5 font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-card/40'
                  }`}
                >
                  {WORKSPACE_ICONS[ws.icon] || <Layers className="w-3.5 h-3.5" />}
                  <span>{ws.name}</span>
                </button>
              );
            })}

            <button
              onClick={() => setIsWorkspaceModalOpen(true)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card/60 transition-colors cursor-pointer"
              title="Create new workspace"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Center: Command Palette Trigger */}
        <div className="flex-1 max-w-md hidden md:block">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-muted/40 hover:bg-muted/70 border border-border/40 text-muted-foreground hover:text-foreground text-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 group-hover:text-primary transition-colors" />
              <span>Search mail, files, deadlines, tasks...</span>
            </div>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-background/80 border border-border text-[10px] font-mono">
              <Command className="w-3 h-3" />
              <span>K</span>
            </div>
          </button>
        </div>

        {/* Right: Quick actions & status */}
        <div className="flex items-center gap-2">
          {/* Quick sync trigger */}
          <button
            onClick={() => triggerSync()}
            disabled={isSyncing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border/50 bg-card/60 hover:bg-card text-xs font-mono text-muted-foreground hover:text-foreground transition-all cursor-pointer disabled:opacity-50"
            title="Trigger incremental sync across all accounts"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-primary ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden xl:inline text-[11px]">
              {isSyncing ? 'Syncing...' : formatTimeAgo(lastSyncedAt)}
            </span>
          </button>

          {/* Account health indicator */}
          <Link
            to="/integrations"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border/50 bg-card/60 hover:bg-card text-xs text-muted-foreground hover:text-foreground transition-all"
            title="Manage connected accounts"
          >
            <div className="flex -space-x-1.5 items-center">
              {accounts.slice(0, 3).map((acc) => (
                <div
                  key={acc.id}
                  className="w-2.5 h-2.5 rounded-full ring-2 ring-background"
                  style={{ backgroundColor: acc.color }}
                  title={`${acc.label} (${acc.email})`}
                />
              ))}
            </div>
            <span className="font-mono text-[11px] font-medium hidden sm:inline ml-1">
              {accounts.length} linked
            </span>
            {unhealthyAccountsCount > 0 && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-rose-500/10 text-rose-400 text-[10px] font-mono border border-rose-500/20">
                <AlertTriangle className="w-2.5 h-2.5" />
                {unhealthyAccountsCount}
              </span>
            )}
          </Link>

          {/* Navigation links */}
          <Link
            to="/calendar"
            className={`p-2 rounded-xl border border-border/50 transition-colors ${
              location.pathname === '/calendar'
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-card/60 text-muted-foreground hover:text-foreground hover:bg-card'
            }`}
            title="Unified Multi-Account Calendar"
          >
            <CalendarIcon className="w-4 h-4" />
          </Link>

          <Link
            to="/integrations"
            className={`p-2 rounded-xl border border-border/50 transition-colors ${
              location.pathname === '/integrations'
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-card/60 text-muted-foreground hover:text-foreground hover:bg-card'
            }`}
            title="Connected Adapters & Integrations"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </Link>

          <Link
            to="/privacy"
            className={`p-2 rounded-xl border border-border/50 transition-colors ${
              location.pathname === '/privacy'
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-card/60 text-muted-foreground hover:text-foreground hover:bg-card'
            }`}
            title="Privacy & Data Control"
          >
            <ShieldCheck className="w-4 h-4" />
          </Link>

          {/* Notifications Hub Trigger */}
          <button
            onClick={() => setNotificationModalOpen(true)}
            className="p-2 rounded-xl border border-border/50 bg-card/60 hover:bg-card text-muted-foreground hover:text-foreground transition-all cursor-pointer relative"
            title="Notification Channels & Quiet Hours"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-sky-400" />
          </button>

          {/* Theme switcher */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-border/50 bg-card/60 hover:bg-card text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            aria-label="Toggle dark/light theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User Profile & Real Sign-Out */}
          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-border/40">
              <img
                src={user.avatarUrl}
                alt={user.fullName}
                className="w-7 h-7 rounded-xl object-cover ring-1 ring-border/50"
              />
              <span className="hidden xl:inline text-xs font-medium text-foreground max-w-[120px] truncate">
                {user.fullName}
              </span>
              <button
                onClick={handleSignOut}
                className="p-2 rounded-xl border border-border/50 bg-card/60 hover:bg-rose-500/10 hover:border-rose-500/30 text-muted-foreground hover:text-rose-400 transition-all cursor-pointer"
                title="Sign out of UnifyHub"
                aria-label="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Workspace Tabs Bar */}
      <div className="lg:hidden flex items-center gap-1 px-4 py-2 border-t border-border/40 overflow-x-auto no-scrollbar">
        {workspaces.map((ws) => {
          const isActive = activeWorkspaceId === ws.id;
          return (
            <button
              key={ws.id}
              onClick={() => setActiveWorkspace(ws.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'bg-muted/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              {WORKSPACE_ICONS[ws.icon] || <Layers className="w-3.5 h-3.5" />}
              <span>{ws.name}</span>
            </button>
          );
        })}
      </div>

      <WorkspaceModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
      />
    </header>
  );
};
