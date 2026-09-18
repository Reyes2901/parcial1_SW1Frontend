import { useState, useRef } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '../ui/Button';
import { diagramsService } from '../../services/diagrams.service';
import type { UMLCommand } from '../../domain/uml-command';
import { friendlyMessage } from '../../lib/errors';

interface XMIUploaderProps {
  diagramId: string;
  onApply: (commands: UMLCommand[]) => void;
  onClose: () => void;
}

export function XMIUploader({ diagramId, onApply, onClose }: XMIUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<UMLCommand[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    const xmi = await file.text();
    setLoading(true);
    setError(null);
    try {
      const commands = await diagramsService.importXmi(diagramId, xmi);
      setPreview(commands as UMLCommand[]);
    } catch (err) {
      setError(friendlyMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void processFile(file);
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-[var(--color-foreground-muted)] bg-[var(--color-info)]/10 border border-[var(--color-info)]/20 rounded-[var(--radius-control)] px-3 py-2">
        ℹ Subconjunto soportado: clases, interfaces, enumeraciones, asociaciones, herencia.
      </p>

      {!preview ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-[var(--radius-card)] cursor-pointer transition-colors ${
            dragging ? 'border-[var(--color-icon)] bg-[var(--color-primary-muted)]' : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
          }`}
        >
          <Upload className="h-8 w-8 text-[var(--color-foreground-faint)]" />
          <p className="text-sm text-[var(--color-foreground-muted)]">Arrastra un archivo .xmi o haz clic</p>
          <input ref={fileRef} type="file" accept=".xmi,.xml" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void processFile(f); }} />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-[var(--color-foreground)]">{preview.length} operación(es) a aplicar:</p>
          <div className="max-h-48 overflow-y-auto flex flex-col gap-1 border border-[var(--color-border)] rounded-[var(--radius-card)] p-3">
            {preview.map((cmd, i) => (
              <div key={i} className="text-xs font-mono text-[var(--color-foreground-muted)]">
                <span className="text-[var(--color-icon)]">{cmd.type}</span>
                {cmd.description && ` — ${cmd.description}`}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button onClick={() => { onApply(preview); onClose(); }}>Aplicar cambios</Button>
            <Button variant="secondary" onClick={() => setPreview(null)}>Cancelar</Button>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
      {loading && <p className="text-sm text-[var(--color-foreground-muted)]">Procesando XMI…</p>}
    </div>
  );
}
