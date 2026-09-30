import React, { useEffect, useRef } from 'react';
import { create } from 'zustand';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
}

interface ToastState {
  toasts: ToastItem[];
  toast: (t: { kind: ToastKind; title: string; message?: string }) => void;
  dismiss: (id: number) => void;
}

let nextToastId = 1;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  toast: ({ kind, title, message }) => {
    const id = nextToastId++;
    set((state) => ({ toasts: [...state.toasts.slice(-4), { id, kind, title, message }] }));
    // Auto-dismiss after 5s
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 5000);
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

const KIND_STYLES: Record<ToastKind, { border: string; icon: React.ReactNode; chip: string }> = {
  success: {
    border: 'border-status-connected/40',
    chip: 'bg-status-connected/10 text-status-connected',
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  error: {
    border: 'border-status-error/40',
    chip: 'bg-status-error/10 text-status-error',
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  info: {
    border: 'border-status-syncing/40',
    chip: 'bg-status-syncing/10 text-status-syncing',
    icon: <Info className="w-4 h-4" />,
  },
};

export const Toaster: React.FC = () => {
  const { toasts, dismiss } = useToastStore();
  const reduced = useReducedMotion();

  return (
    <div className="fixed bottom-20 lg:bottom-4 right-2 left-2 sm:left-auto sm:right-4 sm:max-w-sm z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={dismiss} reduced={reduced} />
        ))}
      </AnimatePresence>
    </div>
  );
};

function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  const mqRef = useRef<MediaQueryList | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    mqRef.current = mq;
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return reduced;
}

const ToastCard: React.FC<{
  toast: ToastItem;
  onDismiss: (id: number) => void;
  reduced: boolean;
}> = ({ toast, onDismiss, reduced }) => {
  const style = KIND_STYLES[toast.kind];
  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, x: 40, scale: 0.96 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, x: 0, scale: 1 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, x: 40, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        'pointer-events-auto w-full rounded-2xl border bg-card/95 backdrop-blur-xl shadow-xl p-3.5 flex items-start gap-3',
        style.border
      )}
      role="status"
    >
      <span className={cn('shrink-0 w-8 h-8 rounded-xl flex items-center justify-center', style.chip)}>
        {style.icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-tight">{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug break-words">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 p-1 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
};
