import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  LayoutDashboard,
  CheckSquare,
  Calendar as CalendarIcon,
  FolderOpen,
  Blocks,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const MOBILE_ITEMS = [
  { to: '/', label: 'Home', icon: LayoutDashboard },
  { to: '/deadlines', label: 'Due', icon: CheckSquare },
  { to: '/calendar', label: 'Cal', icon: CalendarIcon },
  { to: '/files', label: 'Files', icon: FolderOpen },
  { to: '/integrations', label: 'Hub', icon: Blocks },
];

export const MobileNav: React.FC = () => {
  const location = useLocation();
  const reduce = useReducedMotion();

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/50 bg-card/95 backdrop-blur-2xl shadow-lg"
      aria-label="Mobile primary"
    >
      <div className="grid grid-cols-5 px-1 py-1 pb-[calc(env(safe-area-inset-bottom)+0.25rem)]">
        {MOBILE_ITEMS.map(({ to, label, icon: Icon }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'relative flex flex-col items-center justify-center min-h-[48px] py-1 text-[11px] font-medium select-none rounded-xl',
                active ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {active && (
                <motion.span
                  layoutId="mobile-active-capsule"
                  className="absolute inset-1 rounded-xl bg-primary/10 border border-primary/20 pointer-events-none"
                  transition={reduce ? { duration: 0.01 } : { type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
              <Icon className="w-5 h-5 relative z-10" />
              <span className="text-[10px] relative z-10 leading-tight mt-0.5">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
