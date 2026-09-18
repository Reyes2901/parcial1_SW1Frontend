import { MoreVertical, GitBranch, Calendar, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { formatRelativeDate, plural } from '../../lib/format';
import type { Project } from '../../services/projects.service';
import { useState } from 'react';

interface ProjectCardProps {
  project: Project;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

export function ProjectCard({ project, onDelete, onRename }: ProjectCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="group relative bg-[var(--color-secondary)] rounded-[var(--radius-card)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-200 hover:border-[var(--color-border-strong)] flex flex-col overflow-hidden">
      {/* Header with primary color */}
      <div className="h-2 bg-[var(--color-primary)]" />
      <div className="p-5 flex flex-col gap-3 flex-1">
        {/* Icon + Name */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] bg-[var(--color-primary-muted)]">
              <GitBranch className="h-5 w-5 text-[var(--color-icon)]" />
            </div>
            <div className="min-w-0">
              <Link
                to={`/projects/${project.id}`}
                className="font-semibold text-[var(--color-foreground)] hover:text-[var(--color-icon)] transition-colors line-clamp-1"
              >
                {project.name}
              </Link>
              {project.description && (
                <p className="text-xs text-[var(--color-foreground-muted)] line-clamp-1 mt-0.5">{project.description}</p>
              )}
            </div>
          </div>
          <div className="relative">
            <button
              id={`project-menu-${project.id}`}
              onClick={() => setMenuOpen((o) => !o)}
              className="p-1 rounded-[var(--radius-control)] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--color-background-hover)]"
              aria-label="Opciones del proyecto"
            >
              <MoreVertical className="h-4 w-4 text-[var(--color-foreground-muted)]" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-8 z-50 bg-[var(--color-secondary)] border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-[var(--shadow-lg)] py-1 min-w-[160px]">
                  {[
                    { label: 'Abrir', action: () => {} },
                    { label: 'Renombrar', action: () => { setMenuOpen(false); const n = prompt('Nuevo nombre:', project.name); if (n) onRename(project.id, n); } },
                    { label: 'Compartir', action: () => {} },
                    { label: 'Eliminar', action: () => { setMenuOpen(false); if (confirm('¿Eliminar este proyecto?')) onDelete(project.id); }, danger: true },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={item.action}
                      className={cn(
                        'w-full text-left px-3 py-1.5 text-sm transition-colors',
                        item.danger
                          ? 'text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10'
                          : 'text-[var(--color-foreground)] hover:bg-[var(--color-background-hover)]',
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-4 text-xs text-[var(--color-foreground-muted)]">
          <span className="flex items-center gap-1">
            <GitBranch className="h-3 w-3" />
            {plural(project.diagramCount, 'diagrama')}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatRelativeDate(project.updatedAt)}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {project.members.length}
          </span>
        </div>
      </div>
      <Link to={`/projects/${project.id}`} className="absolute inset-0" aria-label={`Abrir ${project.name}`} tabIndex={-1} />
    </div>
  );
}
