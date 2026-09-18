import { Plus } from 'lucide-react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { AttributeRow } from './AttributeRow';
import type { UMLRelation, UMLModel, RelationKind, Cardinality, UMLAttribute } from '../../domain/uml-model';

interface RelationInspectorProps {
  relation: UMLRelation;
  model: UMLModel;
  onModelChange: (model: UMLModel) => void;
  readOnly?: boolean;
}

const CARDINALITIES: Cardinality[] = ['1', '0..1', '1..*', '0..*', '*'];
const RELATION_KINDS: RelationKind[] = ['association', 'aggregation', 'composition', 'inheritance', 'realization', 'dependency'];
const RELATION_LABELS: Record<RelationKind, string> = {
  association: 'Asociación', aggregation: 'Agregación', composition: 'Composición',
  inheritance: 'Herencia', realization: 'Realización', dependency: 'Dependencia',
};

export function RelationInspector({ relation, model, onModelChange, readOnly }: RelationInspectorProps) {
  const sourceClass = model.classes.find((c) => c.id === relation.sourceClassId);
  const targetClass = model.classes.find((c) => c.id === relation.targetClassId);

  const update = (patch: Partial<UMLRelation>) => {
    onModelChange({
      ...model,
      relations: model.relations.map((r) => r.id === relation.id ? { ...r, ...patch } : r),
    });
  };

  const addAttribute = () => {
    const newAttr: UMLAttribute = {
      id: crypto.randomUUID(), name: 'atributo', type: 'String',
      visibility: 'public', isPrimaryKey: false, isRequired: false, isUnique: false,
    };
    update({ attributes: [...(relation.attributes ?? []), newAttr] });
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-4">
      <Select
        label="Tipo de relación"
        value={relation.kind}
        onChange={(e) => update({ kind: e.target.value as RelationKind })}
        disabled={readOnly}
        options={RELATION_KINDS.map((k) => ({ value: k, label: RELATION_LABELS[k] }))}
      />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-xs font-medium text-[var(--color-foreground-muted)] mb-1">{sourceClass?.name ?? 'Origen'}</p>
          <Select
            value={relation.sourceCardinality}
            onChange={(e) => update({ sourceCardinality: e.target.value as Cardinality })}
            disabled={readOnly}
            options={CARDINALITIES.map((c) => ({ value: c, label: c }))}
          />
        </div>
        <div>
          <p className="text-xs font-medium text-[var(--color-foreground-muted)] mb-1">{targetClass?.name ?? 'Destino'}</p>
          <Select
            value={relation.targetCardinality}
            onChange={(e) => update({ targetCardinality: e.target.value as Cardinality })}
            disabled={readOnly}
            options={CARDINALITIES.map((c) => ({ value: c, label: c }))}
          />
        </div>
      </div>
      <Input label="Nombre de la relación" value={relation.name ?? ''} onChange={(e) => update({ name: e.target.value })} disabled={readOnly} placeholder="(opcional)" />
      <div className="grid grid-cols-2 gap-2">
        <Input label="Rol origen" value={relation.sourceRole ?? ''} onChange={(e) => update({ sourceRole: e.target.value })} disabled={readOnly} placeholder="(opcional)" />
        <Input label="Rol destino" value={relation.targetRole ?? ''} onChange={(e) => update({ targetRole: e.target.value })} disabled={readOnly} placeholder="(opcional)" />
      </div>

      {/* Atributos propios (N:M) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[var(--color-foreground-muted)] uppercase tracking-wider">Atributos de la relación</span>
          {!readOnly && (
            <button onClick={addAttribute} className="p-1 rounded hover:bg-[var(--color-background-hover)] text-[var(--color-icon)]" aria-label="Añadir atributo">
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {(relation.attributes ?? []).length > 0 && (
          <p className="text-xs text-[var(--color-warning)] mb-2">⚠ Las relaciones N:M con atributos son rechazadas por el backend (400).</p>
        )}
        <div className="flex flex-col gap-1">
          {(relation.attributes ?? []).map((attr) => (
            <AttributeRow
              key={attr.id}
              attribute={attr}
              disabled={readOnly}
              onChange={(updated) => update({ attributes: (relation.attributes ?? []).map((a) => a.id === attr.id ? updated : a) })}
              onDelete={() => update({ attributes: (relation.attributes ?? []).filter((a) => a.id !== attr.id) })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
