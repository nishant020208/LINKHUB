import { useCallback, useEffect, useState } from 'react';

/**
 * Install-prompt plumbing for iOS, Chromium (Android & Desktop Chrome/Edge),
 * and unsupported desktop browsers.
 */

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export type InstallPlatform = 'ios' | 'chromium' | 'unsupported_desktop' | 'unsupported';

export type InstallState = {
  isStandalone: boolean;
  canInstall: boolean;
  platform: InstallPlatform;
  deferredPrompt: BeforeInstallPromptEvent | null;
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
  openInstructions: () => void;
  isInstructionsOpen: boolean;
  closeInstructions: () => void;
  isBannerOpen: boolean;
  closeBanner: () => void;
};

const DISMISSED_KEY = 'unifyhub:install-dismissed';
const OPEN_KEY = 'unifyhub:a2hs-open';

function isIosSafari(ua: string): boolean {
  const isIosDevice = /iPad|iPhone|iPod/.test(ua);
  const isIpadOs = /Macintosh/.test(ua) && typeof document !== 'undefined' && navigator.maxTouchPoints > 1;
  if (!isIosDevice && !isIpadOs) return false;
  return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome/.test(ua);
}

function detectPlatform(hasDeferredPrompt = false): InstallPlatform {
  if (typeof navigator === 'undefined') return 'unsupported';
  const ua = navigator.userAgent;
  if (isIosSafari(ua)) return 'ios';

  // Chromium on Android or Desktop Chrome / Edge / Brave
  if (hasDeferredPrompt || (/Chrome|CriOS|Edg/.test(ua) && !/iPhone|iPad|iPod/.test(ua))) {
    return 'chromium';
  }

  // Desktop Firefox or Desktop Safari (no PWA install prompt support)
  if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
    return 'unsupported_desktop';
  }

  return 'unsupported';
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  const displayStandalone =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;
  return iosStandalone || displayStandalone;
}

function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore storage errors */
  }
}

function clearStored(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore storage errors */
  }
}

export function useInstallPrompt(autoPrompt = true): InstallState {
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<InstallPlatform>('unsupported');
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [isBannerOpen, setIsBannerOpen] = useState(false);

  useEffect(() => {
    setIsStandalone(detectStandalone());
    setPlatform(detectPlatform(deferredPrompt !== null));

    const onInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      setIsBannerOpen(false);
      setIsInstructionsOpen(false);
      // Reset suppression if installed then uninstalled
      clearStored(DISMISSED_KEY);
    };

    const onBeforeInstallPrompt = (event: Event) => {
      // Prevent browser default mini-infobar so our styled prompt appears instead
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setPlatform('chromium');
    };

    const onDisplayModeChange = () => setIsStandalone(detectStandalone());

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    const standaloneQuery =
      typeof window.matchMedia === 'function' ? window.matchMedia('(display-mode: standalone)') : null;
    standaloneQuery?.addEventListener('change', onDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      standaloneQuery?.removeEventListener('change', onDisplayModeChange);
    };
  }, [deferredPrompt]);

  // First-visit delayed auto prompt
  useEffect(() => {
    if (!autoPrompt) return;
    if (isStandalone) return;
    if (readStored(DISMISSED_KEY)) return;

    // iOS Safari guidance modal
    if (platform === 'ios') {
      const timer = window.setTimeout(() => setIsInstructionsOpen(true), 3500);
      return () => window.clearTimeout(timer);
    }

    // Android / Desktop Chrome: show custom install banner once beforeinstallprompt is ready
    if (platform === 'chromium' && deferredPrompt) {
      const timer = window.setTimeout(() => setIsBannerOpen(true), 3500);
      return () => window.clearTimeout(timer);
    }
  }, [autoPrompt, isStandalone, platform, deferredPrompt]);

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferredPrompt) return 'unavailable';
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsBannerOpen(false);
      } else {
        // User dismissed the browser dialog; suppress repeat nag
        writeStored(DISMISSED_KEY, new Date().toISOString());
        setIsBannerOpen(false);
      }
      setDeferredPrompt(null);
      return outcome;
    } catch (err) {
      console.warn('[PWA] Install prompt failed:', err);
      return 'unavailable';
    }
  }, [deferredPrompt]);

  const openInstructions = useCallback(() => setIsInstructionsOpen(true), []);

  const closeInstructions = useCallback(() => {
    setIsInstructionsOpen(false);
    writeStored(DISMISSED_KEY, new Date().toISOString());
    writeStored(OPEN_KEY, '0');
  }, []);

  const closeBanner = useCallback(() => {
    setIsBannerOpen(false);
    writeStored(DISMISSED_KEY, new Date().toISOString());
  }, []);

  const canInstall =
    platform === 'ios' || (platform === 'chromium' && deferredPrompt !== null);

  return {
    isStandalone,
    canInstall,
    platform,
    deferredPrompt,
    promptInstall,
    openInstructions,
    isInstructionsOpen,
    closeInstructions,
    isBannerOpen,
    closeBanner,
  };
}
