import { useEffect, useState } from 'react';

/**
 * Track browser connectivity.
 *
 * `navigator.onLine` only reports whether a network interface exists, so it can
 * read `true` on a captive-portal Wi-Fi. It is still the right signal for the
 * coarse thing it is used for here: warning the user that requests are about to
 * fail, rather than pretending the app is fully online.
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return isOnline;
}
