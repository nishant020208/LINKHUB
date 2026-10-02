import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Plus, Check, X, Smartphone, Download, Menu } from 'lucide-react';
import { type InstallPlatform, type InstallState } from '@/hooks/useInstallPrompt';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Install surfaces.
 *
 * `PwaManager` owns the automatic first-visit overlay; `InstallButton` is the
 * permanent, manually-triggered entry point used in Settings so a user who
 * dismissed the overlay can always install later.
 */

const ICON_SRC = '/icons/icon-192.png';

/* ------------------------------------------------------------------ *
 * Manual install instructions
 * ------------------------------------------------------------------ */

/**
 * iOS has no install API, so the only thing the app can do is teach the exact
 * taps. Dismissal is persisted in localStorage by the hook, so this does not
 * reappear on every visit.
 *
 * Android normally uses the captured `beforeinstallprompt` instead, but that
 * event is not guaranteed to fire (already installed, dismissed natively, or a
 * non-eligible browser), so the menu-based path is kept as the fallback.
 */
export const InstallInstructions: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  platform: InstallPlatform;
}> = ({ isOpen, onClose, platform }) => {
  React.useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (typeof document === 'undefined') return null;

  const isIos = platform === 'ios';

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4 sm:p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="a2hs-title"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="bg-card border border-border/70 rounded-3xl w-full sm:max-w-sm p-5 sm:p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={ICON_SRC}
                  alt=""
                  className="w-12 h-12 rounded-2xl border border-border/60 shadow-md"
                />
                <div>
                  <h2 id="a2hs-title" className="font-display font-bold text-base text-foreground leading-tight">
                    Add UnifyHub to Home Screen
                  </h2>
                  <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                    Launches full screen, no browser bar
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close install instructions"
                className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ol className="space-y-3">
              {isIos ? (
                <>
                  <Step index={1}>
                    <span className="flex-1">
                      Tap the <strong className="text-foreground">Share</strong> button in your Safari toolbar
                    </span>
                    <IconChip>
                      <Share2 className="w-4 h-4 text-primary" />
                    </IconChip>
                  </Step>
                  <Step index={2}>
                    <span className="flex-1">
                      Scroll down and tap <strong className="text-foreground">Add to Home Screen</strong>
                    </span>
                    <IconChip>
                      <Plus className="w-4 h-4 text-primary" />
                    </IconChip>
                  </Step>
                  <Step index={3}>
                    <span className="flex-1">
                      Tap <strong className="text-foreground">Add</strong> in the top right
                    </span>
                    <IconChip>
                      <Check className="w-4 h-4 text-status-connected" />
                    </IconChip>
                  </Step>
                </>
              ) : (
                <>
                  <Step index={1}>
                    <span className="flex-1">
                      Open the browser <strong className="text-foreground">menu</strong>
                    </span>
                    <IconChip>
                      <Menu className="w-4 h-4 text-primary" />
                    </IconChip>
                  </Step>
                  <Step index={2}>
                    <span className="flex-1">
                      Choose <strong className="text-foreground">Install app</strong> or{' '}
                      <strong className="text-foreground">Add to Home screen</strong>
                    </span>
                    <IconChip>
                      <Download className="w-4 h-4 text-primary" />
                    </IconChip>
                  </Step>
                  <Step index={3}>
                    <span className="flex-1">
                      Confirm the install, then launch UnifyHub from its icon
                    </span>
                    <IconChip>
                      <Check className="w-4 h-4 text-status-connected" />
                    </IconChip>
                  </Step>
                </>
              )}
            </ol>

            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <Smartphone className="w-4 h-4 text-primary shrink-0" />
              <p className="text-[11px] text-muted-foreground leading-snug">
                UnifyHub then opens from its own icon, full screen, with your dashboard already cached.
              </p>
            </div>

            <Button variant="primary" size="md" className="w-full" onClick={onClose}>
              Got it
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

const Step: React.FC<{ index: number; children: React.ReactNode }> = ({ index, children }) => (
  <li className="flex items-center gap-3 p-3 rounded-2xl bg-background/50 border border-border/50">
    <span className="w-6 h-6 shrink-0 rounded-lg bg-primary/15 text-primary font-mono text-xs font-bold flex items-center justify-center">
      {index}
    </span>
    {children}
  </li>
);

const IconChip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="shrink-0 w-9 h-9 rounded-xl bg-card border border-border/60 flex items-center justify-center">
    {children}
  </span>
);

/* ------------------------------------------------------------------ *
 * Install button (Settings)
 * ------------------------------------------------------------------ */

/**
 * Wraps an install-capable platform hook. Kept separate from the overlay so
 * Settings can own its own instance without triggering the auto-prompt.
 */
export const InstallButton: React.FC<{
  install: InstallState;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}> = ({ install, className, variant = 'primary', size = 'sm' }) => {
  const handleClick = async () => {
    if (install.platform === 'ios') {
      install.openInstructions();
      return;
    }
    const outcome = await install.promptInstall();
    if (outcome === 'unavailable') {
      // No captured prompt (already installed, or dismissed natively).
      // Fall back to the instructions, which still cover the manual path.
      install.openInstructions();
    }
  };

  if (install.isStandalone) {
    return (
      <span className={cn('inline-flex items-center gap-2 text-xs text-status-connected', className)}>
        <Check className="w-3.5 h-3.5" />
        Installed
      </span>
    );
  }

  if (install.platform === 'unsupported') {
    return (
      <span className={cn('text-xs text-muted-foreground', className)}>
        Install is available in Safari and Chrome
      </span>
    );
  }

  return (
    <Button variant={variant} size={size} onClick={handleClick} className={className}>
      <Download className="w-3.5 h-3.5" />
      {install.platform === 'ios' ? 'How to install' : 'Install app'}
    </Button>
  );
};
