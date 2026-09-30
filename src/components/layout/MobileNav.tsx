import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
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

/** Mobile bottom navigation (<lg). Active pill animates between items. */
export const MobileNav: React.FC = () => {
  const location = useLocation();

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/50 bg-card/90 backdrop-blur-xl"
      aria-label="Mobile primary"
    >
      <div className="grid grid-cols-5 px-2 pb-[env(safe-area-inset-bottom)]">
        {MOBILE_ITEMS.map(({ to, label, icon: Icon }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'relative flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {active && (
                <motion.span
                  layoutId="mobile-active-dot"
                  className="absolute -top-px h-0.5 w-8 rounded-full bg-primary"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
