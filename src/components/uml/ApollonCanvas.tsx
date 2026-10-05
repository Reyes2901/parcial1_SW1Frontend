import { useRef, useEffect, useCallback, useMemo } from 'react';
import { Apollon, ApollonEditor, UMLDiagramType } from '@tumaet/apollon';
import { toApollon, fromApollon } from '../../adapters/apollon-adapter';
import type { UMLModel } from '../../domain/uml-model';
import { useEditorStore } from '../../stores/editor.store';

const REMOTE_APPLY_LOCK_MS = 2000;

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
  const remoteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    if (editorRef.current) {
      editorRef.current.setReadonly(readOnly);
    }
  }, [readOnly]);

  useEffect(() => {
    if (!incomingMessage?.data || !editorRef.current) return;

    const applyRemote = (base64: string) => {
      if (remoteTimerRef.current) clearTimeout(remoteTimerRef.current);
      isApplyingRemoteRef.current = true;
      try {
        editorRef.current!.receiveBroadcastedMessage(base64);
      } finally {
        remoteTimerRef.current = setTimeout(() => {
          isApplyingRemoteRef.current = false;
          remoteTimerRef.current = null;
        }, REMOTE_APPLY_LOCK_MS);
      }
    };
    try {
      const parsed = JSON.parse(incomingMessage.data);

      if (parsed.type === 'send-full-state-to-peer') {
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

  useEffect(() => {
    if (!collaborationEnabled || !editorRef.current) return;

    const timer = setTimeout(() => {
      if (!editorRef.current) return;
      if (remoteTimerRef.current) clearTimeout(remoteTimerRef.current);
      isApplyingRemoteRef.current = true;
      onOutgoingMessageRef.current?.(ApollonEditor.generateInitialSyncMessage());
      onOutgoingMessageRef.current?.(ApollonEditor.generateInitialAwarenessSyncMessage());
      editorRef.current.broadcastFullState();
      remoteTimerRef.current = setTimeout(() => {
        isApplyingRemoteRef.current = false;
        remoteTimerRef.current = null;
      }, REMOTE_APPLY_LOCK_MS);
    }, 100);

    return () => clearTimeout(timer);
  }, [collaborationEnabled]);

  const handleMount = useCallback((editor: ApollonEditor) => {
    editorRef.current = editor;
    onEditorReadyRef.current?.(editor);

    const unsubBroadcast = editor.sendBroadcastMessage((base64Data: string) => {
      if (isApplyingRemoteRef.current) return;
      onOutgoingMessageRef.current?.(base64Data);
    });
    unsubBroadcastRef.current = typeof unsubBroadcast === 'function' ? unsubBroadcast : null;

    let lastNotifiedJson = '';
    subModelRef.current = editor.subscribeToModelChange((apollonModel) => {
      if (isApplyingRemoteRef.current) return;
      try {
        const mcu = fromApollon(apollonModel);
        const json = JSON.stringify(mcu);
        if (json === lastNotifiedJson) return;
        lastNotifiedJson = json;
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
      if (remoteTimerRef.current) {
        clearTimeout(remoteTimerRef.current);
        remoteTimerRef.current = null;
      }
      isApplyingRemoteRef.current = false;

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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => {
      const editor = editorRef.current;
      if (!editor) return;
      if (typeof (editor as any).resize === 'function') {
        (editor as any).resize();
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
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
    <div ref={containerRef} className="absolute inset-0">
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