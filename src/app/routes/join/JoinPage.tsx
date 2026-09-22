import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../../services/api-client';
import { Spinner } from '../../../components/ui/Spinner';
import { ErrorState } from '../../../components/ui/ErrorState';
import { useAuthStore } from '../../../stores/auth.store';

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      // Guardar el token para después del login
      sessionStorage.setItem('pendingInviteToken', token ?? '');
      navigate(`/sign-in?next=${encodeURIComponent(`/join/${token}`)}`);
      return;
    }

    apiClient
      .post<{ projectId: string }>(`/projects/join/${token}`)
      .then((res) => {
        sessionStorage.removeItem('pendingInviteToken');
        navigate(`/projects/${res.projectId}`);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Error al aceptar la invitación');
      });
  }, [token, isAuthenticated, navigate]);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--color-background)]">
        <ErrorState
          title="Invitación inválida"
          message={error}
          onRetry={() => navigate('/projects')}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-[var(--color-background)]">
      <div className="flex flex-col items-center gap-4 text-center">
        <Spinner size="lg" />
        <p className="text-sm text-[var(--color-foreground-muted)]">Uniéndote al proyecto…</p>
      </div>
    </div>
  );
}
