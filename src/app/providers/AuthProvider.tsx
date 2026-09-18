import { type ReactNode } from 'react';
import { useAuthStore } from '../../stores/auth.store';
import { useMeQuery } from '../../hooks/useAuth';

interface AuthProviderProps { children: ReactNode; }

function AuthHydration() {
  const { token } = useAuthStore();
  useMeQuery(!!token);
  return null;
}

export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <>
      <AuthHydration />
      {children}
    </>
  );
}
