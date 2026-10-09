import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { diagramsService } from '../services/diagrams.service';
import { queryKeys } from '../lib/query-keys';
import type { UMLModel } from '../domain/uml-model';
import type { Diagram } from '../services/diagrams.service';
import { toast } from 'sonner';

export function useDiagram(id: string) {
  return useQuery({
    queryKey: queryKeys.diagram(id),
    queryFn: () => diagramsService.get(id),
    staleTime: Infinity,  // No refetch automático: setQueryData en onSuccess mantiene la caché fresca
    retry: 1,
  });
}

interface SavePayload {
  umlModel: UMLModel;
  version?: number;
}

export function useSaveDiagram(id: string) {
  const qc = useQueryClient();
  return useMutation<Diagram, unknown, SavePayload>({
    mutationFn: ({ umlModel, version }) => diagramsService.save(id, umlModel, version),
    onSuccess: (data) => {
      // Actualiza la caché SIN invalidar (invalidar dispara refetch → loop)
      qc.setQueryData(queryKeys.diagram(id), data);
    },
    onError: (err, _variables) => {
      const appErr = err as { status?: number; code?: string };
      if (appErr.status === 409) {
        // Sincroniza: fuerza refetch para que EditorPage actualice versionRef
        void qc.invalidateQueries({ queryKey: queryKeys.diagram(id) });
        toast.error('Conflicto de versión. Sincronizando…');
        return;
      }
      if (appErr.status === 400 && appErr.code === 'VALIDATION_ERROR') {
        toast.error('Modelo inválido. Revisa las relaciones N:M con atributos.');
      }
    },
    retry: 0,
  });
}