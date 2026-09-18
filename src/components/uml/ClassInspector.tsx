import { Plus } from 'lucide-react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { AttributeRow } from './AttributeRow';
import { MethodRow } from './MethodRow';
import type { UMLClass, UMLModel, ClassKind } from '../../domain/uml-model';
import { useEditorStore } from '../../stores/editor.store';

interface ClassInspectorProps {
  umlClass: UMLClass;
  model: UMLModel;
  onModelChange: (model: UMLModel) => void;
  readOnly?: boolean;
}

export function ClassInspector({ umlClass, model, onModelChange, readOnly }: ClassInspectorProps) {
  const { lockState } = useEditorStore();
  const isLocked = lockState && lockState.lockedBy !== 'yo';

  const update = (patch: Partial<UMLClass>) => {
    onModelChange({
      ...model,
      classes: model.classes.map((c) => c.id === umlClass.id ? { ...c, ...patch } : c),
    });
  };

  const addAttribute = () => {
    update({
      attributes: [...umlClass.attributes, {
        id: crypto.randomUUID(), name: 'atributo', type: 'String',
        visibility: 'private', isPrimaryKey: false, isRequired: false, isUnique: false,
      }],
    });
  };

  const addMethod = () => {
    update({
      methods: [...umlClass.methods, {
        id: crypto.randomUUID(), name: 'metodo', returnType: 'void',
        parameters: [], visibility: 'public',
      }],
    });
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {isLocked && (
        <div className="m-3 px-3 py-2 bg-[var(--color-warning)]/15 border border-[var(--color-warning)]/30 rounded-[var(--radius-control)] text-xs text-[var(--color-warning)]">
          Bloqueado por {lockState?.lockedBy}. Modo lectura.
        </div>
      )}
      <div className="p-4 border-b border-[var(--color-border)] flex flex-col gap-3">
        <Input
          label="Nombre"
          value={umlClass.name}
          onChange={(e) => update({ name: e.target.value })}
          disabled={isLocked || readOnly}
        />
        <Select
          label="Tipo"
          value={umlClass.kind}
          onChange={(e) => update({ kind: e.target.value as ClassKind })}
          disabled={isLocked || readOnly}
          options={[
            { value: 'class', label: 'Clase' },
            { value: 'abstract', label: 'Abstracta' },
            { value: 'interface', label: 'Interfaz' },
            { value: 'enumeration', label: 'Enumeración' },
          ]}
        />
      </div>

      <div className="p-4 border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[var(--color-foreground-muted)] uppercase tracking-wider">Atributos</span>
          {!readOnly && !isLocked && (
            <button onClick={addAttribute} className="p-1 rounded hover:bg-[var(--color-background-hover)] text-[var(--color-icon)] transition-colors" aria-label="Añadir atributo">
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex flex-col gap-1">
          {umlClass.attributes.map((attr) => (
            <AttributeRow
              key={attr.id}
              attribute={attr}
              disabled={isLocked || readOnly}
              onChange={(updated) => update({ attributes: umlClass.attributes.map((a) => a.id === attr.id ? updated : a) })}
              onDelete={() => update({ attributes: umlClass.attributes.filter((a) => a.id !== attr.id) })}
            />
          ))}
          {umlClass.attributes.length === 0 && (
            <p className="text-xs text-[var(--color-foreground-faint)] py-1">Sin atributos</p>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[var(--color-foreground-muted)] uppercase tracking-wider">Métodos</span>
          {!readOnly && !isLocked && (
            <button onClick={addMethod} className="p-1 rounded hover:bg-[var(--color-background-hover)] text-[var(--color-icon)] transition-colors" aria-label="Añadir método">
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex flex-col gap-1">
          {umlClass.methods.map((method) => (
            <MethodRow
              key={method.id}
              method={method}
              disabled={isLocked || readOnly}
              onChange={(updated) => update({ methods: umlClass.methods.map((m) => m.id === method.id ? updated : m) })}
              onDelete={() => update({ methods: umlClass.methods.filter((m) => m.id !== method.id) })}
            />
          ))}
          {umlClass.methods.length === 0 && (
            <p className="text-xs text-[var(--color-foreground-faint)] py-1">Sin métodos</p>
          )}
        </div>
      </div>
    </div>
  );
}
