import { useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ChevronLeft, Bot, Upload, Code, CheckCircle, Loader, AlertCircle,
} from 'lucide-react';
import { useDiagram, useSaveDiagram } from '../../../hooks/useDiagram';
import { useDebouncedSave } from '../../../hooks/useDebouncedSave';
import { useLock } from '../../../hooks/useLock';
import { useEditorStore } from '../../../stores/editor.store';
import { ApollonCanvas } from '../../../components/uml/ApollonCanvas';
import { InspectorPanel } from '../../../components/uml/InspectorPanel';
import { AIAssistantPanel } from '../../../components/ai/AIAssistantPanel';
import { ImportDialog } from '../../../components/import/ImportDialog';
import { Spinner } from '../../../components/ui/Spinner';
import { ErrorState } from '../../../components/ui/ErrorState';
import { diagramsService } from '../../../services/diagrams.service';
import { applyCommands } from '../../../lib/apply-commands';
import type { UMLModel } from '../../../domain/uml-model';
import type { UMLCommand } from '../../../domain/uml-command';
import { cn } from '../../../lib/cn';

const SAVE_STATUS_ICON = {
  idle: null,
  saving: <Loader className="h-3.5 w-3.5 animate-spin text-[var(--color-foreground-muted)]" />,
  saved: <CheckCircle className="h-3.5 w-3.5 text-[var(--color-success)]" />,
  error: <AlertCircle className="h-3.5 w-3.5 text-[var(--color-danger)]" />,
};

export default function EditorPage() {
  const { diagramId } = useParams<{ diagramId: string }>();
  const diagramQuery = useDiagram(diagramId!);
  const saveMutation = useSaveDiagram(diagramId!);
  const { saveStatus, activePanel, setActivePanel } = useEditorStore();
  const [currentModel, setCurrentModel] = useState<UMLModel | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  useLock(diagramId!);

  const { scheduleSave } = useDebouncedSave(async (modelToSave) => {
    await saveMutation.mutateAsync(modelToSave);
  });

  const handleModelChange = useCallback((model: UMLModel) => {
    setCurrentModel(model);
    scheduleSave(model);
  }, [scheduleSave]);

  const diagram = diagramQuery.data;
  const model = currentModel ?? diagram?.model;

  const handleApplyCommands = useCallback((commands: UMLCommand[] | null) => {
    if (!commands || commands.length === 0 || !model) return;
    const updated = applyCommands(model, commands);
    setCurrentModel(updated);
    scheduleSave(updated);
  }, [model, scheduleSave]);

  if (diagramQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  if (diagramQuery.isError || !diagram) {
    return <ErrorState message="No se pudo cargar el diagrama." onRetry={() => diagramQuery.refetch()} />;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Topbar */}
      <div className="h-14 flex items-center px-4 gap-3 bg-[var(--color-primary)] border-b border-white/10 flex-shrink-0">
        <Link
          to={`/projects/${diagram.projectId}`}
          className="flex items-center gap-1 text-white/70 hover:text-white transition-colors text-sm"
        >
          <ChevronLeft className="h-4 w-4" />
          Proyecto
        </Link>
        <span className="text-white/30">/</span>
        <span className="text-sm font-medium text-white">{diagram.name}</span>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 text-xs text-white/60">
          {SAVE_STATUS_ICON[saveStatus]}
          <span>
            {saveStatus === 'saving' ? 'Guardando…' :
             saveStatus === 'saved' ? 'Guardado' :
             saveStatus === 'error' ? 'Error al guardar' : ''}
          </span>
        </div>
        <button
          onClick={() => setActivePanel(activePanel === 'ai' ? null : 'ai')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-control)] text-xs font-medium transition-colors',
            activePanel === 'ai' ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white',
          )}
        >
          <Bot className="h-4 w-4" />
          IA
        </button>
        <button
          onClick={() => setImportOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-control)] text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          <Upload className="h-4 w-4" />
          Importar
        </button>
        <button
          onClick={async () => {
            if (model) {
              const res = await diagramsService.generate(diagramId!);
              window.open(`/generations/${res.generationId}`, '_blank');
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-control)] text-xs font-medium bg-[var(--color-icon)] text-white hover:opacity-90 transition-opacity"
        >
          <Code className="h-4 w-4" />
          Generar código
        </button>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 bg-[var(--color-background)] relative overflow-hidden">
          <ApollonCanvas
            initialModel={diagram.model}
            model={model}
            onModelChange={handleModelChange}
          />
        </div>

        {/* Inspector panel */}
        {activePanel === 'inspector' || activePanel === null ? (
          <div className="w-72 flex-shrink-0 bg-[var(--color-secondary)] border-l border-[var(--color-border)] flex flex-col">
            <div className="px-4 py-3 border-b border-[var(--color-border)]">
              <span className="text-xs font-semibold text-[var(--color-foreground-muted)] uppercase tracking-wider">Inspector</span>
            </div>
            {model ? (
              <InspectorPanel
                model={model}
                onModelChange={handleModelChange}
                onOpenAI={() => setActivePanel('ai')}
              />
            ) : null}
          </div>
        ) : null}

        {/* AI panel */}
        {activePanel === 'ai' && model && (
          <AIAssistantPanel
            diagramId={diagramId!}
            model={model}
            onClose={() => setActivePanel(null)}
            onApplyCommands={handleApplyCommands}
          />
        )}
      </div>

      {/* Statusbar */}
      <div className="h-8 flex items-center px-4 gap-4 bg-[var(--color-secondary)] border-t border-[var(--color-border)] flex-shrink-0">
        <span className="text-xs font-mono text-[var(--color-foreground-faint)]">v{diagram.version}</span>
        <span className="text-xs font-mono text-[var(--color-foreground-faint)]">{model?.classes.length ?? 0} clases · {model?.relations.length ?? 0} relaciones</span>
      </div>

      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        diagramId={diagramId!}
        onApplyCommands={handleApplyCommands}
      />
    </div>
  );
}
