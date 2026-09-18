import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import type { UMLCommand } from '../../domain/uml-command';

interface AICommandPreviewProps {
  commands: UMLCommand[];
  onConfirm: () => void;
  onReject: () => void;
}

export function AICommandPreview({ commands, onConfirm, onReject }: AICommandPreviewProps) {
  const hasDestructive = commands.some((c) => c.type.startsWith('delete') || c.requiresConfirmation);

  return (
    <div className="border border-[var(--color-warning)]/50 bg-[var(--color-warning)]/5 rounded-[var(--radius-card)] p-3 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" />
        <span className="text-sm font-medium text-[var(--color-foreground)]">
          {hasDestructive ? 'Operación destructiva — confirmar' : 'Confirmar operaciones'}
        </span>
      </div>
      <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
        {commands.map((cmd, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-[var(--color-foreground-muted)]">
            <span className="font-mono text-[var(--color-icon)]">{cmd.type}</span>
            {cmd.description && <span>— {cmd.description}</span>}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button variant="danger" size="sm" onClick={onConfirm} leftIcon={<CheckCircle className="h-3.5 w-3.5" />}>
          Aplicar
        </Button>
        <Button variant="secondary" size="sm" onClick={onReject} leftIcon={<XCircle className="h-3.5 w-3.5" />}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
