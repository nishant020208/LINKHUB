import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { DemoBanner } from '@/components/common/DemoBanner';
import { Navbar } from '@/components/layout/Navbar';
import { useAppStore } from '@/store/useAppStore';

export const AppShell: React.FC = () => {
  const { setCommandPaletteOpen, theme } = useAppStore();

  useEffect(() => {
    // Ensure dark class on document root initially
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Global keyboard shortcut for Command Palette
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCommandPaletteOpen, theme]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary relative overflow-x-hidden">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-30 dark:opacity-20">
        <div className="absolute -top-[20%] left-[20%] w-[600px] h-[600px] bg-sky-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-[40%] right-[10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[160px]" />
      </div>

      {/* Top Banner and Navigation */}
      <div className="relative z-20">
        <DemoBanner />
        <Navbar />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 md:py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/40 py-6 text-center text-xs text-muted-foreground font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>UnifyHub &middot; Unified Personal Command Center</span>
          <span className="text-[11px] text-muted-foreground/80">
            Read-only by default &middot; Zero client secrets &middot; Client-encrypted
          </span>
        </div>
      </footer>
    </div>
  );
};
