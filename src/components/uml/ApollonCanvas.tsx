import { useRef, useEffect, useCallback, useMemo } from 'react';
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

  // ── Refs para callbacks: mantienen handleMount ESTABLE ──
  const onModelChangeRef = useRef(onModelChange);
  const onOutgoingMessageRef = useRef(onOutgoingMessage);
  const onEditorReadyRef = useRef(onEditorReady);
  const setSelectedIdRef = useRef(setSelectedId);

  useEffect(() => { onModelChangeRef.current = onModelChange; }, [onModelChange]);
  useEffect(() => { onOutgoingMessageRef.current = onOutgoingMessage; }, [onOutgoingMessage]);
  useEffect(() => { onEditorReadyRef.current = onEditorReady; }, [onEditorReady]);
  useEffect(() => { setSelectedIdRef.current = setSelectedId; }, [setSelectedId]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.setReadonly(readOnly);
    }
  }, [readOnly]);

  // ── Aplicar mensajes remotos ──
  useEffect(() => {
    if (!incomingMessage?.data || !editorRef.current) return;

    const applyRemote = (base64: string) => {
      isApplyingRemoteRef.current = true;
      try {
        editorRef.current!.receiveBroadcastedMessage(base64);
      } finally {
        setTimeout(() => { isApplyingRemoteRef.current = false; }, 800);
      }
    };
    try {
      const parsed = JSON.parse(incomingMessage.data);

      if (parsed.type === 'send-full-state-to-peer') {
        console.log('[ApollonCanvas] Servidor pide enviar estado completo');
        editorRef.current.broadcastFullState();
        return;
      }
      if (typeof parsed.diagramData === 'string') {
        applyRemote(parsed.diagramData);
        return;
      }
      return;
    } catch {
      applyRemote(incomingMessage.data);
    }
  }, [incomingMessage]);

  // ── Handshake inicial (depende de collab + emisor estable vía ref) ──
  useEffect(() => {
    if (!collaborationEnabled || !editorRef.current) return;

    const timer = setTimeout(() => {
      if (!editorRef.current) return;
      console.log('[ApollonCanvas] Enviando handshake Yjs completo');
      isApplyingRemoteRef.current = true;  // ← bloquear durante el handshake
      onOutgoingMessageRef.current?.(ApollonEditor.generateInitialSyncMessage());
      onOutgoingMessageRef.current?.(ApollonEditor.generateInitialAwarenessSyncMessage());
      editorRef.current.broadcastFullState();
      setTimeout(() => { isApplyingRemoteRef.current = false; }, 1500);  // ← liberar después
    }, 100);

    return () => clearTimeout(timer);
  }, [collaborationEnabled]);
  // ── handleMount: deps VACÍAS, todo por refs ──
  const handleMount = useCallback((editor: ApollonEditor) => {
    editorRef.current = editor;
    onEditorReadyRef.current?.(editor);

    editor.sendBroadcastMessage((base64Data: string) => {
      if (isApplyingRemoteRef.current) return;
      onOutgoingMessageRef.current?.(base64Data);
    });

    setTimeout(() => {
      const state = (editor as any).ydoc?.getMap?.('diagram');
      console.log('[ApollonCanvas] ydoc state after mount:', {
        hasYdoc: !!state,
        size: state?.size,
      });
    }, 1000);

    let lastNotifiedJson = '';
    subModelRef.current = editor.subscribeToModelChange((apollonModel) => {
      if (isApplyingRemoteRef.current) return;
      try {
        const mcu = fromApollon(apollonModel);
        const json = JSON.stringify(mcu);
        if (json === lastNotifiedJson) {
          return;  // ← cambio idéntico: NO notificar
        }
        lastNotifiedJson = json;
        console.log('[ApollonCanvas] cambio real detectado, notificando');
        onModelChangeRef.current(mcu);
      } catch (err) {
        console.error('[ApollonCanvas] fromApollon error:', err);
      }
    });

    subSelRef.current = editor.subscribeToSelectionChange((selectedIds: string[]) => {
      setSelectedIdRef.current(selectedIds[0] ?? null);
    });
  }, []); // ← ¡VACÍO!

  useEffect(() => {
    return () => {
      const editor = editorRef.current;
      if (!editor) return;
      if (subModelRef.current !== null) editor.unsubscribe(subModelRef.current);
      if (subSelRef.current !== null) editor.unsubscribe(subSelRef.current);
      editorRef.current = null;
    };
  }, []);

  // ── defaultModel memoizado para no recrear el objeto en cada render ──
  const defaultModel = useMemo(
    () => (initialModel ? toApollon(initialModel) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialModel?.id, initialModel?.version],  // NO toda la referencia
  );

  if (!initialModel) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-sm text-[var(--color-foreground-muted)]">
        Cargando diagrama...
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      <Apollon
        style={{ width: '100%', height: '100%' }}
        defaultModel={defaultModel}
        defaultType={UMLDiagramType.ClassDiagram}
        onMount={handleMount}
        collaborationEnabled={collaborationEnabled}
      />
    </div>
  );
}