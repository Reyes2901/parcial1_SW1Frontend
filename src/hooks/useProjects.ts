import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsService, type CreateProjectPayload } from '../services/projects.service';
import { queryKeys } from '../lib/query-keys';
import { toast } from 'sonner';

export function useProjects() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.projects,
    queryFn: projectsService.list,
    staleTime: 30_000,
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateProjectPayload) => projectsService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects });
      toast.success('Proyecto creado correctamente.');
    },
    onError: () => toast.error('Error al crear el proyecto.'),
    retry: 0,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects });
      toast.success('Proyecto eliminado.');
    },
    onError: () => toast.error('Error al eliminar el proyecto.'),
    retry: 0,
  });

  return { query, createMutation, deleteMutation };
}

export function useProject(id: string) {
  return useQuery({
    queryKey: queryKeys.project(id),
    queryFn: () => projectsService.get(id),
    staleTime: 30_000,
    retry: 1,
  });
}

export function useProjectMembers(id: string) {
  return useQuery({
    queryKey: queryKeys.projectMembers(id),
    queryFn: () => projectsService.getMembers(id),
    staleTime: 30_000,
    retry: 1,
  });
}
