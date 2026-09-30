import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  CheckSquare,
  Calendar as CalendarIcon,
  FolderOpen,
  Blocks,
  ShieldCheck,
  Settings,
  Layers,
  Plus,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { WorkspaceModal } from '@/components/workspaces/WorkspaceModal';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/deadlines', label: 'Deadlines', icon: CheckSquare },
  { to: '/calendar', label: 'Calendar', icon: CalendarIcon },
  { to: '/files', label: 'Files', icon: FolderOpen },
  { to: '/integrations', label: 'Integrations', icon: Blocks },
  { to: '/privacy', label: 'Privacy', icon: ShieldCheck },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const WORKSPACE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Layers,
  GraduationCap: Layers,
  Briefcase: Layers,
  User: Layers,
};

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { workspaces, activeWorkspaceId, setActiveWorkspace, accounts } = useAppStore();
  const [isWorkspaceModalOpen, setWorkspaceModalOpen] = useState(false);

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 h-[calc(100vh-4rem)] sticky top-16 border-r border-border/40 px-3 py-5 gap-6">
      {/* Primary navigation */}
      <nav className="space-y-1" aria-label="Primary">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active-pill"
                  className="absolute inset-0 rounded-xl bg-primary/10 border border-primary/25"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <Icon className={cn('w-4 h-4 relative z-10', active && 'text-primary')} />
              <span className="relative z-10">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Workspace switcher */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-3">
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70">
            Workspaces
          </span>
          <button
            onClick={() => setWorkspaceModalOpen(true)}
            className="p-1 rounded-lg text-muted-foreground/70 hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
            title="Create new workspace"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        {workspaces.map((ws) => {
          const Icon = WORKSPACE_ICONS[ws.icon] ?? Layers;
          const active = activeWorkspaceId === ws.id;
          return (
            <button
              key={ws.id}
              onClick={() => setActiveWorkspace(ws.id)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer',
                active
                  ? 'bg-secondary text-secondary-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="truncate">{ws.name}</span>
            </button>
          );
        })}
      </div>

      {/* Linked account dots */}
      <div className="mt-auto px-3 space-y-2">
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70">
          Linked Accounts
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {accounts.length === 0 && (
            <span className="text-[11px] text-muted-foreground">None yet</span>
          )}
          {accounts.slice(0, 8).map((acc) => (
            <motion.span
              key={acc.id}
              layoutId={`acct-dot-${acc.id}`}
              className="w-2.5 h-2.5 rounded-full ring-2 ring-background"
              style={{ backgroundColor: acc.color }}
              title={`${acc.label} (${acc.email})`}
            />
          ))}
        </div>
      </div>

      <WorkspaceModal isOpen={isWorkspaceModalOpen} onClose={() => setWorkspaceModalOpen(false)} />
    </aside>
  );
};
