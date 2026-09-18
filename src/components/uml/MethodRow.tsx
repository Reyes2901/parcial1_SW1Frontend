import { Trash2 } from 'lucide-react';
import type { UMLMethod, Visibility } from '../../domain/uml-model';

interface MethodRowProps {
  method: UMLMethod;
  disabled?: boolean;
  onChange: (updated: UMLMethod) => void;
  onDelete: () => void;
}

const visSymbol: Record<Visibility, string> = {
  public: '+', private: '-', protected: '#', package: '~',
};

export function MethodRow({ method, disabled, onChange, onDelete }: MethodRowProps) {
  return (
    <div className="flex items-center gap-2 group/row">
      <select
        value={method.visibility}
        onChange={(e) => onChange({ ...method, visibility: e.target.value as Visibility })}
        disabled={disabled}
        className="w-8 text-xs bg-transparent border-none text-[var(--color-foreground-muted)] cursor-pointer disabled:opacity-50 focus:outline-none"
        aria-label="Visibilidad"
      >
        {(['public', 'private', 'protected', 'package'] as Visibility[]).map((v) => (
          <option key={v} value={v}>{visSymbol[v]}</option>
        ))}
      </select>
      <input
        value={method.name}
        onChange={(e) => onChange({ ...method, name: e.target.value })}
        disabled={disabled}
        className="flex-1 text-xs bg-transparent border-b border-transparent hover:border-[var(--color-border)] focus:border-[var(--color-icon)] focus:outline-none text-[var(--color-foreground)] disabled:opacity-50 px-0.5 py-0.5"
        placeholder="nombre"
      />
      <span className="text-xs text-[var(--color-foreground-faint)]">():</span>
      <input
        value={method.returnType}
        onChange={(e) => onChange({ ...method, returnType: e.target.value })}
        disabled={disabled}
        className="w-16 text-xs bg-transparent border-b border-transparent hover:border-[var(--color-border)] focus:border-[var(--color-icon)] focus:outline-none text-[var(--color-foreground-muted)] disabled:opacity-50 px-0.5 py-0.5"
        placeholder="void"
      />
      {!disabled && (
        <button
          onClick={onDelete}
          className="p-0.5 opacity-0 group-hover/row:opacity-100 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 rounded transition-all"
          aria-label="Eliminar método"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
