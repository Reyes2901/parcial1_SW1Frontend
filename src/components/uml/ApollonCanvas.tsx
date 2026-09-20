import { useRef, useEffect, useCallback } from 'react';
import { Apollon, type ApollonEditor, UMLDiagramType } from '@tumaet/apollon';
import { toApollon, fromApollon } from '../../adapters/apollon-adapter';
import type { UMLModel } from '../../domain/uml-model';
import { useEditorStore } from '../../stores/editor.store';

interface ApollonCanvasProps {
  initialModel: UMLModel | undefined;
  onModelChange: (model: UMLModel) => void;
  onEditorReady?: (editor: ApollonEditor) => void;
  readOnly?: boolean;
}

export function ApollonCanvas({
  initialModel,
  onModelChange,
  onEditorReady,
  readOnly = false,
}: ApollonCanvasProps) {
  const editorRef = useRef<ApollonEditor | null>(null);
  const subModelRef = useRef<number | null>(null);
  const subSelRef = useRef<number | null>(null);
  const { setSelectedId } = useEditorStore();

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.setReadonly(readOnly);
    }
  }, [readOnly]);

  const handleMount = useCallback(
    (editor: ApollonEditor) => {
      editorRef.current = editor;
      onEditorReady?.(editor);

      subModelRef.current = editor.subscribeToModelChange((apollonModel) => {
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
    [onModelChange, onEditorReady, setSelectedId],
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
      />
    </div>
  );
}