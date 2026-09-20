import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
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
  const navigate = useNavigate();
  const diagramQuery = useDiagram(diagramId!);
  const saveMutation = useSaveDiagram(diagramId!);
  const { saveStatus, activePanel, setActivePanel } = useEditorStore();
  const [currentModel, setCurrentModel] = useState<UMLModel | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  useLock(diagramId!);

  // Ref que mantiene la versión actual del DIAGRAMA (no del MCU)
  const versionRef = useRef<number>(1);

  // Sincroniza con la versión del servidor cuando carga el diagrama
  useEffect(() => {
    if (diagramQuery.data?.version != null) {
      versionRef.current = diagramQuery.data.version;
    }
  }, [diagramQuery.data?.version]);

  const saveFn = useCallback(async (umlModel: UMLModel) => {
    const res = await saveMutation.mutateAsync({
      umlModel,
      version: versionRef.current,
    });
    versionRef.current = res.version;
  }, [saveMutation]);

  const { scheduleSave } = useDebouncedSave(saveFn);

  const handleModelChange = useCallback((model: UMLModel) => {
    setCurrentModel(model);
    scheduleSave(model);
  }, [scheduleSave]);

  const diagram = diagramQuery.data;
  const emptyModel: UMLModel = {
    id: diagram?.id ?? '',
    name: diagram?.name ?? 'Sin título',
    version: 1,
    classes: [],
    relations: [],
  };
  const model = currentModel ?? diagram?.umlModel ?? emptyModel;

  const handleApplyCommands = useCallback((commands: UMLCommand[] | null) => {
    if (!commands || commands.length === 0 || !model) return;
    const updated = applyCommands(model, commands);
    setCurrentModel(updated);
    scheduleSave(updated);
  }, [model, scheduleSave]);

  const handleGenerateCode = async () => {
    if (!diagramId) return;
    try {
      toast.info('Generación iniciada');
      const res = await diagramsService.generate(diagramId);
      navigate(`/generations/${res.generationId}`);
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Error al iniciar la generación de código');
    }
  };
  if (diagramQuery.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (diagramQuery.isError || !diagram) {
    return (
      <ErrorState
        message="No se pudo cargar el diagrama."
        onRetry={() => diagramQuery.refetch()}
      />
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Topbar */}
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-white/10 bg-[var(--color-primary)] px-4">
        <Link
          to={`/projects/${diagram.projectId}`}
          className="flex items-center gap-1 text-sm text-white/70 transition-colors hover:text-white"
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
            'flex items-center gap-1.5 rounded-[var(--radius-control)] px-3 py-1.5 text-xs font-medium transition-colors',
            activePanel === 'ai' ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white',
          )}
        >
          <Bot className="h-4 w-4" />
          IA
        </button>
        <button
          onClick={() => setImportOpen(true)}
          className="flex items-center gap-1.5 rounded-[var(--radius-control)] px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
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
          className="flex items-center gap-1.5 rounded-[var(--radius-control)] bg-[var(--color-icon)] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
        >
          <Code className="h-4 w-4" />
          Generar código
        </button>
      </div>

      {/* Fila central: flex-1 + min-h-0 CRÍTICO + overflow-hidden */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Canvas wrapper: RELATIVE (obligatorio para absolute inset-0) */}
        <div className="relative min-w-0 flex-1 overflow-hidden bg-[var(--color-background)]">
          <ApollonCanvas
            initialModel={model}
            onModelChange={handleModelChange}
          />
        </div>

        {/* Inspector */}
        {activePanel === 'inspector' && model && (
          <div className="flex w-72 shrink-0 flex-col border-l border-[var(--color-border)] bg-[var(--color-secondary)]">
            <div className="border-b border-[var(--color-border)] px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-foreground-muted)]">
                Inspector
              </span>
            </div>
            <InspectorPanel
              model={model}
              onModelChange={handleModelChange}
              onOpenAI={() => setActivePanel('ai')}
            />
          </div>
        )}

        {/* IA */}
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
      <div className="flex h-8 shrink-0 items-center gap-4 border-t border-[var(--color-border)] bg-[var(--color-secondary)] px-4">
        <span className="font-mono text-xs text-[var(--color-foreground-faint)]">
          v{diagram.version}
        </span>
        <span className="font-mono text-xs text-[var(--color-foreground-faint)]">
          {model?.classes.length ?? 0} clases · {model?.relations.length ?? 0} relaciones
        </span>
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

