import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Monitor,
  Laptop,
  Smartphone,
  Download,
  Check,
  ArrowRight,
  Sun,
  Moon,
  Sparkles,
  ShieldCheck,
  Layers,
  Zap,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useAppStore } from '@/store/useAppStore';
import { useDeviceType } from '@/hooks/useDeviceType';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { InstallInstructions } from '@/components/pwa/InstallPrompt';
import GlyphPortal from '@/components/ui/glyph-portal';
import { ThemeAmbientBackground } from '@/components/ui/theme-ambient-background';
import { Button } from '@/components/ui/button';
import { LiquidButton } from '@/components/ui/liquid-button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type VisitorOS = 'windows' | 'mac' | 'ios' | 'android' | 'other';

function detectVisitorOS(): VisitorOS {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  const platform =
    (navigator as unknown as { userAgentData?: { platform?: string } }).userAgentData?.platform ||
    navigator.platform ||
    '';

  if (/iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'ios';
  }
  if (/Android/.test(ua)) {
    return 'android';
  }
  if (/Win/i.test(platform) || /Windows/i.test(ua)) {
    return 'windows';
  }
  if (/Mac/i.test(platform) || /Macintosh/i.test(ua)) {
    return 'mac';
  }
  return 'other';
}

interface DesktopHelpModalProps {
  os: 'windows' | 'mac';
  isOpen: boolean;
  onClose: () => void;
  isStandalone?: boolean;
}

