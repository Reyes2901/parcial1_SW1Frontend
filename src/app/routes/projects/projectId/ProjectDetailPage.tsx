import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useProject, useProjectMembers } from '../../../../hooks/useProjects';
import { Topbar } from '../../../../components/layout/Topbar';
import { Spinner } from '../../../../components/ui/Spinner';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { Button } from '../../../../components/ui/Button';
import { Modal } from '../../../../components/ui/Modal';
import { Input } from '../../../../components/ui/Input';
import { Select } from '../../../../components/ui/Select';
import {
  Plus,
  ChevronLeft,
  Network,
  MoreVertical,
  Pencil,
  Copy,
  Share2,
  Trash2,
  ExternalLink,
  Users,
} from 'lucide-react';
import { cn } from '../../../../lib/cn';
import { formatRelativeDate } from '../../../../lib/format';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { diagramsService, type Diagram } from '../../../../services/diagrams.service';
import { queryKeys } from '../../../../lib/query-keys';
import { toast } from 'sonner';
import { apiClient } from '../../../../services/api-client';

type Tab = 'diagrams' | 'members' | 'activity' | 'settings';

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('diagrams');
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Create Modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [newDiagramName, setNewDiagramName] = useState('');

  // Rename Modal state
  const [renameDiagram, setRenameDiagram] = useState<Diagram | null>(null);
  const [renameName, setRenameName] = useState('');

  // Share Modal state (compartir proyecto con invitación real)
  const [shareOpen, setShareOpen] = useState(false);
  const [shareRole, setShareRole] = useState<'editor' | 'viewer'>('editor');
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  // Share diagram (opens project share modal)
  const [shareDiagram, setShareDiagram] = useState<Diagram | null>(null);

  // Delete Modal state
  const [deleteDiagram, setDeleteDiagram] = useState<Diagram | null>(null);

  // Active dropdown card ID
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const projectQuery = useProject(projectId!);
  const membersQuery = useProjectMembers(projectId!);
  const diagramsQuery = useQuery({
    queryKey: queryKeys.diagrams(projectId!),
    queryFn: () => diagramsService.list(projectId!),
    staleTime: 30_000,
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => diagramsService.duplicate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.diagrams(projectId!) });
      qc.invalidateQueries({ queryKey: queryKeys.projects });
      toast.success('Diagrama duplicado correctamente');
    },
    onError: (err: unknown) => {
      toast.error((err as Error)?.message || 'Error al duplicar el diagrama');
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => diagramsService.rename(id, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.diagrams(projectId!) });
      qc.invalidateQueries({ queryKey: queryKeys.projects });
      toast.success('Diagrama renombrado');
      setRenameDiagram(null);
    },
    onError: (err: unknown) => {
      toast.error((err as Error)?.message || 'Error al renombrar el diagrama');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => diagramsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.diagrams(projectId!) });
      qc.invalidateQueries({ queryKey: queryKeys.projects });
      toast.success('Diagrama eliminado');
      setDeleteDiagram(null);
    },
    onError: (err: unknown) => {
      toast.error((err as Error)?.message || 'Error al eliminar el diagrama');
    },
  });

  const project = projectQuery.data;
  const tabs: { id: Tab; label: string }[] = [
    { id: 'diagrams', label: 'Diagramas' },
    { id: 'members', label: 'Miembros' },
    { id: 'activity', label: 'Actividad' },
    { id: 'settings', label: 'Configuración' },
  ];

  return (
    <div className="flex flex-col h-full" onClick={() => setOpenDropdownId(null)}>
      <Topbar>
        <Link
          to="/projects"
          className="flex items-center gap-1 text-sm text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Proyectos
        </Link>
        <span className="text-[var(--color-border)]">/</span>
        <span className="text-sm font-medium text-[var(--color-foreground)]">{project?.name ?? '…'}</span>
      </Topbar>

      {projectQuery.isLoading && (
        <div className="flex items-center justify-center flex-1">
          <Spinner size="lg" />
        </div>
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
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-lg text-[var(--color-foreground)]">Diagramas</h3>
                  <Button
                    size="sm"
                    leftIcon={<Plus className="h-3.5 w-3.5" />}
                    onClick={() => {
                      setNewDiagramName('');
                      setCreateOpen(true);
                    }}
                  >
                    Nuevo diagrama
                  </Button>
                </div>

                {diagramsQuery.isLoading && <Spinner />}

                {diagramsQuery.data && diagramsQuery.data.length === 0 && (
                  <div className="text-center py-12 border border-dashed border-[var(--color-border)] rounded-[var(--radius-card)] bg-[var(--color-secondary)]">
                    <Network className="h-10 w-10 mx-auto text-[var(--color-foreground-faint)] mb-3" />
                    <p className="text-sm font-medium text-[var(--color-foreground)] mb-1">No hay diagramas en este proyecto.</p>
                    <p className="text-xs text-[var(--color-foreground-muted)] mb-4">Crea un diagrama UML para empezar a diseñar tu modelo.</p>
                    <Button
                      size="sm"
                      leftIcon={<Plus className="h-3.5 w-3.5" />}
                      onClick={() => {
                        setNewDiagramName('');
                        setCreateOpen(true);
                      }}
                    >
                      Crear primer diagrama
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {diagramsQuery.data?.map((d) => {
                    const classCount = d.umlModel?.classes?.length ?? 0;
                    const relationCount = d.umlModel?.relations?.length ?? 0;
                    const isDropdownOpen = openDropdownId === d.id;

                    return (
                      <div
                        key={d.id}
                        className="relative group bg-[var(--color-secondary)] border border-[var(--color-border)] rounded-[var(--radius-card)] p-4 flex flex-col justify-between hover:shadow-[var(--shadow-md)] transition-all"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 rounded-md bg-[var(--color-primary-muted)] text-[var(--color-icon)]">
                                <Network className="h-5 w-5" />
                              </div>
                              <div>
                                <h4
                                  onClick={() => navigate(`/editor/${d.id}`)}
                                  className="text-sm font-semibold text-[var(--color-foreground)] cursor-pointer hover:text-[var(--color-icon)] transition-colors line-clamp-1"
                                >
                                  {d.name}
                                </h4>
                                <span className="text-xs text-[var(--color-foreground-muted)]">
                                  v{d.version} · {formatRelativeDate(d.updatedAt)}
                                </span>
                              </div>
                            </div>

                            {/* 3 points button */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdownId(isDropdownOpen ? null : d.id);
                                }}
                                className="p-1 rounded-[var(--radius-control)] text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-background-hover)] transition-colors"
                                aria-label="Opciones"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>

                              {/* Dropdown Menu */}
                              {isDropdownOpen && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute right-0 top-7 z-20 w-44 bg-[var(--color-secondary)] border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-[var(--shadow-lg)] py-1 flex flex-col text-xs"
                                >
                                  <button
                                    onClick={() => {
                                      setOpenDropdownId(null);
                                      navigate(`/editor/${d.id}`);
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--color-background-hover)] text-[var(--color-foreground)] transition-colors"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5 text-[var(--color-icon)]" />
                                    Abrir
                                  </button>
                                  <button
                                    onClick={() => {
                                      setOpenDropdownId(null);
                                      setRenameDiagram(d);
                                      setRenameName(d.name);
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--color-background-hover)] text-[var(--color-foreground)] transition-colors"
                                  >
                                    <Pencil className="h-3.5 w-3.5 text-[var(--color-icon)]" />
                                    Renombrar
                                  </button>
                                  <button
                                    onClick={() => {
                                      setOpenDropdownId(null);
                                      duplicateMutation.mutate(d.id);
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--color-background-hover)] text-[var(--color-foreground)] transition-colors"
                                  >
                                    <Copy className="h-3.5 w-3.5 text-[var(--color-icon)]" />
                                    Duplicar
                                  </button>
                                  <button
                                    onClick={() => {
                                      setOpenDropdownId(null);
                                      setShareDiagram(d);
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--color-background-hover)] text-[var(--color-foreground)] transition-colors"
                                  >
                                    <Share2 className="h-3.5 w-3.5 text-[var(--color-icon)]" />
                                    Compartir
                                  </button>
                                  <div className="my-1 border-t border-[var(--color-border)]" />
                                  <button
                                    onClick={() => {
                                      setOpenDropdownId(null);
                                      setDeleteDiagram(d);
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--color-background-hover)] text-[var(--color-danger)] transition-colors font-medium"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Eliminar
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)] mt-2">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-primary-muted)] text-[var(--color-primary)]">
                              {classCount} {classCount === 1 ? 'clase' : 'clases'}
                            </span>
                            {relationCount > 0 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-background-hover)] text-[var(--color-foreground-muted)]">
                                {relationCount} {relationCount === 1 ? 'relación' : 'relaciones'}
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/editor/${d.id}`)}
                            className="text-xs text-[var(--color-icon)] hover:text-[var(--color-primary)] font-medium p-0"
                          >
                            Abrir →
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'members' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg text-[var(--color-foreground)]">Miembros</h3>
                  <Button
                    size="sm"
                    leftIcon={<Users className="h-3.5 w-3.5" />}
                    onClick={() => {
                      setShareLink(null);
                      setShareRole('editor');
                      setShareOpen(true);
                    }}
                  >
                    Invitar
                  </Button>
                </div>
                {membersQuery.isLoading && <Spinner />}
                {membersQuery.data?.length === 0 && (
                  <p className="text-sm text-[var(--color-foreground-muted)]">No hay miembros aún.</p>
                )}
                {membersQuery.data?.map((m) => {
                  // El backend devuelve { user: { name, email, avatarUrl }, role }
                  const name = (m as unknown as { user?: { name?: string; email?: string } }).user?.name ?? m.name ?? 'Sin nombre';
                  const email = (m as unknown as { user?: { email?: string } }).user?.email ?? m.email ?? '—';
                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 p-3 mb-2 bg-[var(--color-secondary)] border border-[var(--color-border)] rounded-[var(--radius-card)]"
                    >
                      <div className="h-8 w-8 rounded-full bg-[var(--color-primary-muted)] flex items-center justify-center text-sm font-medium text-[var(--color-primary)]">
                        {(name).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{name}</p>
                        <p className="text-xs text-[var(--color-foreground-muted)]">{email}</p>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--color-primary-muted)] text-[var(--color-primary)] font-medium">
                        {m.role}
                      </span>
                    </div>
                  );
                })}
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

      {/* Modal: Crear Diagrama */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nuevo diagrama"
        description="Elige un nombre para el diagrama."
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newDiagramName.trim()) return;
            try {
              const created = await diagramsService.create(projectId!, {
                name: newDiagramName.trim(),
              });
              qc.invalidateQueries({ queryKey: queryKeys.diagrams(projectId!) });
              qc.invalidateQueries({ queryKey: queryKeys.projects });
              setCreateOpen(false);
              setNewDiagramName('');
              toast.success('Diagrama creado exitosamente');
              navigate(`/editor/${created.id}`);
            } catch (err) {
              toast.error((err as Error)?.message || 'Error al crear el diagrama');
            }
          }}
          className="flex flex-col gap-4"
        >
          <Input
            label="Nombre del diagrama"
            value={newDiagramName}
            onChange={(e) => setNewDiagramName(e.target.value)}
            autoFocus
            placeholder="Ej. Sistema de pedidos"
          />
          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!newDiagramName.trim()}>
              Crear diagrama
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Renombrar Diagrama */}
      <Modal
        open={!!renameDiagram}
        onClose={() => setRenameDiagram(null)}
        title="Renombrar diagrama"
        description="Ingresa el nuevo nombre para el diagrama."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!renameDiagram || !renameName.trim()) return;
            renameMutation.mutate({ id: renameDiagram.id, name: renameName.trim() });
          }}
          className="flex flex-col gap-4"
        >
          <Input
            label="Nombre del diagrama"
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="secondary" onClick={() => setRenameDiagram(null)}>
              Cancelar
            </Button>
            <Button type="submit" loading={renameMutation.isPending} disabled={!renameName.trim()}>
              Guardar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Compartir Proyecto (invitación real) */}
      <Modal
        open={shareOpen || !!shareDiagram}
        onClose={() => { setShareOpen(false); setShareDiagram(null); setShareLink(null); }}
        title="Invitar al proyecto"
        description="Genera un enlace de invitación para que otros usuarios se unan al proyecto."
      >
        <div className="flex flex-col gap-4">
          {!shareLink ? (
            <>
              <Select
                label="Rol"
                value={shareRole}
                onChange={(e) => setShareRole(e.target.value as 'editor' | 'viewer')}
                options={[
                  { value: 'editor', label: 'Editor — puede editar diagramas' },
                  { value: 'viewer', label: 'Viewer — solo lectura' },
                ]}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => { setShareOpen(false); setShareDiagram(null); }}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  loading={shareLoading}
                  leftIcon={<Share2 className="h-4 w-4" />}
                  onClick={async () => {
                    if (!projectId) return;
                    setShareLoading(true);
                    try {
                      const res = await apiClient.post<{ token: string }>(
                        `/projects/${projectId}/invitations`,
                        { role: shareRole }
                      );
                      setShareLink(`${window.location.origin}/join/${res.token}`);
                    } catch (err) {
                      toast.error((err as Error)?.message || 'Error al generar el link');
                    } finally {
                      setShareLoading(false);
                    }
                  }}
                >
                  Generar enlace
                </Button>
              </div>
            </>
          ) : (
            <>
              <Input label="Enlace de invitación" value={shareLink} readOnly />
              <p className="text-xs text-[var(--color-foreground-muted)]">
                Este enlace permite unirse al proyecto con rol <strong>{shareRole}</strong>.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => { setShareOpen(false); setShareDiagram(null); setShareLink(null); }}
                >
                  Cerrar
                </Button>
                <Button
                  type="button"
                  leftIcon={<Copy className="h-4 w-4" />}
                  onClick={() => {
                    navigator.clipboard.writeText(shareLink);
                    toast.success('Link de invitación copiado');
                  }}
                >
                  Copiar enlace
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Modal: Eliminar Diagrama */}
      <Modal
        open={!!deleteDiagram}
        onClose={() => setDeleteDiagram(null)}
        title="Eliminar diagrama"
        description={`¿Estás seguro de que deseas eliminar "${deleteDiagram?.name}"? Esta acción no se puede deshacer.`}
      >
        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="secondary" onClick={() => setDeleteDiagram(null)}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            loading={deleteMutation.isPending}
            onClick={() => {
              if (deleteDiagram) deleteMutation.mutate(deleteDiagram.id);
            }}
          >
            Eliminar
          </Button>
        </div>
      </Modal>
    </div>
  );
}
