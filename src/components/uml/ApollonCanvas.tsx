import { memo, useRef, useEffect, useCallback } from 'react';
import { ApollonEditor, UMLDiagramType, ApollonMode } from '@besser/wme';
import type { Operation } from 'fast-json-patch';
import { toApollon, fromApollon } from '../../adapters/apollon-adapter';
import type { UMLModel } from '../../domain/uml-model';

type Patch = Operation[];

interface ApollonCanvasProps {
  initialModel: UMLModel | undefined;
  onModelChange: (model: UMLModel) => void;
  onLocalPatch?: (patch: Patch) => void;
  onEditorReady?: (editor: ApollonEditor | null) => void;
  readOnly?: boolean;
  collaborationEnabled?: boolean;
}

function ApollonCanvasInner({
  initialModel,
  onModelChange,
  onLocalPatch,
  onEditorReady,
  readOnly = false,
  collaborationEnabled = false,
}: ApollonCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<ApollonEditor | null>(null);
  const pendingDestroyRef = useRef<Promise<void>>(Promise.resolve());

  // Refs estables para callbacks
  const onModelChangeRef = useRef(onModelChange);
  onModelChangeRef.current = onModelChange;
  const onLocalPatchRef = useRef(onLocalPatch);
  onLocalPatchRef.current = onLocalPatch;
  const onEditorReadyRef = useRef(onEditorReady);
  onEditorReadyRef.current = onEditorReady;

  // Ref del collaborationEnabled para leer el valor más reciente
  // sin que esté en el dependency array del mount
  const collaborationEnabledRef = useRef(collaborationEnabled);
  collaborationEnabledRef.current = collaborationEnabled;

  const destroyEditorDeferred = useCallback((editor: ApollonEditor) => {
    const run = pendingDestroyRef.current.then(
      () =>
        new Promise<void>((resolve) => {
          setTimeout(() => {
            try {
              editor.destroy();
            } catch (error) {
              console.warn('[besser-destroy-error]', error);
            } finally {
              resolve();
            }
          }, 0);
        }),
    );
    pendingDestroyRef.current = run;
    return run;
  }, []);

  // ─── MOUNT: solo depende de initialModel.id y readOnly.
  // collaborationEnabled NO está acá. Cuando el WS reconecta,
  // collaborationEnabled cambia true→false→true pero el editor NO se remonta.
  useEffect(() => {
    if (!containerRef.current || !initialModel) return;

    console.log(`[besser-mount] time=${Date.now()} collab=${collaborationEnabledRef.current}`);

    const editor = new ApollonEditor(containerRef.current, {
      type: UMLDiagramType.ClassDiagram,
      mode: ApollonMode.Modelling,
      readonly: readOnly,
      enablePopups: true,
    });
    editorRef.current = editor;

    let modelSubId: number | null = null;
    let patchSubId: number | null = null;

    (async () => {
      await editor.nextRender;
      if (editorRef.current !== editor) return;

      // Cargar modelo inicial
      try {
        (editor as unknown as { model?: unknown }).model = toApollon(initialModel);
        console.log(`[besser-load-model] classes=${initialModel.classes.length}`);
      } catch (err) {
        console.warn('[besser-load-model-warn]', err);
      }

      // Suscripción a cambios de modelo (siempre activa, para persistencia y UI)
      modelSubId = editor.subscribeToModelChange((model) => {
        try {
          onModelChangeRef.current(fromApollon(model));
        } catch (err) {
          console.error('[besser-model-change-error]', err);
        }
      });

      // Suscripción a patches: SIEMPRE activa, sin importar collaborationEnabled.
      // El filtro de si enviar o no lo hace EditorPage con su collabStateRef.
      try {
        patchSubId = editor.subscribeToModelChangePatches((patch) => {
          onLocalPatchRef.current?.(patch as Patch);
        });
      } catch (err) {
        console.error('[besser-sub-patch-error]', err);
      }

      onEditorReadyRef.current?.(editor);
    })();

    return () => {
      console.log(`[besser-destroy] time=${Date.now()}`);
      const ed = editorRef.current;
      editorRef.current = null;
      if (ed) {
        onEditorReadyRef.current?.(null);
        destroyEditorDeferred(ed);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialModel?.id, readOnly, destroyEditorDeferred]);

  // ─── Propagar collaborationEnabled SIN remount ───
  useEffect(() => {
    if (!editorRef.current) return;
    console.log(`[besser-collab-toggled] enabled=${collaborationEnabled}`);
    // El editor ya tiene la suscripción desde el mount.
    // El flag solo afecta si EditorPage envía los patches al WS.
  }, [collaborationEnabled]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ minHeight: 0, minWidth: 0 }}
    />
  );
}

export const ApollonCanvas = memo(ApollonCanvasInner, (prev, next) => {
  return (
    prev.initialModel?.id === next.initialModel?.id &&
    prev.readOnly === next.readOnly &&
    prev.onModelChange === next.onModelChange &&
    prev.onEditorReady === next.onEditorReady &&
    prev.onLocalPatch === next.onLocalPatch
  );
});