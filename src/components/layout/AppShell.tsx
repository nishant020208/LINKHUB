import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { CommandPalette } from '@/components/search/CommandPalette';
import { NotificationSettingsModal } from '@/components/settings/NotificationSettingsModal';
import { OnboardingWizard } from '@/components/auth/OnboardingWizard';
import { Toaster } from '@/components/ui/toast';
import { useAppStore } from '@/store/useAppStore';

export const AppShell: React.FC = () => {
  const { setCommandPaletteOpen, theme } = useAppStore();
  const location = useLocation();

  useEffect(() => {
    // Dark is the default (no class); .light opts into the light token set.
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    // Global keyboard shortcut for Command Palette
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

      {/* Top Banner and Navigation */}
      <div className="relative z-20">
        <Navbar />
      </div>

      {/* Shell body: persistent sidebar + animated routed content.
          The shell never remounts between tabs, so navigation is SPA-only. */}
      <div className="flex-1 relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 flex gap-6">
        <Sidebar />

        <main className="flex-1 min-w-0 py-6 md:py-8 pb-24 lg:pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/40 py-6 text-center text-xs text-muted-foreground font-mono mb-14 lg:mb-0">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>UnifyHub &middot; Unified Personal Command Center</span>
          <span className="text-[11px] text-muted-foreground/80">
            Read-only by default &middot; Zero client secrets &middot; Client-encrypted
          </span>
        </div>
      </footer>

      {/* Mobile bottom navigation */}
      <MobileNav />

      {/* Global Modals */}
      <CommandPalette />
      <NotificationSettingsModal />
      <OnboardingWizard />

      {/* Toast notifications */}
      <Toaster />
    </div>
  );
};
