import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ChevronLeft, Bot, Upload, Code, CheckCircle, Loader, AlertCircle, Send, Users, RefreshCw,
} from 'lucide-react';
import type { ApollonEditor } from '@besser/wme';
import type { Operation } from 'fast-json-patch';
import { useDiagram, useSaveDiagram } from '../../../hooks/useDiagram';
import { useDebouncedSave } from '../../../hooks/useDebouncedSave';
import { useLock } from '../../../hooks/useLock';
import { useCollaboration } from '../../../hooks/useCollaboration';
import { useEditorStore } from '../../../stores/editor.store';
import { useAuthStore } from '../../../stores/auth.store';
import { ApollonCanvas } from '../../../components/uml/ApollonCanvas';
import { InspectorPanel } from '../../../components/uml/InspectorPanel';
import { AIAssistantPanel } from '../../../components/ai/AIAssistantPanel';
import { ImportDialog } from '../../../components/import/ImportDialog';
import { Spinner } from '../../../components/ui/Spinner';
import { ErrorState } from '../../../components/ui/ErrorState';
import { diagramsService } from '../../../services/diagrams.service';
import { generationService } from '../../../services/generation.service';
import { applyCommands } from '../../../lib/apply-commands';
import type { UMLModel } from '../../../domain/uml-model';
import type { UMLCommand } from '../../../domain/uml-command';
import { cn } from '../../../lib/cn';

type Patch = Operation[];

const SAVE_STATUS_ICON = {
  idle: null,
  saving: <Loader className="h-3.5 w-3.5 animate-spin text-[var(--color-foreground-muted)]" />,
  saved: <CheckCircle className="h-3.5 w-3.5 text-[var(--color-success)]" />,
  error: <AlertCircle className="h-3.5 w-3.5 text-[var(--color-danger)]" />,
};

const COLLAB_SAVE_INTERVAL_MS = 15_000;
const THROTTLE_MS = 30;
const ECHO_WINDOW_MS = 300;
const DEDUPE_WINDOW_MS = 100;

function patchSignature(patch: Patch): string {
  return patch.map((op) => `${op.op}:${(op as { path?: string }).path ?? ''}`).join('|');
}

