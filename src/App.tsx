import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { env } from '@/lib/env';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardPage } from '@/pages/DashboardPage';
import { DeadlinesPage } from '@/pages/DeadlinesPage';
import { CalendarPage } from '@/pages/CalendarPage';
import { FilesPage } from '@/pages/FilesPage';
import { IntegrationsPage } from '@/pages/IntegrationsPage';
import { PrivacyPage } from '@/pages/PrivacyPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { LoginPage } from '@/pages/LoginPage';
import { AuthCallbackPage } from '@/pages/AuthCallbackPage';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export const App: React.FC = () => {
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
      <BrowserRouter>
        <Routes>
          {/* Public Routes (Accessible without login for Google verification reviewers and visitors) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />

          {/* Protected Application Routes — one shared shell, no reloads between tabs */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="deadlines" element={<DeadlinesPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="files" element={<FilesPage />} />
              <Route path="integrations" element={<IntegrationsPage />} />
              <Route path="privacy" element={<PrivacyPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
