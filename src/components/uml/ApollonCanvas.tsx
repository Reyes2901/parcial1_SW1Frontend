import { useRef, useEffect, useCallback, useMemo } from 'react';
import { Apollon, ApollonEditor, UMLDiagramType } from '@tumaet/apollon';
import { toApollon, fromApollon } from '../../adapters/apollon-adapter';
import type { UMLModel } from '../../domain/uml-model';
import { useEditorStore } from '../../stores/editor.store';

// Tiempo de bloqueo de isApplyingRemoteRef (ms).
// Debe ser mayor que el tiempo máximo de procesamiento de un update Yjs en Apollon.
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
      // Cancelar timer previo y extender el bloqueo
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
  // IMPORTANTE: Este efecto sólo corre cuando collaborationEnabled cambia de false→true.
  // No se ejecuta en cada render gracias a las deps estables.
  useEffect(() => {
    if (!collaborationEnabled || !editorRef.current) return;

    const timer = setTimeout(() => {
      if (!editorRef.current) return;
      console.log('[ApollonCanvas] Enviando handshake Yjs completo (una vez por conexión)');
      // Bloquear subscribeToModelChange durante el handshake completo
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
  // ── handleMount: deps VACÍAS, todo por refs ──
  const handleMount = useCallback((editor: ApollonEditor) => {
    editorRef.current = editor;
    onEditorReadyRef.current?.(editor);

    // Guardar el unsubscribe de sendBroadcastMessage para cleanup correcto
    const unsubBroadcast = editor.sendBroadcastMessage((base64Data: string) => {
      if (isApplyingRemoteRef.current) return;
      onOutgoingMessageRef.current?.(base64Data);
    });
    // sendBroadcastMessage puede o no retornar un cleanup según la versión de Apollon
    unsubBroadcastRef.current = typeof unsubBroadcast === 'function' ? unsubBroadcast : null;

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

  // ── Cleanup completo al desmontar ──
  useEffect(() => {
    return () => {
      // Limpiar timer de bloqueo remoto
      if (remoteTimerRef.current) {
        clearTimeout(remoteTimerRef.current);
        remoteTimerRef.current = null;
      }
      isApplyingRemoteRef.current = false;

      const editor = editorRef.current;
      if (!editor) return;
      if (subModelRef.current !== null) editor.unsubscribe(subModelRef.current);
      if (subSelRef.current !== null) editor.unsubscribe(subSelRef.current);
      // Limpiar sendBroadcastMessage si la librería lo soporta
      if (unsubBroadcastRef.current) {
        try { unsubBroadcastRef.current(); } catch { /* ignore */ }
        unsubBroadcastRef.current = null;
      }
      editorRef.current = null;
    };
  }, []);

  // ── ResizeObserver: notifica a Apollon cuando el contenedor cambia de tamaño ──
  // Necesario cuando se abre/cierra el inspector o panel IA
  // DEBE ir antes del early return para cumplir Reglas de React (hooks antes de condicionales)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => {
      const editor = editorRef.current;
      if (!editor) return;
      // Apollon puede exponer un método resize() o similar
      if (typeof (editor as any).resize === 'function') {
        (editor as any).resize();
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // ── defaultModel memoizado para no recrear el objeto en cada render ──
  const defaultModel = useMemo(
    () => (initialModel ? toApollon(initialModel) : undefined),
    [initialModel?.id, initialModel?.version],
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