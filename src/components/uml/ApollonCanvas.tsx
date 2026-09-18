import { useRef, useEffect, useCallback } from 'react';
import { Apollon, type ApollonEditor, UMLDiagramType } from '@tumaet/apollon';
import { toApollon, fromApollon } from '../../adapters/apollon-adapter';
import type { UMLModel } from '../../domain/uml-model';
import { useEditorStore } from '../../stores/editor.store';

interface ApollonCanvasProps {
  initialModel: UMLModel;
  model?: UMLModel;
  onModelChange: (model: UMLModel) => void;
  onEditorReady?: (editor: ApollonEditor) => void;
  readOnly?: boolean;
}

export function ApollonCanvas({
  initialModel,
  model,
  onModelChange,
  onEditorReady,
  readOnly = false,
}: ApollonCanvasProps) {
  const editorRef = useRef<ApollonEditor | null>(null);
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

      const subModel = editor.subscribeToModelChange((apollonModel) => {
        try {
          const mcu = fromApollon(apollonModel);
          onModelChange(mcu);
        } catch (err) {
          console.error('[ApollonCanvas] fromApollon error:', err);
        }
      });

      const subSel = editor.subscribeToSelectionChange((selectedElementIds: string[]) => {
        setSelectedId(selectedElementIds[0] ?? null);
      });

      return () => {
        editor.unsubscribe(subModel);
        editor.unsubscribe(subSel);
        editorRef.current = null;
      };
    },
    [onModelChange, onEditorReady, setSelectedId],
  );

  return (
    <div className="w-full h-full relative overflow-hidden" aria-label="Canvas de diagrama UML" role="application">
      <Apollon
        style={{ width: '100%', height: '100%' }}
        defaultModel={toApollon(initialModel)}
        model={model ? toApollon(model) : undefined}
        defaultType={UMLDiagramType.ClassDiagram}
        readonly={readOnly}
        onMount={handleMount}
      />
    </div>
  );
}

