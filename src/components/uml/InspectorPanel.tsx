import { useEditorStore } from '../../stores/editor.store';
import { ClassInspector } from './ClassInspector';
import { RelationInspector } from './RelationInspector';
import { Bot } from 'lucide-react';
import { Button } from '../ui/Button';
import type { UMLModel } from '../../domain/uml-model';

interface InspectorPanelProps {
  model: UMLModel;
  onModelChange: (model: UMLModel) => void;
  onOpenAI: () => void;
  readOnly?: boolean;
}

export function InspectorPanel({ model, onModelChange, onOpenAI, readOnly }: InspectorPanelProps) {
  const { selectedId } = useEditorStore();

  const selectedClass = model.classes.find((c) => c.id === selectedId);
  const selectedRelation = model.relations.find((r) => r.id === selectedId);

  if (!selectedId) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Selecciona un elemento del diagrama para ver sus propiedades.
        </p>
        <Button variant="secondary" leftIcon={<Bot className="h-4 w-4" />} onClick={onOpenAI}>
          Abrir asistente IA
        </Button>
      </div>
    );
  }

  if (selectedClass) {
    return (
      <ClassInspector
        umlClass={selectedClass}
        model={model}
        onModelChange={onModelChange}
        readOnly={readOnly}
      />
    );
  }

  if (selectedRelation) {
    return (
      <RelationInspector
        relation={selectedRelation}
        model={model}
        onModelChange={onModelChange}
        readOnly={readOnly}
      />
    );
  }

  return (
    <div className="p-4 text-sm text-[var(--color-foreground-muted)]">
      Elemento no reconocido.
    </div>
  );
}
