import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';
import { useServiceWorkerUpdate } from '@/hooks/useServiceWorkerUpdate';
import { Button } from '@/components/ui/button';

/**
 * "A new version is ready" bar.
 *
 * This is the payoff of the prompt-then-swap update flow: a new build installs
 * in the background and waits, and the user is told, instead of being left on a
 * stale bundle until they notice and force a manual hard refresh. Accepting
 * activates the waiting worker and reloads exactly once.
 */
export const UpdatePrompt: React.FC = () => {
  const { isUpdateReady, applyUpdate, dismissUpdate } = useServiceWorkerUpdate();

  return (
    <AnimatePresence>
      {isUpdateReady && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
          className="fixed top-[calc(env(safe-area-inset-top)+0.75rem)] left-2 right-2 sm:left-auto sm:right-4 z-[120] sm:max-w-sm"
          role="status"
        >
          <div className="pointer-events-auto w-full rounded-2xl border border-primary/40 bg-card/95 backdrop-blur-xl shadow-xl p-3.5 flex items-start gap-3">
            <span className="shrink-0 w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
              <RefreshCw className="w-4 h-4" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground leading-tight">New version available</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                Refresh to pick up the latest UnifyHub. Nothing is lost.
              </p>
              <div className="flex items-center gap-2 mt-2.5">
                <Button variant="primary" size="xs" onClick={applyUpdate}>
                  <RefreshCw className="w-3 h-3" />
                  Refresh now
                </Button>
                <Button variant="ghost" size="xs" onClick={dismissUpdate}>
                  Later
                </Button>
              </div>
            </div>
            <button
              onClick={dismissUpdate}
              aria-label="Dismiss update prompt"
              className="shrink-0 p-1 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
