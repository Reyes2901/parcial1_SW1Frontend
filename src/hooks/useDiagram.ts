import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { diagramsService } from '../services/diagrams.service';
import { queryKeys } from '../lib/query-keys';
import type { UMLModel } from '../domain/uml-model';
import { toast } from 'sonner';

export function useDiagram(id: string) {
  return useQuery({
    queryKey: queryKeys.diagram(id),
    queryFn: () => diagramsService.get(id),
    staleTime: 0,
    retry: 1,
  });
}

export function useSaveDiagram(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (model: UMLModel) => diagramsService.save(id, model),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.diagram(id) });
    },
    onError: (err: unknown) => {
      const appErr = err as { status?: number; code?: string };
      if (appErr.status === 409) {
        toast.error('Conflicto de versión. ¿Recargar la página?');
      } else if (appErr.status === 400 && appErr.code === 'VALIDATION_ERROR') {
        toast.error('Modelo inválido. Revisa las relaciones N:M con atributos.');
      }
    },
    retry: 0,
  });
}
