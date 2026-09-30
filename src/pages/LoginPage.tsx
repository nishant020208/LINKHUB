import React, { useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Sun, Moon, ArrowRight, Lock, CheckCircle2, Calendar, Clock, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const reduce = useReducedMotion();
  const { user, isInitialized, signInWithGoogle, signInWithGitHub, isLoading, authError, setAuthError } = useAuthStore();
  const { theme, toggleTheme } = useAppStore();

  useEffect(() => {
    if (isInitialized && user) {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [user, isInitialized, navigate, location]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const err = params.get('error');
    if (err) {
      setAuthError(decodeURIComponent(err));
    }
  }, [location.search, setAuthError]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between relative overflow-hidden">
      {!reduce && (
        <div className="hero-orbs" aria-hidden>
          <div className="hero-orb hero-orb-a" />
          <div className="hero-orb hero-orb-b" />
        </div>
      )}

      <header className="w-full border-b border-border/40 backdrop-blur-xl bg-background/85 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-display font-black text-base shadow-md shadow-primary/20">
              U
            </div>
            <span className="font-display font-extrabold text-xl tracking-tight text-foreground">
              UnifyHub
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            iconOnly
            onClick={toggleTheme}
            aria-label="Toggle dark/light theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-primary" /> : <Moon className="w-4 h-4 text-primary" />}
          </Button>
        </div>
      </header>

      <main className="relative z-10 flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-6 space-y-6">
          <Badge tone="accent">
            Unified Personal Command Station
          </Badge>

          <h1 className="font-display font-extrabold text-3xl sm:text-5xl text-foreground tracking-tight leading-[1.12]">
            One calm view for everything you do.
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-lg">
            Consolidate your Google, Microsoft, and developer ecosystems into an intentionally designed bento dashboard. Zero tab hopping.
          </p>

          <Card variant="bento" className="p-6 space-y-4 max-w-md shadow-xl" tilt>
            {authError && (
              <div className="p-3.5 rounded-xl bg-status-error/10 border border-status-error/30 text-status-error text-xs">
                {authError}
              </div>
            )}

            <div className="space-y-3">
              <motion.button
                type="button"
                whileTap={reduce ? undefined : { scale: 0.97 }}
                whileHover={reduce ? undefined : { y: -1 }}
                onClick={() => signInWithGoogle()}
                disabled={isLoading}
                className="w-full min-h-[48px] py-3 px-4 rounded-2xl bg-card hover:bg-muted/80 text-foreground font-semibold text-xs sm:text-sm flex items-center justify-center gap-3 border border-border/70 hover:border-primary/50 cursor-pointer disabled:opacity-50 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
                <ArrowRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.button>

              <motion.button
                type="button"
                whileTap={reduce ? undefined : { scale: 0.97 }}
                whileHover={reduce ? undefined : { y: -1 }}
                onClick={() => signInWithGitHub()}
                disabled={isLoading}
                className="w-full min-h-[48px] py-3 px-4 rounded-2xl bg-card hover:bg-muted/80 text-foreground font-semibold text-xs sm:text-sm flex items-center justify-center gap-3 border border-border/70 hover:border-primary/50 cursor-pointer disabled:opacity-50 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <svg className="w-4 h-4 shrink-0 fill-current text-foreground" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                <span>Continue with GitHub</span>
                <ArrowRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.button>
            </div>

            <div className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground space-y-1.5 leading-normal">
              <div className="flex items-center gap-1.5 text-status-connected font-semibold">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>Zero Private Data Access at Login</span>
              </div>
              <p>
                Signing in creates your personal UnifyHub session. Data providers are linked later under strict read-only permissions with row-level security.
              </p>
              <div className="pt-1">
                <Link to="/privacy" className="text-primary hover:underline font-mono text-[11px] inline-flex items-center gap-1 font-semibold">
                  <span>Read our Privacy Policy &amp; Data Transparency &rarr;</span>
                </Link>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card variant="bento" interactive tilt className="p-5 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                <span className="flex items-center gap-1.5 uppercase tracking-widest font-medium">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  Next Meeting
                </span>
                <Badge tone="info">Calendar</Badge>
              </div>
              <div>
                <h4 className="font-display font-semibold text-sm text-foreground">Distributed Systems Sync</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Google Meet &middot; 4 attendees</p>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-xs text-primary font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>11:30 AM – 12:15 PM</span>
              </div>
            </Card>

            <Card variant="bento" interactive tilt className="p-5 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                <span className="flex items-center gap-1.5 uppercase tracking-widest font-medium">
                  <AlertCircle className="w-3.5 h-3.5 text-status-warning" />
                  Due Today
                </span>
                <Badge tone="danger">Assignment</Badge>
              </div>
              <div>
                <h4 className="font-display font-semibold text-sm text-foreground">Problem Set 4: Raft Consensus</h4>
                <p className="text-xs text-muted-foreground mt-0.5">CS 6.824 &middot; Submit PDF</p>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-xs text-status-warning font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>Due in 4h 15m</span>
              </div>
            </Card>

            <Card variant="bento" interactive className="sm:col-span-2 p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-status-connected/15 text-status-connected flex items-center justify-center font-bold shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-display font-semibold text-sm text-foreground">Multi-Account Real-Time Sync</h4>
                  <p className="text-xs text-muted-foreground">
                    Google Workspace, Outlook 365, GitHub, and Canvas active.
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono text-status-connected font-semibold px-2.5 py-1 rounded-full bg-status-connected/10 border border-status-connected/30 shrink-0">
                Encrypted at rest
              </span>
            </Card>
          </div>
        </div>
      </main>

      <footer className="relative z-10 w-full border-t border-border/40 py-6 px-4 sm:px-6 text-center text-xs font-mono text-muted-foreground flex flex-col sm:flex-row items-center justify-between max-w-6xl mx-auto gap-3">
        <div>&copy; {new Date().getFullYear()} UnifyHub. All rights reserved.</div>
        <div className="flex items-center gap-4 flex-wrap justify-center">
          <Link to="/privacy" className="text-primary hover:underline font-semibold">
            Privacy Policy
          </Link>
          <span>&middot;</span>
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground"
          >
            Google Permissions
          </a>
          <span>&middot;</span>
          <a
            href="mailto:nishant020208@gmail.com"
            className="hover:text-foreground"
          >
            Contact Developer
          </a>
        </div>
      </footer>
    </div>
  );
};
