import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import { queryClient } from '@/lib/queryClient';
import { useAppStore } from '@/store/useAppStore';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string;
  role: 'student' | 'pro' | 'hybrid';
  isOnboarded: boolean;
}

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isInitialized: boolean;
  isOnboardingOpen: boolean;
  isAuthModalOpen: boolean;
  authError: string | null;

  // Actions
  initializeAuth: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithGitHub: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  setOnboardingOpen: (open: boolean) => void;
  setAuthModalOpen: (open: boolean) => void;
  setAuthError: (error: string | null) => void;
  completeOnboarding: (data: { role: 'student' | 'pro' | 'hybrid'; primaryAccount: string }) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isInitialized: false,
  isOnboardingOpen: false,
  isAuthModalOpen: false,
  authError: null,

  initializeAuth: async () => {
    try {
      set({ isLoading: true });
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Session retrieval error:', error.message);
        set({ user: null, isLoading: false, isInitialized: true });
        return;
      }

      if (!session?.user) {
        set({ user: null, isLoading: false, isInitialized: true });
        return;
      }

      const authUser = session.user;
      
      let profile = null;
      try {
        const { data: pData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();
        profile = pData;
      } catch (pErr) {
        console.warn('Profiles fetch non-fatal warning:', pErr);
      }

      const userProfile: UserProfile = {
        id: authUser.id,
        email: authUser.email || '',
        fullName:
          profile?.full_name ||
          authUser.user_metadata?.full_name ||
          authUser.user_metadata?.name ||
          (authUser.email ? authUser.email.split('@')[0] : 'User'),
        avatarUrl:
          profile?.avatar_url ||
          authUser.user_metadata?.avatar_url ||
          authUser.user_metadata?.picture ||
          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(authUser.email || 'U')}`,
        role: (profile?.role as 'student' | 'pro' | 'hybrid') || 'student',
        isOnboarded: profile?.is_onboarded ?? false,
      };

      set({
        user: userProfile,
        isLoading: false,
        isInitialized: true,
        isOnboardingOpen: !userProfile.isOnboarded,
      });
    } catch (err) {
      console.error('initializeAuth exception:', err);
      set({ user: null, isLoading: false, isInitialized: true });
    }
  },

  signInWithGoogle: async () => {
    try {
      set({ isLoading: true, authError: null });
      const callbackUrl = `${env.appUrl}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (error) {
        set({ authError: error.message, isLoading: false });
        return { error };
      }

      return { error: null };
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      set({ authError: e.message, isLoading: false });
      return { error: e };
    }
  },

  signInWithGitHub: async () => {
    try {
      set({ isLoading: true, authError: null });
      const callbackUrl = `${env.appUrl}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: callbackUrl,
        },
      });

      if (error) {
        set({ authError: error.message, isLoading: false });
        return { error };
      }

      return { error: null };
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      set({ authError: e.message, isLoading: false });
      return { error: e };
    }
  },

  signOut: async () => {
    try {
      set({ isLoading: true });
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Sign out warning:', err);
    } finally {
      queryClient.clear();
      useAppStore.setState({
        items: [],
        accounts: [],
        briefing: null,
        activeItemId: null,
        searchQuery: '',
      });
      set({ user: null, isLoading: false, isOnboardingOpen: false });
    }
  },

  setOnboardingOpen: (open) => set({ isOnboardingOpen: open }),
  setAuthModalOpen: (open) => set({ isAuthModalOpen: open }),
  setAuthError: (error) => set({ authError: error }),

  completeOnboarding: async (data) => {
    const currentUser = get().user;
    if (currentUser) {
      try {
        await supabase
          .from('profiles')
          .update({
            role: data.role,
            is_onboarded: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentUser.id);
      } catch (err) {
        console.warn('Could not persist onboarding state to profiles table:', err);
      }

      set({
        user: { ...currentUser, role: data.role, isOnboarded: true },
        isOnboardingOpen: false,
      });
    }
  },
}));