const DesktopHelpModal: React.FC<DesktopHelpModalProps> = ({ os, isOpen, onClose, isStandalone }) => {
  const isWindows = os === 'windows';

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="w-full max-w-md rounded-3xl bg-card border border-border/80 shadow-2xl p-6 space-y-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              {isWindows ? <Monitor className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-foreground leading-tight">
                {isStandalone
                  ? 'Already Installed'
                  : isWindows
                  ? 'Install on Windows'
                  : 'Install on macOS'}
              </h3>
              <p className="text-xs font-mono text-muted-foreground mt-0.5">
                {isStandalone ? 'Running as desktop app' : 'Standalone command station'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isStandalone ? (
          <div className="p-4 rounded-2xl bg-status-connected/10 border border-status-connected/30 text-xs text-foreground space-y-1">
            <p className="font-semibold text-status-connected flex items-center gap-1.5">
              <Check className="w-4 h-4" /> UnifyHub is already installed
            </p>
            <p className="text-muted-foreground">
              You are currently running UnifyHub in standalone window mode.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2.5 text-xs text-foreground">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-background/60 border border-border/50">
                <span className="w-6 h-6 rounded-lg bg-primary/15 text-primary font-mono text-xs font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  <p className="font-medium">
                    {isWindows
                      ? 'In Google Chrome or Microsoft Edge'
                      : 'In Google Chrome, Edge, or Safari'}
                  </p>
                  <p className="text-muted-foreground text-[11px] mt-0.5">
                    {isWindows
                      ? 'Look for the install icon in the address bar (right side), or open the browser menu (⋮) → "Install UnifyHub".'
                      : 'In Safari 17+, select File → "Add to Dock". In Chrome/Edge, click the install icon in the address bar.'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-background/60 border border-border/50">
                <span className="w-6 h-6 rounded-lg bg-primary/15 text-primary font-mono text-xs font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <div>
                  <p className="font-medium">Quick Bookmark Shortcut</p>
                  <p className="text-muted-foreground text-[11px] mt-0.5">
                    Press <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono font-semibold text-foreground">{isWindows ? 'Ctrl + D' : '⌘ + D'}</kbd> to bookmark UnifyHub in any browser for immediate one-click access.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-[11px] text-muted-foreground">
              Progressive Web App technology allows UnifyHub to operate as an isolated desktop window with zero bloat and automatic background updates.
            </div>
          </div>
        )}

        <Button variant="primary" size="md" className="w-full" onClick={onClose}>
          Got it
        </Button>
      </motion.div>
    </div>
  );
};

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const deviceType = useDeviceType();
  const { user, isInitialized } = useAuthStore();
  const { theme, toggleTheme } = useAppStore();
  const install = useInstallPrompt(false);

  const [visitorOS, setVisitorOS] = useState<VisitorOS>('other');
  const [mobileInstallModal, setMobileInstallModal] = useState<'ios' | 'chromium' | null>(null);
  const [desktopModalState, setDesktopModalState] = useState<{
    os: 'windows' | 'mac';
    isOpen: boolean;
    isStandalone?: boolean;
  }>({
    os: 'windows',
    isOpen: false,
    isStandalone: false,
  });

  useEffect(() => {
    setVisitorOS(detectVisitorOS());
  }, []);

  // Redirect authenticated visitors straight to dashboard
  useEffect(() => {
    if (isInitialized && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [isInitialized, user, navigate]);

  if (isInitialized && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleWindowsClick = async () => {
    if (install.isStandalone) {
      setDesktopModalState({ os: 'windows', isOpen: true, isStandalone: true });
      return;
    }
    if (install.platform === 'chromium') {
      const outcome = await install.promptInstall();
      if (outcome === 'unavailable') {
        setDesktopModalState({ os: 'windows', isOpen: true, isStandalone: false });
      }
    } else {
      setDesktopModalState({ os: 'windows', isOpen: true, isStandalone: false });
    }
  };

  const handleMacClick = async () => {
    if (install.isStandalone) {
      setDesktopModalState({ os: 'mac', isOpen: true, isStandalone: true });
      return;
    }
    if (install.platform === 'chromium') {
      const outcome = await install.promptInstall();
      if (outcome === 'unavailable') {
        setDesktopModalState({ os: 'mac', isOpen: true, isStandalone: false });
      }
    } else {
      setDesktopModalState({ os: 'mac', isOpen: true, isStandalone: false });
    }
  };

  const handleIosClick = () => {
    if (install.isStandalone) {
      setDesktopModalState({ os: 'mac', isOpen: true, isStandalone: true });
      return;
    }
    setMobileInstallModal('ios');
  };

  const handleAndroidClick = async () => {
    if (install.isStandalone) {
      setDesktopModalState({ os: 'windows', isOpen: true, isStandalone: true });
      return;
    }
    if (install.platform === 'chromium') {
      const outcome = await install.promptInstall();
      if (outcome === 'unavailable') {
        setMobileInstallModal('chromium');
      }
    } else {
      setMobileInstallModal('chromium');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between relative overflow-x-clip selection:bg-primary/20 selection:text-primary">
      {/* Theme-matched ambient background (Clouds for White/Light, Black Hole for Dark, Recursive Erosion for Aesthetic) */}
      <ThemeAmbientBackground
        theme={theme}
        deviceType={deviceType}
        reduce={Boolean(reduce)}
      />

      {/* Header */}
      <header className="w-full border-b border-border/40 backdrop-blur-xl bg-background/85 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 select-none">
            <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-display font-black text-base shadow-md shadow-primary/20">
              U
            </div>
            <span className="font-display font-extrabold text-xl tracking-tight text-foreground">
              UnifyHub
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              onClick={toggleTheme}
              aria-label="Toggle theme"
              title={`Switch theme (currently ${theme})`}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-primary" />
              ) : theme === 'light' ? (
                <Sparkles className="w-4 h-4 text-primary" />
              ) : (
                <Moon className="w-4 h-4 text-primary" />
              )}
            </Button>

            <Link to="/login">
              <Button variant="primary" size="sm" className="font-medium gap-1.5 shadow-sm">
                <span>Sign Up / Log In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-16 flex flex-col justify-center">
        {deviceType === 'desktop' ? (
          /* ================= DESKTOP VIEW ================= */
          <div className="space-y-16">
            {/* Hero Section — GlyphPortal */}
            <div
              data-demo-scroll
              data-slipstream-demo
              tabIndex={0}
              role="region"
              aria-label="UnifyHub. Scroll to step inside."
              className="w-full rounded-3xl border border-border/40 bg-card/40 backdrop-blur-md shadow-2xl relative focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none scroll-smooth"
              style={{
                height: 'min(720px, 85svh)',
                overflowY: 'auto',
                containerType: 'inline-size',
                background: 'var(--background)',
              }}
            >
              <style>{`
                [data-slipstream-demo] { scrollbar-width: thin; scrollbar-color: var(--border) transparent; }
                [data-slipstream-demo] [data-gp-caption]{inset:calc(var(--gp-word-bottom,50%) + 82px) 24px auto;justify-content:center;}
                [data-slipstream-demo] [data-gp-hint]{display:none;}
                [data-slipstream-demo] [data-gp-enter]{min-height:46px;padding:0 24px;gap:18px;background:var(--primary);border:1px solid var(--border);border-radius:14px;color:var(--primary-foreground);font-size:13px;font-weight:600;box-shadow:var(--shadow-glow);transition:background .18s,transform .18s;}
                [data-slipstream-demo] [data-gp-enter]:hover{background:var(--primary-hover);transform:scale(1.02);}
                [data-slipstream-demo] [data-gp-enter]:focus-visible{outline:2px solid var(--primary);outline-offset:4px;}
                [data-slipstream-demo] [data-gp-touch-picker]{top:auto;bottom:18px;left:50%;}
                [data-slipstream-demo] [data-gp-select]{border-color:var(--border);border-radius:8px;font-size:12px;color:var(--muted-foreground);background:var(--card);}
                [data-sublime-header]{position:absolute;inset:clamp(20px,4cqw,40px) clamp(20px,4.5cqw,48px) auto;display:flex;align-items:center;justify-content:space-between;gap:20px;}
                [data-sublime-logo]{font-size:18px;font-weight:800;letter-spacing:-.04em;color:var(--foreground);}
                [data-sublime-category]{font-size:12px;font-family:var(--font-mono);color:var(--muted-foreground);}
                [data-sublime-eyebrow]{position:absolute;inset:auto 24px calc(100% - var(--gp-word-top,35%) + 24px);margin:0;text-align:center;font-size:13px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;font-family:var(--font-mono);color:var(--primary);}
                [data-sublime-support]{position:absolute;inset:calc(var(--gp-word-bottom,50%) + 28px) 24px auto;margin:0;text-align:center;font-size:15px;font-weight:400;line-height:1.5;color:var(--muted-foreground);}
                [data-sublime-scroll]{position:absolute;inset:auto 24px 6%;text-align:center;color:var(--muted-foreground);font-size:11px;font-family:var(--font-mono);letter-spacing:.05em;}
                @media(any-pointer:coarse){[data-sublime-scroll]{bottom:12%;}}
                @container(max-width:450px){[data-sublime-category]{max-width:14ch;text-align:right;}[data-sublime-eyebrow]{font-size:11px;}[data-sublime-support]{font-size:13px;}[data-slipstream-demo] [data-gp-caption]{top:calc(var(--gp-word-bottom,50%) + 72px);}}
                @container(max-height:479px){[data-sublime-header]{top:16px;}[data-sublime-support]{top:calc(var(--gp-word-bottom,50%) + 14px);}[data-slipstream-demo] [data-gp-caption]{top:calc(var(--gp-word-bottom,50%) + 56px);}[data-sublime-scroll]{display:none;}}
                [data-slipstream-demo] [data-gp-content]{padding:5.5rem clamp(1.25rem,5cqw,5rem) 6.5rem;font-family:inherit;}
                [data-slipstream-demo] section,[data-slipstream-demo] [data-gp-caption]{font-family:inherit;}
                [data-slipstream-copy]{display:flex;width:min(100%,80rem);margin:auto;flex-direction:column;align-items:flex-start;gap:clamp(2rem,5svh,3.5rem);}
                [data-slipstream-copy] h2{max-width:48rem;margin:0;color:var(--foreground);font-size:clamp(1.75rem,1.1rem + 2.1cqw,2.25rem);font-weight:800;line-height:1.2;letter-spacing:-0.03em;text-wrap:balance;}
                [data-slipstream-features]{display:grid;width:100%;grid-template-columns:1fr;gap:1.75rem;}
                [data-slipstream-feature]{border-top:1px solid var(--border);padding-top:1.1rem;}
                [data-slipstream-feature] h3{margin:0;color:var(--foreground);font-size:1.125rem;font-weight:700;line-height:1.2;}
                [data-slipstream-feature] p{margin:.55rem 0 0;color:var(--muted-foreground);font-size:.9375rem;line-height:1.55;}
                [data-slipstream-no]{display:inline-block;margin-right:.7rem;color:var(--primary);font:700 .75rem ui-monospace,monospace;letter-spacing:.08em;transform:translateY(-.1em);}
                @container(min-width:768px){[data-slipstream-features]{grid-template-columns:repeat(3,minmax(0,1fr));gap:3.5rem;}}
              `}</style>
              <GlyphPortal
                word="UnifyHub"
                fontFamily="var(--font-display), 'Bricolage Grotesque', Arial, sans-serif"
                fontWeight={800}
                scrollLength={2.4}
                interactive={true}
                annotations={false}
                enterLabel="Step Inside Command Station"
                background={
                  <div
                    className="absolute inset-0 w-full h-full transition-colors duration-500"
                    style={{
                      background:
                        theme === 'light'
                          ? 'radial-gradient(circle at 20% 20%, rgba(180, 83, 9, 0.22), transparent 45%), radial-gradient(circle at 80% 80%, rgba(15, 122, 88, 0.14), transparent 45%), linear-gradient(135deg, #fbf8f3 0%, #ebe4d8 100%)'
                          : theme === 'aesthetic'
                          ? 'radial-gradient(circle at 20% 20%, rgba(157, 92, 252, 0.38), transparent 45%), radial-gradient(circle at 80% 80%, rgba(56, 189, 248, 0.22), transparent 45%), linear-gradient(135deg, #121326 0%, #090a14 100%)'
                          : 'radial-gradient(circle at 20% 20%, rgba(232, 165, 75, 0.32), transparent 45%), radial-gradient(circle at 80% 80%, rgba(61, 186, 139, 0.18), transparent 45%), linear-gradient(135deg, #1a1714 0%, #0c0b0a 100%)',
                    }}
                  />
                }
                style={{
                  '--gp-paper': 'var(--background)',
                  '--gp-ink': 'var(--foreground)',
                  '--gp-field': 'var(--card)',
                  '--gp-foreground': 'var(--foreground)',
                }}
                front={
                  <>
                    <div data-sublime-header>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-display font-black text-xs shadow-sm">
                          U
                        </div>
                        <span data-sublime-logo>UnifyHub</span>
                      </div>
                      <span data-sublime-category>Personal Command Station</span>
                    </div>
                    <p data-sublime-eyebrow>Frosted Glass Serenity &bull; Zero Tab Hopping</p>
                    <p data-sublime-support>One calm view for Google, Microsoft, and dev workflows. Scroll to enter.</p>
                    <span data-sublime-scroll>Scroll for a closer look ↓</span>
                  </>
                }
              >
                <div data-slipstream-copy>
                  <div className="space-y-3">
                    <Badge tone="accent">System Architecture</Badge>
                    <h2>A personal command station engineered for calm focus.</h2>
                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">
                      Instead of scattering your attention across 8 web dashboards, UnifyHub synthesizes calendar appointments, deadline notices, PR reviews, and urgent messages into a single deliberate interface.
                    </p>
                  </div>
                  <div data-slipstream-features>
                    <div data-slipstream-feature>
                      <h3><span data-slipstream-no>01</span>Unified Streams</h3>
                      <p>Google Calendar, Outlook, Todoist, and GitHub blended chronologically into one unified timeline.</p>
                    </div>
                    <div data-slipstream-feature>
                      <h3><span data-slipstream-no>02</span>Gesture Triage</h3>
                      <p>Rapid backlog sorting with fluid swipes and keyboard navigation — mark critical or archive instantly.</p>
                    </div>
                    <div data-slipstream-feature>
                      <h3><span data-slipstream-no>03</span>Private &amp; Local First</h3>
                      <p>Row-level security, tokens encrypted, zero AI scraping of your personal schedules or messages.</p>
                    </div>
                  </div>
                  <div className="pt-4 flex items-center gap-4">
                    <LiquidButton
                      onClick={() => navigate('/login')}
                      className="px-8 py-3.5 text-sm font-semibold shadow-lg shadow-primary/25 cursor-pointer"
                    >
                      <span>Get Started &mdash; Sign In</span>
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </LiquidButton>
                    <a
                      href="#install-options"
                      className="px-5 py-3 rounded-2xl border border-border/60 hover:border-primary/40 text-xs font-mono font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-card/60 backdrop-blur-sm"
                    >
                      View Download Options &darr;
                    </a>
                  </div>
                </div>
              </GlyphPortal>
            </div>

            {/* Platform Download Grid */}
            <div id="install-options" className="space-y-6">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div>
                  <h2 className="font-display font-bold text-lg text-foreground">
                    Native Apps &amp; Installs
                  </h2>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    PWA installation &bull; Instant offline launch &bull; Zero app store clutter
                  </p>
                </div>
                <div className="text-xs font-mono text-primary flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-status-connected animate-pulse" />
                  <span>Detected OS: <strong className="uppercase">{visitorOS}</strong></span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Windows */}
                <Card
                  variant="bento"
                  className={cn(
                    'p-5 flex flex-col justify-between transition-all hover:-translate-y-1',
                    visitorOS === 'windows' &&
                      'border-primary/70 ring-1 ring-primary/40 shadow-lg shadow-primary/10 bg-primary/[0.04]'
                  )}
                  interactive
                  tilt
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-card border border-border/60 flex items-center justify-center text-primary">
                        <Monitor className="w-5 h-5" />
                      </div>
                      {visitorOS === 'windows' && (
                        <Badge tone="accent">Detected Device</Badge>
                      )}
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-sm text-foreground">
                        Download for Windows
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-snug">
                        Dedicated desktop window, taskbar pinning, and native system shortcuts.
                      </p>
                    </div>
                  </div>
                  <div className="pt-4">
                    <Button
                      variant={visitorOS === 'windows' ? 'primary' : 'secondary'}
                      size="sm"
                      className="w-full gap-2 font-medium"
                      onClick={handleWindowsClick}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download for Windows</span>
                    </Button>
                  </div>
                </Card>

                {/* macOS */}
                <Card
                  variant="bento"
                  className={cn(
                    'p-5 flex flex-col justify-between transition-all hover:-translate-y-1',
                    visitorOS === 'mac' &&
                      'border-primary/70 ring-1 ring-primary/40 shadow-lg shadow-primary/10 bg-primary/[0.04]'
                  )}
                  interactive
                  tilt
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-card border border-border/60 flex items-center justify-center text-primary">
                        <Laptop className="w-5 h-5" />
                      </div>
                      {visitorOS === 'mac' && (
                        <Badge tone="accent">Detected Device</Badge>
                      )}
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-sm text-foreground">
                        Download for Mac
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-snug">
                        Dock integration via Safari Sonoma or Chrome, Spotlight launch.
                      </p>
                    </div>
                  </div>
                  <div className="pt-4">
                    <Button
                      variant={visitorOS === 'mac' ? 'primary' : 'secondary'}
                      size="sm"
                      className="w-full gap-2 font-medium"
                      onClick={handleMacClick}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download for Mac</span>
                    </Button>
                  </div>
                </Card>

                {/* iOS */}
                <Card
                  variant="bento"
                  className={cn(
                    'p-5 flex flex-col justify-between transition-all hover:-translate-y-1',
                    visitorOS === 'ios' &&
                      'border-primary/70 ring-1 ring-primary/40 shadow-lg shadow-primary/10 bg-primary/[0.04]'
                  )}
                  interactive
                  tilt
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-card border border-border/60 flex items-center justify-center text-primary">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      {visitorOS === 'ios' && (
                        <Badge tone="accent">Detected Device</Badge>
                      )}
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-sm text-foreground">
                        Install on iOS
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-snug">
                        Full-screen Safari Home Screen app with instant tactile triage.
                      </p>
                    </div>
                  </div>
                  <div className="pt-4">
                    <Button
                      variant={visitorOS === 'ios' ? 'primary' : 'secondary'}
                      size="sm"
                      className="w-full gap-2 font-medium"
                      onClick={handleIosClick}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Install on iOS</span>
                    </Button>
                  </div>
                </Card>

                {/* Android */}
                <Card
                  variant="bento"
                  className={cn(
                    'p-5 flex flex-col justify-between transition-all hover:-translate-y-1',
                    visitorOS === 'android' &&
                      'border-primary/70 ring-1 ring-primary/40 shadow-lg shadow-primary/10 bg-primary/[0.04]'
                  )}
                  interactive
                  tilt
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-card border border-border/60 flex items-center justify-center text-primary">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      {visitorOS === 'android' && (
                        <Badge tone="accent">Detected Device</Badge>
                      )}
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-sm text-foreground">
                        Install on Android
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-snug">
                        Fast APK-less launcher shortcut with local offline cache.
                      </p>
                    </div>
                  </div>
                  <div className="pt-4">
                    <Button
                      variant={visitorOS === 'android' ? 'primary' : 'secondary'}
                      size="sm"
                      className="w-full gap-2 font-medium"
                      onClick={handleAndroidClick}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Install on Android</span>
                    </Button>
                  </div>
                </Card>
              </div>
            </div>

            {/* Value Props Bento Showcase */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              <Card variant="bento" className="p-6 space-y-3" tilt>
                <div className="w-10 h-10 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="font-display font-bold text-base text-foreground">
                  One Unified Stream
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Google Calendar, Microsoft Outlook, Todoist, Moodle, and GitHub PRs blended into a single chronological agenda.
                </p>
              </Card>

              <Card variant="bento" className="p-6 space-y-3" tilt>
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="font-display font-bold text-base text-foreground">
                  Gesture &amp; Key Triage
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Clear priority backlogs with touch swipes or desktop arrow keys. Important vs Not Important in fractions of a second.
                </p>
              </Card>

              <Card variant="bento" className="p-6 space-y-3" tilt>
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-display font-bold text-base text-foreground">
                  Read-Only &amp; Private
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your credentials never touch client bundles. Strict RLS database enforcement with zero AI model training on private data.
                </p>
              </Card>
            </div>
          </div>
        ) : (
          /* ================= MOBILE VIEW ================= */
          <div className="space-y-10">
            {/* Mobile Hero */}
            <div className="space-y-4">
              <Badge tone="accent" className="text-[11px]">
                Personal Command Station
              </Badge>

              <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-foreground tracking-tight leading-tight">
                One calm view for everything you do.
              </h1>

              <p className="text-sm text-muted-foreground leading-relaxed">
                Google, Microsoft, and developer ecosystems unified into a single bento station. Zero tab hopping.
              </p>

              <div className="pt-2">
                <LiquidButton
                  onClick={() => navigate('/login')}
                  className="w-full py-3.5 text-sm font-semibold justify-center cursor-pointer"
                >
                  <span>Sign Up / Log In</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </LiquidButton>
              </div>
            </div>

            {/* Mobile Platform Cards */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-base text-foreground">
                  Install UnifyHub
                </h2>
                <span className="text-[11px] font-mono text-primary font-medium">
                  Detected: <strong className="uppercase">{visitorOS}</strong>
                </span>
              </div>

              <div className="space-y-3">
                {/* Highlight Detected Device First if Mobile */}
                {visitorOS === 'ios' ? (
                  <Card
                    variant="bento"
                    className="p-4 border-primary ring-1 ring-primary/40 space-y-3 bg-primary/[0.04]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Smartphone className="w-4 h-4 text-primary" />
                        <span className="font-display font-bold text-sm">Install on iOS</span>
                      </div>
                      <Badge tone="accent">Recommended</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-snug">
                      Add to Safari Home Screen for a native full-screen command station.
                    </p>
                    <Button variant="primary" size="md" className="w-full" onClick={handleIosClick}>
                      <Download className="w-4 h-4" />
                      <span>Install on iOS</span>
                    </Button>
                  </Card>
                ) : visitorOS === 'android' ? (
                  <Card
                    variant="bento"
                    className="p-4 border-primary ring-1 ring-primary/40 space-y-3 bg-primary/[0.04]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Smartphone className="w-4 h-4 text-primary" />
                        <span className="font-display font-bold text-sm">Install on Android</span>
                      </div>
                      <Badge tone="accent">Recommended</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-snug">
                      1-tap install with home screen icon and offline persistence.
                    </p>
                    <Button variant="primary" size="md" className="w-full" onClick={handleAndroidClick}>
                      <Download className="w-4 h-4" />
                      <span>Install on Android</span>
                    </Button>
                  </Card>
                ) : null}

                {/* Other Platform Options */}
                {visitorOS !== 'ios' && (
                  <button
                    type="button"
                    onClick={handleIosClick}
                    className="w-full p-3.5 rounded-2xl border border-border/60 bg-card/60 hover:bg-card text-left flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-4 h-4 text-muted-foreground" />
                      <span className="font-display font-semibold text-xs text-foreground">
                        Install on iOS
                      </span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}

                {visitorOS !== 'android' && (
                  <button
                    type="button"
                    onClick={handleAndroidClick}
                    className="w-full p-3.5 rounded-2xl border border-border/60 bg-card/60 hover:bg-card text-left flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-4 h-4 text-muted-foreground" />
                      <span className="font-display font-semibold text-xs text-foreground">
                        Install on Android
                      </span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleWindowsClick}
                  className="w-full p-3.5 rounded-2xl border border-border/60 bg-card/60 hover:bg-card text-left flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Monitor className="w-4 h-4 text-muted-foreground" />
                    <span className="font-display font-semibold text-xs text-foreground">
                      Download for Windows
                    </span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                </button>

                <button
                  type="button"
                  onClick={handleMacClick}
                  className="w-full p-3.5 rounded-2xl border border-border/60 bg-card/60 hover:bg-card text-left flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Laptop className="w-4 h-4 text-muted-foreground" />
                    <span className="font-display font-semibold text-xs text-foreground">
                      Download for Mac
                    </span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Mobile Feature Highlights */}
            <div className="space-y-3 pt-2">
              <div className="p-4 rounded-2xl border border-border/50 bg-card/40 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Layers className="w-4 h-4 text-primary" />
                  <span>Calendar, Deadlines &amp; Email In One Place</span>
                </div>
                <p className="text-xs text-muted-foreground leading-snug">
                  Stop hopping across 5 separate apps. Your entire day in one serene timeline.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-border/50 bg-card/40 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <ShieldCheck className="w-4 h-4 text-status-connected" />
                  <span>Privacy-First Architecture</span>
                </div>
                <p className="text-xs text-muted-foreground leading-snug">
                  Tokens are stored encrypted, queries are isolated by row-level security.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border/40 py-6 px-4 sm:px-6 relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>&copy; {new Date().getFullYear()} UnifyHub. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <span>&bull;</span>
            <Link to="/login" className="hover:text-foreground transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <InstallInstructions
        isOpen={mobileInstallModal !== null}
        onClose={() => setMobileInstallModal(null)}
        platform={mobileInstallModal || 'ios'}
      />

      <DesktopHelpModal
        os={desktopModalState.os}
        isOpen={desktopModalState.isOpen}
        onClose={() => setDesktopModalState((s) => ({ ...s, isOpen: false }))}
        isStandalone={desktopModalState.isStandalone}
      />
    </div>
  );
};
