import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Link as LinkIcon,
  ShieldCheck,
  Key,
  Globe,
  Mail,
  Loader2,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import { AccountProvider } from '@/types';

export interface ProviderConnectConfig {
  key: AccountProvider;
  name: string;
  category: string;
  authType: 'oauth' | 'url' | 'token' | 'credentials';
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
  const { user } = useAuthStore();

  const [emailOrLabel, setEmailOrLabel] = useState('');
  const [icalUrl, setIcalUrl] = useState('');
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
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;

        if (!accessToken) {
          throw new Error('You must be signed in to connect accounts. Please sign in first.');
        }

        // Start OAuth flow via Edge Function
        const { data, error: fnError } = await supabase.functions.invoke('oauth-start', {
          body: { provider: provider.key },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (fnError) {
          // FunctionsHttpError means Edge Function replied; RelayError/FetchError means we never reached it
          const isNetworkError =
            fnError.name === 'FunctionsRelayError' ||
            fnError.name === 'FetchError' ||
            fnError.message?.toLowerCase().includes('failed to fetch') ||
            fnError.message?.toLowerCase().includes('networkerror');
          if (isNetworkError) {
            throw new Error(
              'Cannot reach the server. Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your deployment environment variables, then redeploy.'
            );
          }
          throw new Error(fnError.message || 'Failed to initialize OAuth connection');
        }

        if (!data?.url) {
          if (data?.error === 'not_configured') {
            throw new Error(
              `${provider.name} OAuth keys are not yet configured. Add GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (or equivalent) to Supabase Edge Function secrets.`
            );
          }
          throw new Error(data?.error || 'OAuth start function returned no redirect URL');
        }

        // Direct user to provider consent screen
        window.location.href = data.url;
        return;
      }

      if (provider.authType === 'url') {
        if (!icalUrl || (!icalUrl.startsWith('http://') && !icalUrl.startsWith('https://') && !icalUrl.startsWith('webcal://'))) {
          throw new Error('Please enter a valid iCal feed URL starting with https:// or webcal://');
        }

        if (!user) throw new Error('Please sign in to connect this calendar.');

        const host = icalUrl.split('/')[2] || 'calendar.ics';
        const { data: newAccount, error: dbError } = await supabase
          .from('connected_accounts')
          .insert({
            user_id: user.id,
            provider: 'ical',
            email: host,
            label: emailOrLabel || `${provider.name}`,
            encrypted_refresh_token: icalUrl,
            status: 'connected',
            last_synced_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (dbError) throw dbError;

        if (newAccount?.id) {
          supabase.functions.invoke('sync-provider', {
            body: { accountId: newAccount.id },
          }).catch(console.warn);
        }

        queryClient.invalidateQueries({ queryKey: ['connected-accounts'] });
        queryClient.invalidateQueries({ queryKey: ['items'] });
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 1200);
        return;
      }

      if (provider.authType === 'credentials') {
        if (!imapHost || !imapUser || !imapPassword) {
          throw new Error('Please fill in server host, username, and password.');
        }
      } else if (provider.authType === 'token') {
        if (!token) {
          throw new Error('Please enter your generated access token.');
        }
      }

      throw new Error(`Connection for ${provider.name} via ${provider.authType} requires provider credentials.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to connect integration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
          className="relative w-full max-w-lg rounded-2xl glass-panel border border-border/80 p-6 shadow-2xl z-10"
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
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
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
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
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

                <div className="p-3 rounded-xl bg-sky-500/5 border border-sky-500/20 text-xs text-muted-foreground flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <p>
                    Connecting will request zero write permissions. Authentication happens directly with{' '}
                    <strong className="text-foreground">{provider.name}</strong>; tokens are encrypted.
                  </p>
                </div>
              </div>
            )}

            {provider.authType === 'url' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    iCal / Timetable Subscription URL
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      required
                      value={icalUrl}
                      onChange={(e) => setIcalUrl(e.target.value)}
                      placeholder="https://courses.mit.edu/ical/user_token.ics or webcal://..."
                      className="w-full text-xs font-mono px-3 py-2 pr-8 rounded-xl bg-background/80 border border-border text-foreground focus:outline-none focus:border-primary"
                    />
                    <LinkIcon className="w-4 h-4 text-muted-foreground absolute right-2.5 top-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Feed Name / Label
                  </label>
                  <input
                    type="text"
                    value={emailOrLabel}
                    onChange={(e) => setEmailOrLabel(e.target.value)}
                    placeholder="e.g. Fall 2026 Academic Schedule"
                    className="w-full text-xs font-mono px-3 py-2 rounded-xl bg-background/80 border border-border text-foreground focus:outline-none focus:border-primary"
                  />
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
    </AnimatePresence>
  );
};
