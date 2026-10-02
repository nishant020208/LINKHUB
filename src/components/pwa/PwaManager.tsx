import React from 'react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { InstallInstructions } from '@/components/pwa/InstallPrompt';
import { UpdatePrompt } from '@/components/pwa/UpdatePrompt';

/**
 * Single mount point for the position:fixed PWA surfaces.
 *
 * Rendered once inside the app shell so these prompts only ever appear for a
 * signed-in user, and so exactly one `useInstallPrompt` instance owns the
 * first-visit auto-prompt. Settings uses its own instance with autoPrompt
 * disabled for the manual install button.
 *
 * The offline banner is not here: it needs to sit in the document flow directly
 * under the navbar, so AppShell renders it at that position.
 */
export const PwaManager: React.FC = () => {
  const install = useInstallPrompt(true);

  return (
    <>
      <UpdatePrompt />
      <InstallInstructions
        isOpen={install.isInstructionsOpen}
        onClose={install.closeInstructions}
        platform={install.platform}
      />
    </>
  );
};
