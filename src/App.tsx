import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { env } from '@/lib/env';
import { AppLayoutRouter } from '@/components/layout/AppLayoutRouter';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LiveAnnouncerProvider } from '@/components/ui/live-announcer';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * Route-level code splitting: every page ships as its own chunk and is
 * downloaded only when first visited. This keeps the initial bundle limited
 * to the app shell + auth gate; vendor libs are split separately via
 * manualChunks in vite.config.ts.
 */
const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const DeadlinesPage = lazy(() =>
  import('@/pages/DeadlinesPage').then((m) => ({ default: m.DeadlinesPage }))
);
const CalendarPage = lazy(() =>
  import('@/pages/CalendarPage').then((m) => ({ default: m.CalendarPage }))
);
const FilesPage = lazy(() => import('@/pages/FilesPage').then((m) => ({ default: m.FilesPage })));
const IntegrationsPage = lazy(() =>
  import('@/pages/IntegrationsPage').then((m) => ({ default: m.IntegrationsPage }))
);
const PrivacyPage = lazy(() =>
  import('@/pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage }))
);
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);
const WeeklyDigestPage = lazy(() =>
  import('@/pages/WeeklyDigestPage').then((m) => ({ default: m.WeeklyDigestPage }))
);
const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const LandingPage = lazy(() =>
  import('@/pages/LandingPage').then((m) => ({ default: m.LandingPage }))
);
const AuthCallbackPage = lazy(() =>
  import('@/pages/AuthCallbackPage').then((m) => ({ default: m.AuthCallbackPage }))
);

/** Full-screen (shell-free) loading state for the auth/entry routes. */
const BootFallback: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      <p className="text-xs font-mono text-muted-foreground">Loading…</p>
    </div>
  </div>
);

/** Lightweight in-shell fallback so the sidebar/navbar stay visible on tab switch. */
export const RouteFallback: React.FC = () => (
  <div className="flex items-center justify-center py-24">
    <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
  </div>
);

export const App: React.FC = () => {
  useEffect(() => {
    useAuthStore.getState().initializeAuth();
  }, []);

  // Google Search Console verification meta tag injection fallback
  useEffect(() => {
    if (env.googleSiteVerification) {
      let meta = document.querySelector('meta[name="google-site-verification"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'google-site-verification');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', env.googleSiteVerification);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LiveAnnouncerProvider>
        <BrowserRouter>
          <Suspense fallback={<BootFallback />}>
            <Routes>
              {/* Public Routes (Accessible without login for Google verification reviewers and visitors) */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />

              {/* Protected Application Routes — device-branched layout (mobile vs desktop) */}
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayoutRouter />}>
                  <Route
                    path="/dashboard"
                    element={
                      <Suspense fallback={<RouteFallback />}>
                        <DashboardPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="deadlines"
                    element={
                      <Suspense fallback={<RouteFallback />}>
                        <DeadlinesPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="calendar"
                    element={
                      <Suspense fallback={<RouteFallback />}>
                        <CalendarPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="files"
                    element={
                      <Suspense fallback={<RouteFallback />}>
                        <FilesPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="integrations"
                    element={
                      <Suspense fallback={<RouteFallback />}>
                        <IntegrationsPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="privacy"
                    element={
                      <Suspense fallback={<RouteFallback />}>
                        <PrivacyPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="settings"
                    element={
                      <Suspense fallback={<RouteFallback />}>
                        <SettingsPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="digest"
                    element={
                      <Suspense fallback={<RouteFallback />}>
                        <WeeklyDigestPage />
                      </Suspense>
                    }
                  />
                </Route>
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </LiveAnnouncerProvider>
    </QueryClientProvider>
  );
};

export default App;
