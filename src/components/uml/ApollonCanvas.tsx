import { memo, useRef, useEffect, useCallback, useMemo } from 'react';
import { Apollon, ApollonEditor, UMLDiagramType } from '@tumaet/apollon';
import { toApollon, fromApollon } from '../../adapters/apollon-adapter';
import type { UMLModel } from '../../domain/uml-model';
import { useEditorStore } from '../../stores/editor.store';

const CANVAS_STYLE: React.CSSProperties = { width: '100%', height: '100%' };

interface ApollonCanvasProps {
  initialModel: UMLModel | undefined;
  onModelChange: (model: UMLModel) => void;
  onEditorReady?: (editor: ApollonEditor) => void;
  readOnly?: boolean;
  incomingMessage?: { data: string; id: number } | null;
  onOutgoingMessage?: (data: string) => void;
  collaborationEnabled?: boolean;
}

function ApollonCanvasInner({
  initialModel,
  onModelChange,
  onEditorReady,
  readOnly = false,
  incomingMessage,
  onOutgoingMessage,
  collaborationEnabled = false,
}: ApollonCanvasProps) {
  const editorRef = useRef<ApollonEditor | null>(null);
  const subModelRef = useRef<number | null>(null);
  const subSelRef = useRef<number | null>(null);
  const unsubBroadcastRef = useRef<(() => void) | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { setSelectedId } = useEditorStore();

  const onModelChangeRef = useRef(onModelChange);
  const onOutgoingMessageRef = useRef(onOutgoingMessage);
  const onEditorReadyRef = useRef(onEditorReady);
  const setSelectedIdRef = useRef(setSelectedId);

  useEffect(() => { onModelChangeRef.current = onModelChange; }, [onModelChange]);
  useEffect(() => { onOutgoingMessageRef.current = onOutgoingMessage; }, [onOutgoingMessage]);
  useEffect(() => { onEditorReadyRef.current = onEditorReady; }, [onEditorReady]);
  useEffect(() => { setSelectedIdRef.current = setSelectedId; }, [setSelectedId]);

  useEffect(() => {
    if (editorRef.current) editorRef.current.setReadonly(readOnly);
  }, [readOnly]);

  // Aplicar mensajes remotos
  useEffect(() => {
    if (!incomingMessage?.data || !editorRef.current) return;

    try {
      const parsed = JSON.parse(incomingMessage.data);
      if (parsed.type === 'send-full-state-to-peer') {
        editorRef.current.broadcastFullState();
        return;
      }
      if (typeof parsed.diagramData === 'string') {
        editorRef.current.receiveBroadcastedMessage(parsed.diagramData);
        return;
      }
      return;
    } catch {
      editorRef.current.receiveBroadcastedMessage(incomingMessage.data);
    }
  }, [incomingMessage]);

  // Handshake inicial
  useEffect(() => {
    if (!collaborationEnabled || !editorRef.current) return;

    const timer = setTimeout(() => {
      if (!editorRef.current) return;
      onOutgoingMessageRef.current?.(ApollonEditor.generateInitialSyncMessage());
      onOutgoingMessageRef.current?.(ApollonEditor.generateInitialAwarenessSyncMessage());
      editorRef.current.broadcastFullState();
    }, 100);

    return () => clearTimeout(timer);
  }, [collaborationEnabled]);

  const handleMount = useCallback((editor: ApollonEditor) => {
    editorRef.current = editor;
    onEditorReadyRef.current?.(editor);

    const unsubBroadcast = editor.sendBroadcastMessage((base64Data: string) => {
      onOutgoingMessageRef.current?.(base64Data);
    });
    unsubBroadcastRef.current = typeof unsubBroadcast === 'function' ? unsubBroadcast : null;

    subModelRef.current = editor.subscribeToModelChange((apollonModel) => {
      try {
        const mcu = fromApollon(apollonModel);
        onModelChangeRef.current(mcu);
      } catch (err) {
        console.error('[ApollonCanvas] fromApollon error:', err);
      }
    });

    subSelRef.current = editor.subscribeToSelectionChange((selectedIds: string[]) => {
      setSelectedIdRef.current(selectedIds[0] ?? null);
    });
  }, []);

  useEffect(() => {
    return () => {
      const editor = editorRef.current;
      if (!editor) return;
      if (subModelRef.current !== null) editor.unsubscribe(subModelRef.current);
      if (subSelRef.current !== null) editor.unsubscribe(subSelRef.current);
      if (unsubBroadcastRef.current) {
        try { unsubBroadcastRef.current(); } catch { /* ignore */ }
        unsubBroadcastRef.current = null;
      }
      editorRef.current = null;
    };
  }, []);

  const defaultModel = useMemo(
    () => (initialModel ? toApollon(initialModel) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialModel?.id],
  );

  if (!initialModel) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-sm text-[var(--color-foreground-muted)]">
        Cargando diagrama...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ minHeight: 0, minWidth: 0 }}
    >
      <Apollon
        style={CANVAS_STYLE}
        defaultModel={defaultModel}
        defaultType={UMLDiagramType.ClassDiagram}
        onMount={handleMount}
        collaborationEnabled={collaborationEnabled}
      />
    </div>
  );
}

// Comparación custom: solo re-renderiza si las props "reales" cambian.
export const ApollonCanvas = memo(ApollonCanvasInner, (prev, next) => {
  return (
    prev.initialModel?.id === next.initialModel?.id &&
    prev.readOnly === next.readOnly &&
    prev.collaborationEnabled === next.collaborationEnabled &&
    prev.incomingMessage?.id === next.incomingMessage?.id &&
    prev.onModelChange === next.onModelChange &&
    prev.onOutgoingMessage === next.onOutgoingMessage
  );
});