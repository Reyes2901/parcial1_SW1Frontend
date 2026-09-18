import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  token: string | null; // en memoria — NO persistir en localStorage
  isAuthenticated: boolean;
  setSession: (data: { token: string; user: User }) => void;
  setUser: (user: User) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  setSession: ({ token, user }) =>
    set({ token, user, isAuthenticated: true }),
  setUser: (user) => set({ user }),
  clearSession: () => set({ user: null, token: null, isAuthenticated: false }),
}));
