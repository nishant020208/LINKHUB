import React, { Suspense, lazy, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { Toaster } from '@/components/ui/toast';
import { PwaManager } from '@/components/pwa/PwaManager';
import { OfflineBanner } from '@/components/pwa/OfflineBanner';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { AestheticGlow } from '@/components/common/AestheticGlow';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';

const CommandPalette = lazy(() =>
  import('@/components/search/CommandPalette').then((m) => ({ default: m.CommandPalette }))
);
const NotificationSettingsModal = lazy(() =>
  import('@/components/settings/NotificationSettingsModal').then((m) => ({
    default: m.NotificationSettingsModal,
  }))
);
const OnboardingWizard = lazy(() =>
  import('@/components/auth/OnboardingWizard').then((m) => ({ default: m.OnboardingWizard }))
);
const ItemDetailModal = lazy(() =>
  import('@/components/dashboard/ItemDetailModal').then((m) => ({ default: m.ItemDetailModal }))
);

const ModalFallback: React.FC = () => null;

export const AppShell: React.FC = () => {
  const { setCommandPaletteOpen, theme, isCommandPaletteOpen } = useAppStore();
  const isNotificationModalOpen = useAppStore((s) => s.isNotificationModalOpen);
  const isOnboardingOpen = useAuthStore((s) => s.isOnboardingOpen);
  const location = useLocation();
  const reduce = useReducedMotion();
  const [paletteMounted, setPaletteMounted] = React.useState(false);

  React.useEffect(() => {
    if (isCommandPaletteOpen) setPaletteMounted(true);
  }, [isCommandPaletteOpen]);

  useEffect(() => {
    // Synchronize active theme classes on <html>: dark, light, or aesthetic
    document.documentElement.classList.remove('dark', 'light', 'aesthetic');
    document.documentElement.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCommandPaletteOpen]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased relative overflow-x-hidden">
      {/* Ambient themed gradient field */}
      <div className="ambient-field fixed inset-0 pointer-events-none z-0" />
      <AestheticGlow />

      {/* Top Banner and Navigation (z-40 to remain above scrolling content) */}
      <div className="relative z-40">
        <Navbar />
      </div>

      {/* Connectivity status sits in the flow directly under the chrome, so it
          reads as a status strip instead of covering page content. */}
      <OfflineBanner />

      <div className="flex-1 relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 flex gap-6">
        <Sidebar />

        <main className="flex-1 min-w-0 py-6 md:py-8 pb-24 lg:pb-8">
          <RouteErrorBoundary fallbackTitle="This view encountered an error">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                transition={reduce ? { duration: 0.12 } : { duration: 0.22, ease: 'easeOut' }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </RouteErrorBoundary>
        </main>
      </div>

      <footer className="relative z-10 border-t border-border/40 py-6 text-center text-xs text-muted-foreground font-mono mb-14 lg:mb-0">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>UnifyHub &middot; Unified Personal Command Center</span>
          <span className="text-[11px] text-muted-foreground/80">
            Read-only by default &middot; Zero client secrets &middot; Client-encrypted
          </span>
        </div>
      </footer>

      <MobileNav />

      {(isCommandPaletteOpen || paletteMounted) && (
        <Suspense fallback={<ModalFallback />}>
          <CommandPalette />
        </Suspense>
      )}
      {isNotificationModalOpen && (
        <Suspense fallback={<ModalFallback />}>
          <NotificationSettingsModal />
        </Suspense>
      )}
      {isOnboardingOpen && (
        <Suspense fallback={<ModalFallback />}>
          <OnboardingWizard />
        </Suspense>
      )}
      {useAppStore((s) => s.activeItemId) && (
        <Suspense fallback={<ModalFallback />}>
          <ItemDetailModal />
        </Suspense>
      )}

      <PwaManager />
      <Toaster />
    </div>
  );
};
