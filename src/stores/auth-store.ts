import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getUserFromToken, isTokenValid } from '@/utils/jwt';

interface User {
  id: number;
  email: string;
  name?: string;
}

interface Branch {
  id: string;
  name: string;
  code?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  branch: Branch | null;
  setAuth: (user: User, token: string, branch: Branch | null, rememberMe: boolean, refreshToken?: string | null) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  init: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      branch: null,
      setAuth: (user, token, branch, rememberMe, refreshToken) => {
        localStorage.removeItem('access_token');
        sessionStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        sessionStorage.removeItem('refresh_token');

        if (rememberMe) {
          localStorage.setItem('access_token', token);
          if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
        } else {
          sessionStorage.setItem('access_token', token);
          if (refreshToken) sessionStorage.setItem('refresh_token', refreshToken);
        }
        set({ user, token, branch });
      },
      logout: () => {
        localStorage.removeItem('access_token');
        sessionStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        sessionStorage.removeItem('refresh_token');
        set({ user: null, token: null, branch: null });
      },
      isAuthenticated: () => {
        const state = get();
        const storedToken = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
        if (!storedToken || !isTokenValid(storedToken)) {
          return false;
        }
        if (!state.user) {
          const user = getUserFromToken(storedToken);
          if (user) {
            set({ user, token: storedToken });
            return true;
          }
          return false;
        }
        return true;
      },
      init: () => {
        const storedToken = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
        if (storedToken && isTokenValid(storedToken)) {
          const state = get();
          if (!state.token || !state.user) {
            const user = getUserFromToken(storedToken);
            if (user) {
              set({ user, token: storedToken });
            } else {
              set({ token: storedToken });
            }
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, branch: state.branch }),
    }
  )
);
