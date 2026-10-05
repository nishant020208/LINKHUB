import React, { Suspense, lazy } from 'react';
import { useDeviceType } from '@/hooks/useDeviceType';
import { AppShell } from '@/components/layout/AppShell';
import { RouteFallback } from '@/App';

// DesktopShell and all its desktop-only visual code is strictly code-split
// so mobile clients never download any desktop JS/CSS bundles.
const DesktopShell = lazy(() => import('@/desktop/DesktopShell'));

/**
 * AppLayoutRouter:
 * The single, top-level branch point for device-specific rendering.
 *
 *  - Mobile (<1024px, or any touch-primary device): renders the EXISTING AppShell
 *    completely unchanged, with zero edits to mobile styles or layout.
 *  - Desktop (>=1024px AND fine pointer): loads the new desktop command deck shell
 *    via React.lazy + Suspense.
 */
export const AppLayoutRouter: React.FC = () => {
  const deviceType = useDeviceType();

  if (deviceType === 'desktop') {
    return (
      <Suspense fallback={<RouteFallback />}>
        <DesktopShell />
      </Suspense>
    );
  }

  // Mobile / touch devices render existing AppShell completely unchanged
  return <AppShell />;
};
