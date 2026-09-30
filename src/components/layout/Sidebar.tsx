import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
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
import { ProviderLogo } from '@/components/ui/provider-logo';
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
  const reduce = useReducedMotion();
  const { workspaces, activeWorkspaceId, setActiveWorkspace, accounts } = useAppStore();
  const [isWorkspaceModalOpen, setWorkspaceModalOpen] = useState(false);

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 h-[calc(100vh-4rem)] sticky top-16 border-r border-border/40 px-3 py-5 gap-6">
      <nav className="space-y-1" aria-label="Primary">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2 min-h-[40px] rounded-xl text-sm font-medium',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active-pill"
                  className="absolute inset-0 rounded-xl bg-primary/10 border border-primary/25"
                  transition={reduce ? { duration: 0.01 } : { type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <Icon className={cn('w-4 h-4 relative z-10', active && 'text-primary')} />
              <span className="relative z-10">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-3">
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70">
            Workspaces
          </span>
          <button
            type="button"
            onClick={() => setWorkspaceModalOpen(true)}
            className="p-1 min-w-[28px] min-h-[28px] rounded-lg text-muted-foreground/70 hover:text-foreground hover:bg-muted/60 cursor-pointer inline-flex items-center justify-center"
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
              type="button"
              onClick={() => setActiveWorkspace(ws.id)}
              className={cn(
                'relative w-full flex items-center gap-2.5 px-3 py-1.5 min-h-[36px] rounded-xl text-xs cursor-pointer',
                active
                  ? 'text-secondary-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              {active && (
                <motion.span
                  layoutId="workspace-active-pill"
                  className="absolute inset-0 rounded-xl bg-secondary"
                  transition={reduce ? { duration: 0.01 } : { type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <Icon className="w-3.5 h-3.5 relative z-10" />
              <span className="truncate relative z-10">{ws.name}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto px-3 space-y-2">
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70">
          Linked Accounts
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {accounts.length === 0 && (
            <span className="text-[11px] text-muted-foreground">None yet</span>
          )}
          {accounts.slice(0, 8).map((acc) => (
            <ProviderLogo
              key={acc.id}
              provider={acc.provider}
              size={14}
              state={acc.status === 'error' || acc.status === 'needs_reconnect' ? 'error' : acc.status === 'syncing' ? 'syncing' : 'idle'}
              title={`${acc.label} (${acc.email})`}
            />
          ))}
        </div>
      </div>

      <WorkspaceModal isOpen={isWorkspaceModalOpen} onClose={() => setWorkspaceModalOpen(false)} />
    </aside>
  );
};
