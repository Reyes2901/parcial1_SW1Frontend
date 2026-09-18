import { useState } from 'react';
import { Plus, Search, FolderKanban } from 'lucide-react';
import { Topbar } from '../../../components/layout/Topbar';
import { Button } from '../../../components/ui/Button';
import { ProjectCard } from '../../../components/projects/ProjectCard';
import { CreateProjectDialog } from '../../../components/projects/CreateProjectDialog';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useProjects } from '../../../hooks/useProjects';
import { useAuthStore } from '../../../stores/auth.store';
import { plural } from '../../../lib/format';

export default function ProjectsPage() {
  const { user } = useAuthStore();
  const { query, deleteMutation } = useProjects();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');

  const projects = query.data ?? [];
  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full">
      <Topbar>
        <h1 className="text-sm font-semibold text-[var(--color-foreground)] flex-1">Proyectos</h1>
      </Topbar>

      <div className="flex-1 overflow-y-auto p-8">
        {/* Welcome header */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-[var(--color-foreground)] tracking-tight">
            Hola, {user?.name?.split(' ')[0] ?? 'Usuario'} 👋
          </h2>
          <p className="text-sm text-[var(--color-foreground-muted)] mt-1">
            {query.isSuccess ? plural(projects.length, 'proyecto') : 'Cargando proyectos…'}
          </p>
        </div>

        {/* Actions bar */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-foreground-faint)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar proyectos…"
              className="w-full pl-9 pr-3 py-2 text-sm bg-[var(--color-secondary)] border border-[var(--color-border)] rounded-[var(--radius-control)] text-[var(--color-foreground)] placeholder:text-[var(--color-foreground-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--color-icon)]"
            />
          </div>
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setCreateOpen(true)}
          >
            Nuevo proyecto
          </Button>
        </div>

        {/* Content */}
        {query.isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-36 rounded-[var(--radius-card)] bg-[var(--color-secondary)] border border-[var(--color-border)] animate-pulse" />
            ))}
          </div>
        )}
        {query.isError && (
          <ErrorState message="No se pudieron cargar los proyectos." onRetry={() => query.refetch()} />
        )}
        {query.isSuccess && filtered.length === 0 && (
          <EmptyState
            icon={<FolderKanban className="h-6 w-6" />}
            title={search ? 'Sin resultados' : 'Crea tu primer proyecto'}
            description={search ? 'Prueba con otro término de búsqueda.' : 'Organiza tus diagramas UML en proyectos.'}
            action={!search ? (
              <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
                Nuevo proyecto
              </Button>
            ) : undefined}
          />
        )}
        {query.isSuccess && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDelete={(id) => deleteMutation.mutate(id)}
                onRename={(_id, _name) => {}}
              />
            ))}
          </div>
        )}
      </div>

      <CreateProjectDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
