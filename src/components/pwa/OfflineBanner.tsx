import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

/**
 * Offline notice.
 *
 * With no network the service worker still serves the precached app shell, so
 * the dashboard renders from its own cached code. The user's data comes from
 * Supabase and is deliberately not cached by the service worker (it is
 * auth-scoped and frequently mutated), so this states plainly that what is on
 * screen is the last loaded state rather than pretending the app is live.
 *
 * Rendered directly below the navbar in the document flow and made sticky, so
 * it reads as a status strip under the chrome instead of covering content.
 */
export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();

  return (
    <AnimatePresence initial={false}>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.18 }}
          className="sticky top-0 z-30 overflow-hidden"
          role="status"
        >
          <div className="flex items-center justify-center gap-2 px-4 py-2 bg-status-warning/15 border-b border-status-warning/30 text-[11px] text-status-warning font-mono">
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Offline &mdash; showing your last loaded data</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
