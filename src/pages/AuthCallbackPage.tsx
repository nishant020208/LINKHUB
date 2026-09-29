import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const { initializeAuth } = useAuthStore();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthExchange = async () => {
      try {
        // Inspect query params for explicit error from OAuth provider
        const params = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        const error = params.get('error') || hashParams.get('error');
        const errorDescription = params.get('error_description') || hashParams.get('error_description');

        if (error) {
          throw new Error(errorDescription || error);
        }

        // Supabase client automatically parses tokens from URL hash/code
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!session) {
          // If session is not immediately available, await onAuthStateChange event
          const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            if (event === 'SIGNED_IN' && newSession) {
              authListener.subscription.unsubscribe();
              await initializeAuth();
              navigate('/', { replace: true });
            }
          });

          // Timeout fallback in case OAuth was cancelled or hung
          setTimeout(() => {
            authListener.subscription.unsubscribe();
            if (!session) {
              setErrorMessage('Authentication timed out or was cancelled. Please try again.');
            }
          }, 6000);
          return;
        }

        // Initialize user store with profile
        await initializeAuth();
        navigate('/', { replace: true });
      } catch (err: unknown) {
        console.error('Auth callback failure:', err);
        const msg = err instanceof Error ? err.message : 'Failed to complete authentication';
        setErrorMessage(msg);
      }
    };

    handleAuthExchange();
  }, [navigate, initializeAuth]);

  if (errorMessage) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 rounded-3xl glass-panel border border-rose-500/30 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>

          <h2 className="font-heading font-bold text-xl text-foreground">Authentication Error</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">{errorMessage}</p>

          <button
            onClick={() => navigate('/login', { replace: true })}
            className="w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-medium text-xs flex items-center justify-center gap-2 hover:bg-primary/90 transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Login</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="max-w-sm w-full p-8 rounded-3xl glass-panel border border-border/60 text-center space-y-4 shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mx-auto">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>

        <h3 className="font-heading font-bold text-lg text-foreground">Signing You In</h3>
        <p className="text-xs text-muted-foreground font-mono">
          Finalizing secure session tokens and preparing your command center...
        </p>
      </div>
    </div>
  );
};
