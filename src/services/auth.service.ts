import { apiClient } from './api-client';

export interface LoginPayload { email: string; password: string; }
export interface RegisterPayload { name: string; email: string; password: string; }
export interface AuthResponse { token: string; user: { id: string; email: string; name: string; avatarUrl?: string; }; }
export interface MeResponse { id: string; email: string; name: string; avatarUrl?: string; }

export const authService = {
  login: (payload: LoginPayload) => apiClient.post<AuthResponse>('/auth/login', payload),
  register: (payload: RegisterPayload) => apiClient.post<AuthResponse>('/auth/register', payload),
  logout: () => apiClient.post<void>('/auth/logout'),
  googleAuth: (token: string) => apiClient.post<AuthResponse>('/auth/google', { token }),
  me: () => apiClient.get<MeResponse>('/users/me'),
};
