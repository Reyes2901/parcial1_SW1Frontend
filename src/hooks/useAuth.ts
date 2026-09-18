import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../stores/auth.store';
import { queryKeys } from '../lib/query-keys';

export function useAuth() {
  const { user, token, isAuthenticated, setSession, clearSession, setUser } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: (res) => {
      setSession(res);
      const next = searchParams.get('next') ?? '/projects';
      navigate(next, { replace: true });
    },
  });

  const registerMutation = useMutation({
    mutationFn: authService.register,
    onSuccess: (res) => {
      setSession(res);
      navigate('/projects', { replace: true });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: authService.logout,
    onSettled: () => {
      clearSession();
      navigate('/sign-in', { replace: true });
    },
  });

  return {
    user,
    token,
    isAuthenticated,
    setUser,
    login: loginMutation,
    register: registerMutation,
    logout: logoutMutation,
  };
}

export function useMeQuery(enabled: boolean) {
  const { setUser } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: async () => {
      const me = await authService.me();
      setUser(me);
      return me;
    },
    enabled,
    staleTime: 30_000,
    retry: 1,
  });
}
