import { useRef, useEffect, useCallback } from 'react';
import { Apollon, ApollonEditor, UMLDiagramType } from '@tumaet/apollon';
import { toApollon, fromApollon } from '../../adapters/apollon-adapter';
import type { UMLModel } from '../../domain/uml-model';
import { useEditorStore } from '../../stores/editor.store';

interface ApollonCanvasProps {
  initialModel: UMLModel | undefined;
  onModelChange: (model: UMLModel) => void;
  onEditorReady?: (editor: ApollonEditor) => void;
  readOnly?: boolean;
  incomingMessage?: { data: string; id: number } | null;
  onOutgoingMessage?: (data: string) => void;
  collaborationEnabled?: boolean;
}

export function ApollonCanvas({
  initialModel,
  onModelChange,
  onEditorReady,
  readOnly = false,
  incomingMessage,
  onOutgoingMessage,
  collaborationEnabled = false,
}: ApollonCanvasProps) {
  const editorRef = useRef<ApollonEditor | null>(null);
  const isApplyingRemoteRef = useRef(false);
  const subModelRef = useRef<number | null>(null);
  const subSelRef = useRef<number | null>(null);
  const { setSelectedId } = useEditorStore();

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.setReadonly(readOnly);
    }
  }, [readOnly]);

  useEffect(() => {
    if (!incomingMessage?.data || !editorRef.current) return;

    const applyRemote = (base64: string) => {
      isApplyingRemoteRef.current = true;
      try {
        editorRef.current!.receiveBroadcastedMessage(base64);
      } catch (err) {
        console.error('[ApollonCanvas] receiveBroadcastedMessage error:', err);
      } finally {
        isApplyingRemoteRef.current = false;
      }
    };

    try {
      const parsed = JSON.parse(incomingMessage.data);

      // 1. Mensaje de control del servidor
      if (parsed.type === 'send-full-state-to-peer') {
        console.log('[ApollonCanvas] Servidor pide enviar estado completo');
        editorRef.current.broadcastFullState();
        return;
      }

      // 2. Mensaje Yjs envuelto en { diagramData: base64 } — DESEMPAQUETAR
      if (typeof parsed.diagramData === 'string') {
        applyRemote(parsed.diagramData);
        return;
      }

      // 3. JSON desconocido: ignorar
      return;
    } catch {
      // No es JSON: es Yjs base64 puro → pasarlo directo
      applyRemote(incomingMessage.data);
    }
  }, [incomingMessage]);

  useEffect(() => {
    if (!collaborationEnabled || !editorRef.current || !onOutgoingMessage) return;

    // Esperar a que el WS esté realmente listo antes de enviar el handshake
    const timer = setTimeout(() => {
      if (!editorRef.current) return;
      console.log('[ApollonCanvas] Enviando handshake Yjs completo');
      onOutgoingMessage(ApollonEditor.generateInitialSyncMessage());
      onOutgoingMessage(ApollonEditor.generateInitialAwarenessSyncMessage());
      editorRef.current.broadcastFullState();
    }, 100);

    return () => clearTimeout(timer);
  }, [collaborationEnabled, onOutgoingMessage]);

  const handleMount = useCallback(
    (editor: ApollonEditor) => {
      editorRef.current = editor;
      onEditorReady?.(editor);

      if (onOutgoingMessage) {
        editor.sendBroadcastMessage((base64Data: string) => {
          console.log('[ApollonCanvas] sendBroadcastMessage fired, length:', base64Data.length);
          onOutgoingMessage(base64Data);
        });
      }

      setTimeout(() => {
        const state = (editor as any).ydoc?.getMap?.('diagram');
        console.log('[ApollonCanvas] ydoc state after mount:', {
          hasYdoc: !!state,
          size: state?.size,
        });
      }, 1000);

      subModelRef.current = editor.subscribeToModelChange((apollonModel) => {
        if (isApplyingRemoteRef.current) return; // ignorar cambios remotos
        try {
          const mcu = fromApollon(apollonModel);
          onModelChange(mcu);
        } catch (err) {
          console.error('[ApollonCanvas] fromApollon error:', err);
        }
      });

      subSelRef.current = editor.subscribeToSelectionChange((selectedIds: string[]) => {
        setSelectedId(selectedIds[0] ?? null);
      });
    },
    [onModelChange, onEditorReady, setSelectedId, onOutgoingMessage],
  );

  useEffect(() => {
    return () => {
      const editor = editorRef.current;
      if (!editor) return;
      if (subModelRef.current !== null) editor.unsubscribe(subModelRef.current);
      if (subSelRef.current !== null) editor.unsubscribe(subSelRef.current);
      editorRef.current = null;
    };
  }, []);

  if (!initialModel) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-sm text-[var(--color-foreground-muted)]">
        Cargando diagrama...
      </div>
    );
  }

  // Patrón oficial React Flow: absolute inset-0 dentro de un padre relative
  return (
    <div className="absolute inset-0">
      <Apollon
        style={{ width: '100%', height: '100%' }}
        defaultModel={toApollon(initialModel)}
        defaultType={UMLDiagramType.ClassDiagram}
        onMount={handleMount}
        collaborationEnabled={collaborationEnabled}
      />
    </div>
  );
}