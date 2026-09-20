import { Topbar } from '../../../components/layout/Topbar';
import { Activity } from 'lucide-react';

export default function ActivityPage() {
  return (
    <div className="flex flex-col h-full">
      <Topbar>
        <span className="text-sm font-medium text-[var(--color-foreground)]">Actividad</span>
      </Topbar>
      <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
        <div className="h-12 w-12 rounded-full bg-[var(--color-primary-muted)] flex items-center justify-center text-[var(--color-primary)] mb-4">
          <Activity className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold text-[var(--color-foreground)] mb-1">Registro de Actividad</h2>
        <p className="text-sm text-[var(--color-foreground-muted)] max-w-sm">
          El historial global de cambios y eventos de tus proyectos estará disponible pronto.
        </p>
      </div>
    </div>
  );
}
