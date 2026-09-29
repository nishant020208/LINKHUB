import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Sparkles, Sun, Moon, ArrowRight, Lock } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useAppStore } from '@/store/useAppStore';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isInitialized, signInWithGoogle, signInWithGitHub, isLoading, authError, setAuthError } = useAuthStore();
  const { theme, toggleTheme } = useAppStore();

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (isInitialized && user) {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [user, isInitialized, navigate, location]);

  // Read error from query string if redirected from oauth
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const err = params.get('error');
    if (err) {
      setAuthError(decodeURIComponent(err));
    }
  }, [location.search, setAuthError]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20 selection:text-primary transition-colors">
      {/* Top Navbar */}
      <header className="w-full border-b border-border/40 backdrop-blur-xl bg-background/80 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <span className="font-heading font-black text-white text-lg tracking-tight">U</span>
            </div>
            <span className="font-heading font-bold text-xl tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
              UnifyHub
            </span>
          </div>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-border/50 bg-card/60 hover:bg-card text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            aria-label="Toggle dark/light theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Pitch & Login Buttons */}
        <div className="lg:col-span-6 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Cross-Platform Command Center</span>
          </div>

          <h1 className="font-heading font-black text-3xl sm:text-5xl text-foreground tracking-tight leading-[1.15]">
            One calm view for everything you do.
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            UnifyHub merges your Google, Microsoft, and developer ecosystems into a unified, intelligent bento dashboard. Zero tab hopping.
          </p>

          {/* Auth Card */}
          <div className="p-6 rounded-3xl glass-panel border border-border/60 shadow-2xl space-y-4 max-w-md">
            {authError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {authError}
              </div>
            )}

            <div className="space-y-3">
              {/* Google Button */}
              <button
                onClick={() => signInWithGoogle()}
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-card hover:bg-muted/80 text-foreground font-medium text-xs sm:text-sm flex items-center justify-center gap-3 border border-border/70 hover:border-primary/50 transition-all shadow-sm cursor-pointer disabled:opacity-50 group"
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
              </button>

              {/* GitHub Button */}
              <button
                onClick={() => signInWithGitHub()}
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-card hover:bg-muted/80 text-foreground font-medium text-xs sm:text-sm flex items-center justify-center gap-3 border border-border/70 hover:border-primary/50 transition-all shadow-sm cursor-pointer disabled:opacity-50 group"
              >
                <svg className="w-4 h-4 shrink-0 fill-current text-foreground" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                <span>Continue with GitHub</span>
                <ArrowRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>

            <div className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground space-y-1.5 leading-normal">
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>Zero Data Access at Login</span>
              </div>
              <p>
                Signing in only authenticates your UnifyHub identity. Your mail, calendars, and files are only linked later via distinct read-only scopes.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Mini Bento Command Preview */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-5 rounded-3xl glass-panel border border-border/60 shadow-2xl space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-heading font-bold text-xs uppercase tracking-wider text-muted-foreground">
                  Command Center Live Bento
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                Preview
              </span>
            </div>

            {/* Mock Bento Item 1 */}
            <div className="p-3.5 rounded-2xl bg-card/60 border border-border/50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center font-mono text-xs font-bold">
                  EX
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">CS 2110 Final Exam</div>
                  <div className="text-[11px] text-muted-foreground">Cornell Canvas &middot; Statler Auditorium</div>
                </div>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 font-semibold border border-rose-500/20">
                In 2h 15m
              </span>
            </div>

            {/* Mock Bento Item 2 */}
            <div className="p-3.5 rounded-2xl bg-card/60 border border-border/50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center font-mono text-xs font-bold">
                  EV
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">Sprint Architecture Sync</div>
                  <div className="text-[11px] text-muted-foreground">Google Calendar &middot; meet.google.com/xyz</div>
                </div>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 font-semibold border border-sky-500/20">
                4:00 PM
              </span>
            </div>

            {/* Mock Bento Item 3 */}
            <div className="p-3.5 rounded-2xl bg-card/60 border border-border/50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-mono text-xs font-bold">
                  PR
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">API Token Rotation Security PR</div>
                  <div className="text-[11px] text-muted-foreground">GitHub &middot; #142 Ready for Review</div>
                </div>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-semibold border border-indigo-500/20">
                Assigned
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-muted/30 border border-border/30 text-center">
                <div className="font-mono font-bold text-base text-foreground">0 ms</div>
                <div className="text-[10px] text-muted-foreground uppercase font-mono">Sync Latency</div>
              </div>
              <div className="p-3 rounded-xl bg-muted/30 border border-border/30 text-center">
                <div className="font-mono font-bold text-base text-emerald-400">100%</div>
                <div className="text-[10px] text-muted-foreground uppercase font-mono">Read-Only Safety</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border/40 py-6 text-center text-xs text-muted-foreground font-mono">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>AES-256 Token Encryption &middot; Strict RLS &middot; Zero Private Body Storage</span>
          </div>
          <div>UnifyHub &middot; Phase 9 Production Grade</div>
        </div>
      </footer>
    </div>
  );
};
