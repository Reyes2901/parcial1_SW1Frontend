import { useQuery, useMutation } from '@tanstack/react-query';
import { generationService } from '../services/generation.service';
import { queryKeys } from '../lib/query-keys';
import { toast } from 'sonner';

export function useGeneration(id: string) {
  const generationQuery = useQuery({
    queryKey: queryKeys.generation(id),
    queryFn: () => generationService.get(id),
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      return status === 'queued' || status === 'generating' ? 2000 : false;
    },
    staleTime: 0,
    retry: 1,
  });

  const filesQuery = useQuery({
    queryKey: queryKeys.generationFiles(id),
    queryFn: () => generationService.files(id),
    enabled: generationQuery.data?.status === 'completed',
    staleTime: 0,
    retry: 1,
  });

  const patchMutation = useMutation({
    mutationFn: ({ filePath, content }: { filePath: string; content: string }) =>
      generationService.patchFile(id, filePath, content),
    onSuccess: () => toast.success('Archivo guardado.'),
    onError: () => toast.error('Error al guardar el archivo.'),
    retry: 0,
  });

  return { generationQuery, filesQuery, patchMutation };
}
