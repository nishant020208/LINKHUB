import React, { Suspense, lazy, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { DesktopRail } from '@/desktop/layout/DesktopRail';
import { DesktopHeader } from '@/desktop/layout/DesktopHeader';
import { DataRailBackground } from '@/desktop/components/DataRailBackground';
import { DesktopDashboard } from '@/desktop/views/DesktopDashboard';
import { OfflineBanner } from '@/components/pwa/OfflineBanner';
import { PwaManager } from '@/components/pwa/PwaManager';
import { Toaster } from '@/components/ui/toast';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { QuickAddModal } from '@/components/dashboard/QuickAddModal';
import { useAppStore } from '@/store/useAppStore';

const CommandPalette = lazy(() =>
  import('@/components/search/CommandPalette').then((m) => ({ default: m.CommandPalette }))
);

export const DesktopShell: React.FC = () => {
  const location = useLocation();
  const reduce = useReducedMotion();
  const { theme, setCommandPaletteOpen, isCommandPaletteOpen } = useAppStore();
  const [paletteMounted, setPaletteMounted] = React.useState(false);

  useEffect(() => {
    if (isCommandPaletteOpen) setPaletteMounted(true);
  }, [isCommandPaletteOpen]);

  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light', 'aesthetic');
    document.documentElement.classList.add(theme);
  }, [theme]);

  // Global keyboard shortcuts (⌘K for palette, ⌘N for quick add)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        useAppStore.getState().setQuickAddOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCommandPaletteOpen]);

  const isRootDashboard = location.pathname === '/';

  return (
    <div className="min-h-screen flex bg-background text-foreground antialiased relative overflow-x-hidden select-none">
      {/* 1. Subtle Animated Data Rail Circuit Background */}
      <DataRailBackground />

      {/* 2. Persistent Left Command Rail */}
      <DesktopRail />

      {/* 3. Main Command Canvas */}
      <div className="flex-1 min-w-0 flex flex-col relative z-10">
        <DesktopHeader />

        <OfflineBanner />

        <main className="flex-1 min-w-0">
          <RouteErrorBoundary fallbackTitle="This view encountered an error">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
                animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={reduce ? { duration: 0.12 } : { duration: 0.24, ease: 'easeOut' }}
                className="h-full"
              >
                {isRootDashboard ? (
                  <DesktopDashboard />
                ) : (
                  <div className="p-8 sm:p-10 max-w-7xl mx-auto">
                    <Outlet />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </RouteErrorBoundary>
        </main>

        <footer className="border-t border-border/40 py-5 px-8 text-xs text-muted-foreground font-mono flex items-center justify-between">
          <span>UnifyHub Desktop Command Deck &middot; Connected Workstation</span>
          <span>Encrypted Client State &middot; Zero Stored Secrets</span>
        </footer>
      </div>

      {/* Overlays & Global Modals */}
      <QuickAddModal />
      {paletteMounted && (
        <Suspense fallback={null}>
          <CommandPalette />
        </Suspense>
      )}
      <PwaManager />
      <Toaster />
    </div>
  );
};

export default DesktopShell;
