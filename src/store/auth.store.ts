import { create } from 'zustand';

import type {
  AuthSession,
  PasswordLoginInput,
  RegisterUserInput,
} from '@/src/types/pb-auth.types';
import { pb } from '@/src/lib/pb';
import { UsersRecord } from '../types/pb-collections.types';
import { createAuthService } from '../services/pb-auth.service';
import { AuthResult } from '../types/pb-auth.types';

type AuthStatus =
  | 'idle'
  | 'initializing'
  | 'anonymous'
  | 'loading'
  | 'mfa_required'
  | 'authenticated';

interface AuthStoreState {
  initialized: boolean;
  status: AuthStatus;
  user: UsersRecord | null;
  token: string;
  error: string | null;
  mfaId: string | null;
  otpCooldown: number;
}

interface AuthStoreActions {
  initialize: () => void;
  clearError: () => void;
  clearMfa: () => void;
  loginWithPassword: (input: PasswordLoginInput) => Promise<AuthResult<'users'>>;
  loginWithGoogle: () => Promise<void>;
  register: (input: RegisterUserInput) => Promise<AuthSession<'users'>>;
  logout: () => void;
  refreshSession: () => Promise<AuthSession<'users'>>;
  requestPasswordReset: (email: string) => Promise<void>;
  requestEmailOtp: (email: string) => Promise<void>;
  verifyEmailOtp: (code: string) => Promise<AuthSession<'users'>>;
}

type AuthStore = AuthStoreState & AuthStoreActions;

const authService = createAuthService(pb, 'users');

let unsubscribeAuthChange: (() => void) | null = null;

function normalizeError(error: unknown, fallback: string): string {
  if (error && typeof error === 'object') {
    const maybe = error as {
      message?: string;
      response?: {
        message?: string;
        data?: Record<string, { message?: string }>;
      };
      data?: {
        message?: string;
        data?: Record<string, { message?: string }>;
      };
    };

    const fieldError =
      maybe.response?.data &&
      Object.values(maybe.response.data)[0] &&
      Object.values(maybe.response.data)[0]?.message;

    return (
      fieldError ||
      maybe.response?.message ||
      maybe.data?.message ||
      maybe.message ||
      fallback
    );
  }

  return fallback;
}

function applySession(
  set: (partial: Partial<AuthStoreState>) => void,
  session: AuthSession<'users'>,
): void {
  set({
    initialized: true,
    status: session.isValid ? 'authenticated' : 'anonymous',
    user: session.user,
    token: session.token,
    error: null,
  });
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  initialized: false,
  status: 'idle',
  user: null,
  token: '',
  error: null,
  mfaId: null,
  otpCooldown: 0,

  initialize: () => {
    if (get().initialized) {
      return;
    }

    set({ status: 'initializing' });
    applySession(set, authService.session);

    if (!unsubscribeAuthChange) {
      unsubscribeAuthChange = authService.onAuthChange((event) => {
        set({
          initialized: true,
          status: event.isValid ? 'authenticated' : 'anonymous',
          user: event.user as UsersRecord | null,
          token: event.token,
          error: null,
        });
      });
    }
  },

  clearError: () => set({ error: null }),

  clearMfa: () => set({ mfaId: null, status: authService.isAuthenticated() ? 'authenticated' : 'anonymous' }),

  loginWithPassword: async (input) => {
    set({ status: 'loading', error: null, mfaId: null });

    try {
      const result = await authService.loginWithPassword(input);

      if (result.status === 'mfa_required') {
        set({
          initialized: true,
          status: 'mfa_required',
          mfaId: result.challenge.mfaId,
          error: null,
        });

        return result;
      }

      applySession(set, result.session);
      set({ mfaId: null });
      return result;
    } catch (error) {
      set({
        status: authService.isAuthenticated() ? 'authenticated' : 'anonymous',
        error: normalizeError(error, 'Unable to sign in.'),
      });
      throw error;
    }
  },

  loginWithGoogle: async () => {
    set({ status: 'loading', error: null });

    try {
      await authService.loginWithOAuth2('google');
    } catch (error) {
      set({
        status: authService.isAuthenticated() ? 'authenticated' : 'anonymous',
        error: normalizeError(error, 'Google sign-in failed.'),
      });
      throw error;
    }
  },

  register: async (input) => {
    set({ status: 'loading', error: null, mfaId: null });

    try {
      await authService.register(input);
      const result = await authService.loginWithPassword({
        identity: input.email,
        password: input.password,
      });

      if (result.status !== 'authenticated') {
        throw new Error('Registration succeeded but sign in requires MFA.');
      }

      applySession(set, result.session);
      return result.session;
    } catch (error) {
      set({
        status: authService.isAuthenticated() ? 'authenticated' : 'anonymous',
        error: normalizeError(error, 'Registration failed.'),
      });
      throw error;
    }
  },

  logout: () => {
    authService.logout();
    set({
      initialized: true,
      status: 'anonymous',
      user: null,
      token: '',
      error: null,
      mfaId: null,
      otpCooldown: 0,
    });
  },

  refreshSession: async () => {
    set({ status: 'loading', error: null });

    try {
      const session = await authService.refresh();
      applySession(set, session);
      return session;
    } catch (error) {
      authService.logout();
      set({
        initialized: true,
        status: 'anonymous',
        user: null,
        token: '',
        error: normalizeError(error, 'Session refresh failed.'),
      });
      throw error;
    }
  },

  requestPasswordReset: async (email) => {
    set({ status: 'loading', error: null });

    try {
      await authService.requestPasswordReset(email);
      set({
        status: authService.isAuthenticated() ? 'authenticated' : 'anonymous',
      });
    } catch (error) {
      set({
        status: authService.isAuthenticated() ? 'authenticated' : 'anonymous',
        error: normalizeError(error, 'Failed to send password reset email.'),
      });
      throw error;
    }
  },

  requestEmailOtp: async (email) => {
    set({ status: 'loading', error: null });

    try {
      const result = await authService.requestOtp({ email });
      set({
        status: 'mfa_required',
        mfaId: result.otpId,
        otpCooldown: 60,
      });
    } catch (error) {
      set({
        status: 'mfa_required',
        error: normalizeError(error, 'Failed to send OTP.'),
      });
      throw error;
    }
  },

  verifyEmailOtp: async (code) => {
    const { mfaId } = get();

    if (!mfaId) {
      throw new Error('No OTP challenge is active.');
    }

    set({ status: 'loading', error: null });

    try {
      const session = await authService.verifyOtp({
        otpId: mfaId,
        password: code,
      });
      applySession(set, session);
      set({ mfaId: null, otpCooldown: 0 });
      return session;
    } catch (error) {
      set({
        status: 'mfa_required',
        error: normalizeError(error, 'Invalid code.'),
      });
      throw error;
    }
  },
}));

if (typeof window !== 'undefined') {
  window.setInterval(() => {
    const state = useAuthStore.getState();

    if (state.otpCooldown > 0) {
      useAuthStore.setState({ otpCooldown: Math.max(0, state.otpCooldown - 1) });
    }
  }, 1000);
}
