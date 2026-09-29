import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string;
  role: 'student' | 'pro' | 'hybrid';
  isOnboarded: boolean;
}

const DEFAULT_DEMO_USER: UserProfile = {
  id: 'demo-user-1',
  email: 'alex.student@cornell.edu',
  fullName: 'Alex Chen',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  role: 'student',
  isOnboarded: true,
};

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isOnboardingOpen: boolean;
  isAuthModalOpen: boolean;

  // Actions
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  setOnboardingOpen: (open: boolean) => void;
  setAuthModalOpen: (open: boolean) => void;
  completeOnboarding: (data: { role: 'student' | 'pro' | 'hybrid'; primaryAccount: string }) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: DEFAULT_DEMO_USER,
  isLoading: false,
  isOnboardingOpen: false,
  isAuthModalOpen: false,

  signInWithGoogle: async () => {
    if (env.isConfigured.supabase) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) console.error('Supabase Auth error:', error.message);
    } else {
      // In Demo Mode: instantiate demo user session
      set({
        user: DEFAULT_DEMO_USER,
        isAuthModalOpen: false,
      });
    }
  },

  signOut: async () => {
    if (env.isConfigured.supabase) {
      await supabase.auth.signOut();
    }
    set({ user: null });
  },

  setOnboardingOpen: (open) => set({ isOnboardingOpen: open }),
  setAuthModalOpen: (open) => set({ isAuthModalOpen: open }),

  completeOnboarding: (data) => {
    set((state) => ({
      user: state.user
        ? { ...state.user, role: data.role, isOnboarded: true }
        : null,
      isOnboardingOpen: false,
    }));
  },
}));
