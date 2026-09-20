import { Topbar } from '../../../components/layout/Topbar';
import { LayoutTemplate } from 'lucide-react';

export default function TemplatesPage() {
  return (
    <div className="flex flex-col h-full">
      <Topbar>
        <span className="text-sm font-medium text-[var(--color-foreground)]">Plantillas</span>
      </Topbar>
      <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
        <div className="h-12 w-12 rounded-full bg-[var(--color-primary-muted)] flex items-center justify-center text-[var(--color-primary)] mb-4">
          <LayoutTemplate className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold text-[var(--color-foreground)] mb-1">Plantillas UML</h2>
        <p className="text-sm text-[var(--color-foreground-muted)] max-w-sm">
          Esta función estará disponible próximamente. Podrás elegir entre plantillas prediseñadas para acelerar tu desarrollo.
        </p>
      </div>
    </div>
  );
}
