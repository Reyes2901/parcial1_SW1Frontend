import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { diagramsService } from '../services/diagrams.service';
import type { UMLModel } from '../domain/uml-model';
import type { UMLCommand } from '../domain/uml-command';
import { toast } from 'sonner';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  commands?: UMLCommand[];
  requiresConfirmation?: boolean;
}

export function useAIChat(diagramId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingCommands, setPendingCommands] = useState<UMLCommand[] | null>(null);

  const sendMutation = useMutation({
    mutationFn: ({ prompt, model }: { prompt: string; model: UMLModel }) =>
      diagramsService.aiCommand(diagramId, prompt, model),
    onSuccess: (res, vars) => {
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: res.description ?? `Propongo ${res.commands.length} operación(es).`,
        commands: res.commands,
        requiresConfirmation: res.requiresConfirmation,
      };
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        role: 'user',
        content: vars.prompt,
      }, assistantMsg]);

      if (res.requiresConfirmation) {
        setPendingCommands(res.commands);
      }
    },
    onError: () => toast.error('Error al procesar el comando de IA.'),
    retry: 0,
  });

  const undoMutation = useMutation({
    mutationFn: () => diagramsService.aiUndo(diagramId),
    onSuccess: () => toast.success('Operación de IA deshecha.'),
    onError: () => toast.error('Error al deshacer la operación.'),
    retry: 0,
  });

  const confirmCommands = useCallback(() => {
    setPendingCommands(null);
    return pendingCommands;
  }, [pendingCommands]);

  const rejectCommands = useCallback(() => {
    setPendingCommands(null);
  }, []);

  const sendMessage = useCallback((prompt: string, model: UMLModel) => {
    sendMutation.mutate({ prompt, model });
  }, [sendMutation]);

  return {
    messages,
    pendingCommands,
    isLoading: sendMutation.isPending,
    sendMessage,
    confirmCommands,
    rejectCommands,
    undo: undoMutation,
  };
}
