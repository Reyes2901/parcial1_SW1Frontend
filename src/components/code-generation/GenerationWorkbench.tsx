import { useState } from 'react';
import { Download } from 'lucide-react';
import { FileTree } from './FileTree';
import { CodeEditor } from './CodeEditor';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { ErrorState } from '../ui/ErrorState';
import { useGeneration } from '../../hooks/useGeneration';
import { generationService } from '../../services/generation.service';
import type { GenerationFile } from '../../services/generation.service';
import { cn } from '../../lib/cn';

interface GenerationWorkbenchProps { generationId: string; }

const STATUS_LABELS = {
  queued: { label: 'En cola', color: 'text-[var(--color-warning)]' },
  generating: { label: 'Generando…', color: 'text-[var(--color-info)]' },
  completed: { label: 'Completado', color: 'text-[var(--color-success)]' },
  error: { label: 'Error', color: 'text-[var(--color-danger)]' },
};

export function GenerationWorkbench({ generationId }: GenerationWorkbenchProps) {
  const { generationQuery, filesQuery, patchMutation } = useGeneration(generationId);
  const [selectedFile, setSelectedFile] = useState<GenerationFile | null>(null);
  const [content, setContent] = useState('');

  const gen = generationQuery.data;
  const files = filesQuery.data ?? [];

  if (generationQuery.isLoading) {
    return <div className="flex items-center justify-center h-full"><Spinner size="lg" /></div>;
  }

  if (generationQuery.isError) {
    return <ErrorState message="No se pudo cargar la generación." onRetry={() => generationQuery.refetch()} />;
  }

  const status = gen?.status ?? 'queued';
  const statusMeta = STATUS_LABELS[status];

  if (status === 'queued' || status === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Spinner size="lg" />
        <p className={cn('text-sm font-medium', statusMeta.color)}>{statusMeta.label}</p>
        <p className="text-xs text-[var(--color-foreground-muted)]">Generando código Spring Boot…</p>
      </div>
    );
  }

  if (status === 'error') {
    return <ErrorState title="Error en la generación" message={gen?.error ?? 'Error desconocido.'} />;
  }

  const handleSelectFile = (file: GenerationFile) => {
    setSelectedFile(file);
    setContent(file.content);
  };

  const handleSave = () => {
    if (!selectedFile) return;
    patchMutation.mutate({ filePath: selectedFile.path, content });
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* File tree */}
      <div className="w-60 flex-shrink-0 border-r border-[var(--color-border)] overflow-y-auto bg-[var(--color-secondary)]">
        <div className="p-3 border-b border-[var(--color-border)]">
          <p className="text-xs font-semibold text-[var(--color-foreground-muted)] uppercase tracking-wider">Archivos</p>
        </div>
        <FileTree files={files} selectedPath={selectedFile?.path} onSelect={handleSelectFile} />
      </div>

      {/* Editor area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-secondary)]">
          <span className="text-xs font-mono text-[var(--color-foreground-muted)]">
            {selectedFile?.path ?? 'Selecciona un archivo'}
          </span>
          <div className="flex items-center gap-2">
            {selectedFile && (
              <Button size="sm" onClick={handleSave} loading={patchMutation.isPending} variant="secondary">
                Guardar
              </Button>
            )}
            <a
              href={generationService.download(generationId)}
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--color-secondary)] border border-[var(--color-border)] rounded-[var(--radius-control)] hover:bg-[var(--color-background-hover)] transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Descargar ZIP
            </a>
          </div>
        </div>

        {/* Monaco */}
        <div className="flex-1 overflow-hidden">
          {selectedFile ? (
            <CodeEditor
              path={selectedFile.path}
              value={content}
              language={selectedFile.language}
              onChange={(v) => setContent(v ?? '')}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-[var(--color-foreground-faint)]">
              Selecciona un archivo para editar
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
