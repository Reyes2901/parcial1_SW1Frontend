import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { XMIUploader } from './XMIUploader';
import { ImageImporterPreview } from './ImageImporterPreview';
import { cn } from '../../lib/cn';
import type { UMLCommand } from '../../domain/uml-command';

type Tab = 'xmi' | 'image';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  diagramId: string;
  onApplyCommands: (commands: UMLCommand[]) => void;
}

export function ImportDialog({ open, onClose, diagramId, onApplyCommands }: ImportDialogProps) {
  const [activeTab, setActiveTab] = useState<Tab>('xmi');

  return (
    <Modal open={open} onClose={onClose} title="Importar diagrama" size="md">
      <div className="flex border-b border-[var(--color-border)] mb-4 -mx-6 px-6">
        {(['xmi', 'image'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
              activeTab === tab
                ? 'border-[var(--color-icon)] text-[var(--color-foreground)]'
                : 'border-transparent text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]',
            )}
          >
            {tab === 'xmi' ? 'XMI' : 'Imagen'}
          </button>
        ))}
      </div>
      {activeTab === 'xmi' ? (
        <XMIUploader diagramId={diagramId} onApply={onApplyCommands} onClose={onClose} />
      ) : (
        <ImageImporterPreview diagramId={diagramId} onApply={onApplyCommands} onClose={onClose} />
      )}
    </Modal>
  );
}
