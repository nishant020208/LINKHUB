import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InstallBannerProps {
  isOpen: boolean;
  onInstall: () => void;
  onClose: () => void;
}

const ICON_SRC = '/icons/icon-192.png';

export const InstallBanner: React.FC<InstallBannerProps> = ({
  isOpen,
  onInstall,
  onClose,
}) => {
  const reduce = useReducedMotion();

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.96 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.96 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-[90] max-w-sm w-full p-4 rounded-3xl bg-card/90 backdrop-blur-xl border border-border/70 shadow-2xl space-y-3"
          role="dialog"
          aria-label="Install UnifyHub prompt"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={ICON_SRC}
                alt=""
                className="w-10 h-10 rounded-xl border border-border/60 shadow-sm shrink-0"
              />
              <div className="min-w-0">
                <h4 className="font-display font-bold text-sm text-foreground truncate">
                  Install UnifyHub
                </h4>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Launch full screen with instant offline caching
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Dismiss install prompt"
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="w-1/2 text-xs h-8 cursor-pointer"
            >
              Not now
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onInstall}
              className="w-1/2 text-xs h-8 cursor-pointer gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
