import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProject, useProjectMembers } from '../../../../hooks/useProjects';
import { Topbar } from '../../../../components/layout/Topbar';
import { Spinner } from '../../../../components/ui/Spinner';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { Button } from '../../../../components/ui/Button';
import { Plus, ChevronLeft } from 'lucide-react';
import { cn } from '../../../../lib/cn';
import { formatRelativeDate } from '../../../../lib/format';
import { useQuery } from '@tanstack/react-query';
import { diagramsService } from '../../../../services/diagrams.service';
import { queryKeys } from '../../../../lib/query-keys';

type Tab = 'diagrams' | 'members' | 'activity' | 'settings';

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('diagrams');

  const projectQuery = useProject(projectId!);
  const membersQuery = useProjectMembers(projectId!);
  const diagramsQuery = useQuery({
    queryKey: queryKeys.diagrams(projectId!),
    queryFn: () => diagramsService.list(projectId!),
    staleTime: 30_000,
  });

  const project = projectQuery.data;
  const tabs: { id: Tab; label: string }[] = [
    { id: 'diagrams', label: 'Diagramas' },
    { id: 'members', label: 'Miembros' },
    { id: 'activity', label: 'Actividad' },
    { id: 'settings', label: 'Configuración' },
  ];

  return (
    <div className="flex flex-col h-full">
      <Topbar>
        <Link to="/projects" className="flex items-center gap-1 text-sm text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] transition-colors">
          <ChevronLeft className="h-4 w-4" />
          Proyectos
        </Link>
        <span className="text-[var(--color-border)]">/</span>
        <span className="text-sm font-medium text-[var(--color-foreground)]">{project?.name ?? '…'}</span>
      </Topbar>

      {projectQuery.isLoading && (
        <div className="flex items-center justify-center flex-1"><Spinner size="lg" /></div>
      )}
      {projectQuery.isError && (
        <ErrorState message="No se pudo cargar el proyecto." onRetry={() => projectQuery.refetch()} />
      )}
      {project && (
        <>
          {/* Tab bar */}
          <div className="flex border-b border-[var(--color-border)] bg-[var(--color-secondary)] px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px',
                  activeTab === tab.id
                    ? 'border-[var(--color-icon)] text-[var(--color-foreground)]'
                    : 'border-transparent text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'diagrams' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-[var(--color-foreground)]">Diagramas</h3>
                  <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />}>Nuevo diagrama</Button>
                </div>
                {diagramsQuery.isLoading && <Spinner />}
                {diagramsQuery.data?.map((d) => (
                  <Link
                    key={d.id}
                    to={`/editor/${d.id}`}
                    className="flex items-center justify-between p-4 mb-2 bg-[var(--color-secondary)] border border-[var(--color-border)] rounded-[var(--radius-card)] hover:shadow-[var(--shadow-md)] transition-all"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--color-foreground)]">{d.name}</p>
                      <p className="text-xs text-[var(--color-foreground-muted)]">v{d.version} · {formatRelativeDate(d.updatedAt)}</p>
                    </div>
                    <span className="text-xs text-[var(--color-icon)] font-medium">Abrir →</span>
                  </Link>
                ))}
              </div>
            )}
            {activeTab === 'members' && (
              <div>
                <h3 className="font-medium text-[var(--color-foreground)] mb-4">Miembros</h3>
                {membersQuery.data?.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-3 mb-2 bg-[var(--color-secondary)] border border-[var(--color-border)] rounded-[var(--radius-card)]">
                    <div className="h-8 w-8 rounded-full bg-[var(--color-primary-muted)] flex items-center justify-center text-sm font-medium text-[var(--color-primary)]">
                      {m.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{m.name}</p>
                      <p className="text-xs text-[var(--color-foreground-muted)]">{m.email}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-primary-muted)] text-[var(--color-primary)] font-medium">{m.role}</span>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'activity' && (
              <p className="text-sm text-[var(--color-foreground-muted)]">Historial de actividad próximamente.</p>
            )}
            {activeTab === 'settings' && (
              <p className="text-sm text-[var(--color-foreground-muted)]">Configuración del proyecto próximamente.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
