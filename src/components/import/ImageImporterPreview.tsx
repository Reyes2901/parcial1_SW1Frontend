import { useState, useRef } from 'react';
import { Image, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { diagramsService } from '../../services/diagrams.service';
import type { UMLCommand } from '../../domain/uml-command';
import { friendlyMessage } from '../../lib/errors';

interface ImageImporterPreviewProps {
  diagramId: string;
  onApply: (commands: UMLCommand[]) => void;
  onClose: () => void;
}

export function ImageImporterPreview({ diagramId, onApply, onClose }: ImageImporterPreviewProps) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<UMLCommand[] | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const commands = await diagramsService.importImage(diagramId, base64, file.type);
        setPreview(commands as UMLCommand[]);
      } catch (err) {
        setError(friendlyMessage(err));
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-[var(--color-foreground-muted)] bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20 rounded-[var(--radius-control)] px-3 py-2">
        ⚠ La imagen se convertirá en una propuesta. Nada se aplica sin tu confirmación.
      </p>

      {!imageUrl ? (
        <div
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-[var(--color-border)] rounded-[var(--radius-card)] cursor-pointer hover:border-[var(--color-border-strong)] transition-colors"
        >
          <Image className="h-8 w-8 text-[var(--color-foreground-faint)]" />
          <p className="text-sm text-[var(--color-foreground-muted)]">Sube una imagen PNG o JPG del diagrama</p>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void processFile(f); }} />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <img src={imageUrl} alt="Diagrama importado" className="max-h-48 rounded-[var(--radius-card)] border border-[var(--color-border)] object-contain" />
          {loading && <p className="text-sm text-[var(--color-foreground-muted)]">Analizando imagen con IA…</p>}
          {preview && (
            <>
              <p className="text-sm font-medium">{preview.length} operación(es) propuesta(s):</p>
              <div className="max-h-32 overflow-y-auto flex flex-col gap-1 border border-[var(--color-border)] rounded-[var(--radius-card)] p-3">
                {preview.map((cmd, i) => (
                  <div key={i} className="text-xs font-mono text-[var(--color-foreground-muted)]">
                    <span className="text-[var(--color-icon)]">{cmd.type}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button onClick={() => { onApply(preview); onClose(); }} leftIcon={<CheckCircle className="h-4 w-4" />}>
                  Confirmar y aplicar
                </Button>
                <Button variant="secondary" onClick={() => { setPreview(null); setImageUrl(null); }} leftIcon={<XCircle className="h-4 w-4" />}>
                  Descartar
                </Button>
              </div>
            </>
          )}
        </div>
      )}
      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
    </div>
  );
}