export default function EditorPage() {
  const { diagramId } = useParams<{ diagramId: string }>();
  const navigate = useNavigate();
  const diagramQuery = useDiagram(diagramId!);
  const saveMutation = useSaveDiagram(diagramId!);
  const { saveStatus, activePanel, setActivePanel } = useEditorStore();
  const { token } = useAuthStore();
  const [currentModel, setCurrentModel] = useState<UMLModel | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [latestGenId, setLatestGenId] = useState<string | null>(null);

  const editorRef = useRef<ApollonEditor | null>(null);
  const pendingQueueRef = useRef<string[]>([]);
  const clientIdRef = useRef<string>(crypto.randomUUID());

  const applyingRemotePatchRef = useRef(false);
  const echoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAppliedSignatureRef = useRef<string>('');
  const lastAppliedTimeRef = useRef<number>(0);

  const pendingPatchRef = useRef<Patch | null>(null);
  const lastSendTimeRef = useRef(0);
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lastSentSignatureRef = useRef<string>('');
  const lastSentTimeRef = useRef<number>(0);

  const pendingApplyRef = useRef<Patch[]>([]);
  const rafScheduledRef = useRef(false);

  const flushPendingApplies = useCallback(() => {
    rafScheduledRef.current = false;
    const editor = editorRef.current;
    const patches = pendingApplyRef.current;
    pendingApplyRef.current = [];
    if (!editor || patches.length === 0) return;

    applyingRemotePatchRef.current = true;
    if (echoTimerRef.current) clearTimeout(echoTimerRef.current);

    try {
      for (const p of patches) {
        editor.importPatch(p);
      }
    } catch (e) {
      console.warn('[patch-apply-error]', e);
    } finally {
      echoTimerRef.current = setTimeout(() => {
        applyingRemotePatchRef.current = false;
      }, ECHO_WINDOW_MS);
    }
  }, []);

  const applyToEditor = useCallback((editor: ApollonEditor, raw: string) => {
    try {
      const parsed = JSON.parse(raw) as { kind?: string; patch?: Patch };
      if (parsed.kind === 'patch' && parsed.patch) {
        lastAppliedSignatureRef.current = patchSignature(parsed.patch);
        lastAppliedTimeRef.current = Date.now();

        pendingApplyRef.current.push(parsed.patch);
        if (!rafScheduledRef.current) {
          rafScheduledRef.current = true;
          requestAnimationFrame(flushPendingApplies);
        }
      }
    } catch (e) {
      console.warn('[patch-parse-error]', e);
    }
  }, [flushPendingApplies]);

  const handleEditorReady = useCallback((editor: ApollonEditor | null) => {
    editorRef.current = editor;
    if (!editor) return;
    const pending = pendingQueueRef.current;
    pendingQueueRef.current = [];
    for (const raw of pending) {
      applyToEditor(editor, raw);
    }
  }, [applyToEditor]);

  const flushPatch = useCallback(() => {
    throttleTimerRef.current = null;
    const patch = pendingPatchRef.current;
    pendingPatchRef.current = null;
    if (!patch || patch.length === 0) return;
    if (collabStateRef.current !== 'connected') return;

    const payload = JSON.stringify({
      kind: 'patch',
      patch,
      senderId: clientIdRef.current,
      ts: Date.now(),
    });
    lastSendTimeRef.current = Date.now();
    collaborationRef.current.send(payload);
  }, []);

  const handleLocalPatch = useCallback((patch: Patch) => {
    if (applyingRemotePatchRef.current) {
      return;
    }

    const sig = patchSignature(patch);
    const now = Date.now();
    if (
      sig === lastAppliedSignatureRef.current &&
      now - lastAppliedTimeRef.current < ECHO_WINDOW_MS + 200
    ) {
      return;
    }

    if (
      sig === lastSentSignatureRef.current &&
      now - lastSentTimeRef.current < DEDUPE_WINDOW_MS
    ) {
      return;
    }
    lastSentSignatureRef.current = sig;
    lastSentTimeRef.current = now;

    if (pendingPatchRef.current) {
      pendingPatchRef.current = [...pendingPatchRef.current, ...patch];
    } else {
      pendingPatchRef.current = patch;
    }

    const elapsed = now - lastSendTimeRef.current;
    if (elapsed >= THROTTLE_MS) {
      flushPatch();
    } else if (!throttleTimerRef.current) {
      throttleTimerRef.current = setTimeout(flushPatch, THROTTLE_MS - elapsed);
    }
  }, [flushPatch]);

  const handleCollabMessage = useCallback((data: string) => {
    let parsed: { kind?: string; senderId?: string; patch?: Patch } | null = null;
    try {
      parsed = JSON.parse(data);
    } catch {
      return;
    }
    if (!parsed) return;

    if (parsed.kind === 'patch') {
      if (parsed.senderId === clientIdRef.current) return;
      const editor = editorRef.current;
      if (!editor) {
        pendingQueueRef.current.push(data);
        return;
      }
      applyToEditor(editor, data);
    }
  }, [applyToEditor]);

  const collaboration = useCollaboration({
    diagramId: diagramId!,
    token,
    onMessage: handleCollabMessage,
  });

  const collaborationRef = useRef(collaboration);
  collaborationRef.current = collaboration;
  const collabStateRef = useRef(collaboration.state);
  collabStateRef.current = collaboration.state;

  useEffect(() => {
    return () => {
      if (echoTimerRef.current) clearTimeout(echoTimerRef.current);
      if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
    };
  }, []);

  useLock(diagramId!, { enabled: collaboration.state !== 'connected' });

  const versionRef = useRef<number>(1);
  useEffect(() => {
    if (diagramQuery.data?.version != null) {
      versionRef.current = diagramQuery.data.version;
    }
  }, [diagramQuery.data?.version]);

  const currentModelRef = useRef<UMLModel | null>(null);
  useEffect(() => {
    currentModelRef.current = currentModel;
  }, [currentModel]);

  const lastSavedJsonRef = useRef<string>('');
  const hasInitializedLastSavedRef = useRef(false);
  useEffect(() => {
    if (!hasInitializedLastSavedRef.current && diagramQuery.data?.umlModel) {
      lastSavedJsonRef.current = JSON.stringify(diagramQuery.data.umlModel);
      hasInitializedLastSavedRef.current = true;
    }
  }, [diagramQuery.data?.umlModel]);

  useEffect(() => {
    const persist = () => {
      const m = currentModelRef.current;
      if (!m) return;
      const json = JSON.stringify(m);
      if (lastSavedJsonRef.current === json) return;
      try {
        const token = useAuthStore.getState().token;
        const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
        fetch(`${apiBase}/diagrams/${diagramId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ umlModel: m }),
          keepalive: true,
        });
        lastSavedJsonRef.current = json;
      } catch { /* ignore */ }
    };

    window.addEventListener('beforeunload', persist);
    return () => {
      window.removeEventListener('beforeunload', persist);
      persist();
    };
  }, [diagramId]);

  const saveMutationRef = useRef(saveMutation);
  useEffect(() => {
    saveMutationRef.current = saveMutation;
  }, [saveMutation]);

  useEffect(() => {
    if (collaboration.state !== 'connected') return;
    const interval = setInterval(() => {
      const m = currentModelRef.current;
      if (!m) return;
      const json = JSON.stringify(m);
      if (lastSavedJsonRef.current === json) return;
      saveMutationRef.current
        .mutateAsync({ umlModel: m, version: undefined })
        .then((res) => {
          lastSavedJsonRef.current = json;
          versionRef.current = res.version;
        })
        .catch(() => { /* silencioso */ });
    }, COLLAB_SAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [collaboration.state]);

  const saveFn = useCallback(async (umlModel: UMLModel) => {
    const isCollab = collabStateRef.current === 'connected';
    const expectedVersion = isCollab ? undefined : versionRef.current;
    try {
      const res = await saveMutation.mutateAsync({ umlModel, version: expectedVersion });
      versionRef.current = res.version;
      lastSavedJsonRef.current = JSON.stringify(umlModel);
    } catch (err) {
      throw err;
    }
  }, [saveMutation]);

  const { scheduleSave } = useDebouncedSave(saveFn);

  const lastModelJsonRef = useRef<string>('');

  const handleModelChange = useCallback((newModel: UMLModel) => {
    const json = JSON.stringify(newModel);
    if (json === lastModelJsonRef.current) return;
    lastModelJsonRef.current = json;
    setCurrentModel(newModel);
    if (collabStateRef.current !== 'connected') {
      scheduleSave(newModel);
    }
  }, [scheduleSave]);

  const diagram = diagramQuery.data;
  const emptyModel = useMemo<UMLModel>(
    () => ({
      id: diagram?.id ?? '',
      name: diagram?.name ?? 'Sin título',
      version: 1,
      classes: [],
      relations: [],
    }),
    [diagram?.id, diagram?.name],
  );

  const model = useMemo(
    () => currentModel ?? diagram?.umlModel ?? emptyModel,
    [currentModel, diagram?.umlModel, emptyModel],
  );

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
      setLatestGenId(res.generationId);
      navigate(`/generations/${res.generationId}`);
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Error al iniciar la generación de código');
    }
  };

  const handleDownloadPostman = async () => {
    if (!diagramId) return;
    try {
      let genId = latestGenId;
      if (!genId) {
        toast.info('Generando colección Postman…');
        const res = await diagramsService.generate(diagramId);
        genId = res.generationId;
        setLatestGenId(genId);
      }
      const blob = await generationService.download(genId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `postman-${genId}.zip`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Descargado');
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Error al descargar colección Postman');
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

        <div className="flex items-center gap-1.5 rounded-[var(--radius-control)] bg-white/10 px-2.5 py-1 text-xs font-medium text-white/80">
          {collaboration.state === 'connected' && (
            <>
              <span className="h-2 w-2 rounded-full bg-[var(--color-success)]" />
              <Users className="h-3.5 w-3.5 text-white/70" />
              <span>
                {collaboration.peerCount === 1
                  ? 'Conectado (tú)'
                  : `Conectado (${collaboration.peerCount} usuarios)`}
              </span>
            </>
          )}
          {collaboration.state === 'connecting' && (
            <>
              <span className="h-2 w-2 rounded-full bg-[var(--color-warning)] animate-pulse" />
              <span>Conectando…</span>
            </>
          )}
          {(collaboration.state === 'disconnected' || collaboration.state === 'error') && (
            <button
              onClick={collaboration.reconnect}
              className="flex items-center gap-1 text-red-300 hover:text-white transition-colors"
              title="Reconectar colaboración"
            >
              <span className="h-2 w-2 rounded-full bg-[var(--color-danger)]" />
              <span>Desconectado</span>
              <RefreshCw className="h-3 w-3 ml-1" />
            </button>
          )}
        </div>

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
          onClick={handleGenerateCode}
          className="flex items-center gap-1.5 rounded-[var(--radius-control)] bg-[var(--color-icon)] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
        >
          <Code className="h-4 w-4" />
          Generar código
        </button>
        <button
          onClick={handleDownloadPostman}
          className="flex items-center gap-1.5 rounded-[var(--radius-control)] bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20"
          title="Descargar colección Postman (ZIP)"
        >
          <Send className="h-4 w-4" />
          Descargar Postman
        </button>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="relative min-w-0 flex-1 overflow-hidden bg-[var(--color-background)]">
          <ApollonCanvas
            key={diagramId}
            initialModel={model}
            onModelChange={handleModelChange}
            onLocalPatch={handleLocalPatch}
            onEditorReady={handleEditorReady}
            collaborationEnabled={collaboration.state === 'connected'}
          />
        </div>

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

        {activePanel === 'ai' && model && (
          <AIAssistantPanel
            diagramId={diagramId!}
            model={model}
            onClose={() => setActivePanel(null)}
            onApplyCommands={handleApplyCommands}
          />
        )}
      </div>

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