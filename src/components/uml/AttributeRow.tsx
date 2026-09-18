import { Trash2 } from 'lucide-react';
import type { UMLAttribute, Visibility } from '../../domain/uml-model';

interface AttributeRowProps {
  attribute: UMLAttribute;
  disabled?: boolean;
  onChange: (updated: UMLAttribute) => void;
  onDelete: () => void;
}

const visSymbol: Record<Visibility, string> = {
  public: '+', private: '-', protected: '#', package: '~',
};

export function AttributeRow({ attribute, disabled, onChange, onDelete }: AttributeRowProps) {
  return (
    <div className="flex items-center gap-2 group/row">
      <select
        value={attribute.visibility}
        onChange={(e) => onChange({ ...attribute, visibility: e.target.value as Visibility })}
        disabled={disabled}
        className="w-8 text-xs bg-transparent border-none text-[var(--color-foreground-muted)] cursor-pointer disabled:opacity-50 focus:outline-none"
        aria-label="Visibilidad"
      >
        {(['public', 'private', 'protected', 'package'] as Visibility[]).map((v) => (
          <option key={v} value={v}>{visSymbol[v]}</option>
        ))}
      </select>
      <input
        value={attribute.name}
        onChange={(e) => onChange({ ...attribute, name: e.target.value })}
        disabled={disabled}
        className="flex-1 text-xs bg-transparent border-b border-transparent hover:border-[var(--color-border)] focus:border-[var(--color-icon)] focus:outline-none text-[var(--color-foreground)] disabled:opacity-50 px-0.5 py-0.5"
        placeholder="nombre"
      />
      <span className="text-xs text-[var(--color-foreground-faint)]">:</span>
      <input
        value={attribute.type}
        onChange={(e) => onChange({ ...attribute, type: e.target.value })}
        disabled={disabled}
        className="w-20 text-xs bg-transparent border-b border-transparent hover:border-[var(--color-border)] focus:border-[var(--color-icon)] focus:outline-none text-[var(--color-foreground-muted)] disabled:opacity-50 px-0.5 py-0.5"
        placeholder="tipo"
      />
      {!disabled && (
        <button
          onClick={onDelete}
          className="p-0.5 opacity-0 group-hover/row:opacity-100 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 rounded transition-all"
          aria-label="Eliminar atributo"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
