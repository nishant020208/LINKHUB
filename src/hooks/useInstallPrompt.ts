import { useCallback, useEffect, useState } from 'react';

/**
 * Install-prompt plumbing for both platforms.
 *
 * The two platforms need genuinely different handling:
 *
 *   - Android/Chrome fires `beforeinstallprompt`, which we capture and defer so
 *     the app can render its own styled install button instead of relying on
 *     whatever moment the browser's own mini-infobar decides to appear.
 *   - iOS Safari has no install API at all. The only path is Share ->
 *     "Add to Home Screen", so the app has to teach the user where to tap.
 *     Chrome/Firefox/Edge on iOS must be excluded: they wrap WebKit and cannot
 *     add anything to the home screen, so showing instructions there would be
 *     a dead end.
 */

/** `BeforeInstallPromptEvent` is not in the DOM lib yet, so type the useful parts. */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export type InstallPlatform = 'ios' | 'android' | 'unsupported';

export type InstallState = {
  /** True when running from the home screen (standalone display mode). */
  isStandalone: boolean;
  /** True when the platform has a working install path we can drive. */
  canInstall: boolean;
  /** Which platform-specific experience to show. */
  platform: InstallPlatform;
  /** Android/Chrome: a captured `beforeinstallprompt` waiting to be used. */
  deferredPrompt: BeforeInstallPromptEvent | null;
  /** Android/Chrome: fires once the deferred prompt has been consumed. */
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
  /** The user asked to see the instructions, e.g. from Settings. */
  openInstructions: () => void;
  /** The instructions overlay is currently open. */
  isInstructionsOpen: boolean;
  closeInstructions: () => void;
};

const DISMISSED_KEY = 'unifyhub:a2hs-dismissed';
const OPEN_KEY = 'unifyhub:a2hs-open';

function isIosSafari(ua: string): boolean {
  const isIosDevice = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ reports as "Macintosh" but is still a touch-capable iPad.
  const isIpadOs = /Macintosh/.test(ua) && typeof document !== 'undefined' && navigator.maxTouchPoints > 1;
  if (!isIosDevice && !isIpadOs) return false;
  // Every iOS browser other than Safari is WebKit under a foreign shell and
  // cannot install to the home screen.
  return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome/.test(ua);
}

function isAndroid(ua: string): boolean {
  return /Android/.test(ua);
}

function detectPlatform(): InstallPlatform {
  if (typeof navigator === 'undefined') return 'unsupported';
  const ua = navigator.userAgent;
  if (isIosSafari(ua)) return 'ios';
  if (isAndroid(ua)) return 'android';
  return 'unsupported';
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  // iOS exposes this as a non-standard property; Android/Chrome expose
  // `display-mode: standalone` in the media query.
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
    // Safari private mode throws on localStorage access; treat as "not stored".
    return null;
  }
}

function writeStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable; dismissal just won't persist */
  }
}

/**
 * @param autoPrompt Show the iOS instructions automatically on first eligible
 * visit. The caller decides; this hook only owns the dismissal bookkeeping.
 */
export function useInstallPrompt(autoPrompt = true): InstallState {
  const [isStandalone, setIsStandalone] = useState(false);
  const [platform, setPlatform] = useState<InstallPlatform>('unsupported');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);

  useEffect(() => {
    setIsStandalone(detectStandalone());
    setPlatform(detectPlatform());

    const onInstalled = () => {
      // Real signal that the app is on the home screen; stop prompting entirely.
      setIsStandalone(true);
      setDeferredPrompt(null);
      writeStored(DISMISSED_KEY, new Date().toISOString());
    };

    // Capture and defer: preventing the default event is what stops Chrome
    // from showing its own mini-infobar so we can use our own UI.
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
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
  }, []);

  // First-visit auto prompt, iOS only. Android never auto-prompted here: the
  // deferred `beforeinstallprompt` is surfaced as a button in Settings instead.
  useEffect(() => {
    if (!autoPrompt) return;
    if (isStandalone) return;
    if (platform !== 'ios') return;
    if (readStored(DISMISSED_KEY)) return;
    if (readStored(OPEN_KEY) === '1') {
      // Return visit inside the same session after it was already dismissed.
      writeStored(OPEN_KEY, '0');
      return;
    }
    const timer = window.setTimeout(() => setIsInstructionsOpen(true), 2500);
    return () => window.clearTimeout(timer);
  }, [autoPrompt, isStandalone, platform]);

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferredPrompt) return 'unavailable';
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
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

  // iOS always has a manual path; Android only when the browser offered one.
  const canInstall = platform === 'ios' || (platform === 'android' && deferredPrompt !== null);

  return {
    isStandalone,
    canInstall,
    platform,
    deferredPrompt,
    promptInstall,
    openInstructions,
    isInstructionsOpen,
    closeInstructions,
  };
}
