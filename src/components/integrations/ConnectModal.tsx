import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Lock,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Key,
  Globe,
  Mail,
  Loader2,
} from 'lucide-react';
import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';
import { startProviderOAuth, connectWithCredentials } from '@/lib/oauth';
import { AccountProvider } from '@/types';

export interface ProviderConnectConfig {
  key: AccountProvider;
  name: string;
  category: string;
  authType: 'oauth' | 'token' | 'credentials';
  scopes: string[];
  description: string;
  color?: string;
}

interface ConnectModalProps {
  provider: ProviderConnectConfig | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ConnectModal: React.FC<ConnectModalProps> = ({ provider, isOpen, onClose }) => {
  const [emailOrLabel, setEmailOrLabel] = useState('');
  const [token, setToken] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [imapHost, setImapHost] = useState('');
  const [imapPort, setImapPort] = useState('993');
  const [imapUser, setImapUser] = useState('');
  const [imapPassword, setImapPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !provider) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (provider.authType === 'oauth') {
        await startProviderOAuth(provider.key);
        // The browser now navigates to the provider consent screen.
        return;
      }

      if (provider.authType === 'credentials') {
        if (!imapHost || !imapUser || !imapPassword) {
          throw new Error('Please fill in the server host, username, and app password.');
        }
        await connectWithCredentials('imap', {
          host: imapHost,
          port: imapPort,
          user: imapUser,
          password: imapPassword,
        });
      } else if (provider.authType === 'token') {
        if (!baseUrl || !token) {
          throw new Error('Please fill in both the portal URL and your personal access token.');
        }
        await connectWithCredentials('moodle', { baseUrl, token });
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
      queryClient.invalidateQueries({ queryKey: queryKeys.items });
      queryClient.invalidateQueries({ queryKey: queryKeys.syncLogs });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to connect integration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-background/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg rounded-2xl glass-panel border border-border/80 p-4 sm:p-6 shadow-2xl z-10 max-h-[92vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold font-heading shadow-md"
                style={{ backgroundColor: provider.color || '#0ea5e9' }}
              >
                {provider.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-heading font-semibold text-lg text-foreground">
                  Connect {provider.name}
                </h3>
                <span className="text-[11px] font-mono text-primary uppercase tracking-wider">
                  {provider.category} &middot; {provider.authType.toUpperCase()}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Description and Scopes Pill Box */}
            <div className="p-3 rounded-xl bg-card/40 border border-border/40 text-xs space-y-2">
              <p className="text-muted-foreground leading-relaxed">{provider.description}</p>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-status-connected">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Read-Only Scopes Requested:</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {provider.scopes.map((s) => (
                  <span
                    key={s}
                    className="text-[9px] font-mono px-2 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/30"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Error and Success banners */}
            {error && (
              <div className="p-3 rounded-xl bg-status-error/10 border border-status-error/30 text-status-error text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-status-error" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="p-3 rounded-xl bg-status-connected/10 border border-status-connected/30 text-status-connected text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-status-connected" />
                <span>Successfully linked and verified! Synchronizing items...</span>
              </div>
            )}

            {/* Mode-specific Fields */}
            {provider.authType === 'oauth' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Account Label / Identifier
                  </label>
                  <input
                    type="text"
                    required
                    value={emailOrLabel}
                    onChange={(e) => setEmailOrLabel(e.target.value)}
                    placeholder="e.g. University Email or Work Identity"
                    className="w-full text-xs font-mono px-3 py-2 rounded-xl bg-background/80 border border-border text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p>
                    Connecting will request zero write permissions. Authentication happens directly with{' '}
                    <strong className="text-foreground">{provider.name}</strong>; tokens are encrypted.
                  </p>
                </div>
              </div>
            )}

            {provider.authType === 'token' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Portal Base URL
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder="https://moodle.university.edu"
                      className="w-full text-xs font-mono px-3 py-2 pr-8 rounded-xl bg-background/80 border border-border text-foreground focus:outline-none focus:border-primary"
                    />
                    <Globe className="w-4 h-4 text-muted-foreground absolute right-2.5 top-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Personal Access Token / API Key
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="e.g. 7f8a1290bb4c98..."
                      className="w-full text-xs font-mono px-3 py-2 pr-8 rounded-xl bg-background/80 border border-border text-foreground focus:outline-none focus:border-primary"
                    />
                    <Key className="w-4 h-4 text-muted-foreground absolute right-2.5 top-2.5" />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Generate this inside your LMS user preferences under &ldquo;Security Keys&rdquo;.
                  </p>
                </div>
              </div>
            )}

            {provider.authType === 'credentials' && (
              <div className="space-y-3">
                {/* Mandatory TLS warning */}
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p>
                    <strong>Security Notice:</strong> UnifyHub requires explicit SSL/TLS encryption (Port 993).
                    We recommend generating an &ldquo;App-Specific Password&rdquo; if your institution supports it.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-foreground mb-1">
                      IMAP Host
                    </label>
                    <input
                      type="text"
                      required
                      value={imapHost}
                      onChange={(e) => setImapHost(e.target.value)}
                      placeholder="mail.university.edu"
                      className="w-full text-xs font-mono px-3 py-2 rounded-xl bg-background/80 border border-border text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Port</label>
                    <input
                      type="number"
                      required
                      value={imapPort}
                      onChange={(e) => setImapPort(e.target.value)}
                      className="w-full text-xs font-mono px-3 py-2 rounded-xl bg-background/80 border border-border text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Username / Email
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={imapUser}
                      onChange={(e) => setImapUser(e.target.value)}
                      placeholder="student_id@university.edu"
                      className="w-full text-xs font-mono px-3 py-2 pr-8 rounded-xl bg-background/80 border border-border text-foreground focus:outline-none focus:border-primary"
                    />
                    <Mail className="w-4 h-4 text-muted-foreground absolute right-2.5 top-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    App Password
                  </label>
                  <input
                    type="password"
                    required
                    value={imapPassword}
                    onChange={(e) => setImapPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full text-xs font-mono px-3 py-2 rounded-xl bg-background/80 border border-border text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-3 border-t border-border/40 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || success}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium flex items-center gap-1.5 hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Authorizing...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Authorize & Link</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
