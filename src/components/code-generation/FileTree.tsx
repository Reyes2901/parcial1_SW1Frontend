import { FileText, Folder } from 'lucide-react';
import { cn } from '../../lib/cn';
import type { GenerationFile } from '../../services/generation.service';

interface FileTreeProps {
  files: GenerationFile[];
  selectedPath?: string;
  onSelect: (file: GenerationFile) => void;
}

export function FileTree({ files, selectedPath, onSelect }: FileTreeProps) {
  // Group by directory
  const grouped = files.reduce<Record<string, GenerationFile[]>>((acc, f) => {
    const parts = f.path.split('/');
    const dir = parts.slice(0, -1).join('/') || '/';
    acc[dir] = [...(acc[dir] ?? []), f];
    return acc;
  }, {});

  return (
    <div className="p-2 flex flex-col gap-0.5">
      {Object.entries(grouped).map(([dir, dirFiles]) => (
        <div key={dir}>
          {dir !== '/' && (
            <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-[var(--color-foreground-muted)]">
              <Folder className="h-3 w-3" />
              <span className="font-mono truncate">{dir.split('/').pop()}</span>
            </div>
          )}
          {dirFiles.map((f) => {
            const name = f.path.split('/').pop() ?? f.path;
            return (
              <button
                key={f.path}
                onClick={() => onSelect(f)}
                className={cn(
                  'w-full flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-[var(--radius-control)] transition-colors text-left',
                  selectedPath === f.path
                    ? 'bg-[var(--color-primary-muted)] text-[var(--color-foreground)]'
                    : 'text-[var(--color-foreground-muted)] hover:bg-[var(--color-background-hover)] hover:text-[var(--color-foreground)]',
                )}
              >
                <FileText className="h-3 w-3 flex-shrink-0" />
                <span className="font-mono truncate">{name}</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
