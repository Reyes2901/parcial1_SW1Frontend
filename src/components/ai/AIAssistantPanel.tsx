import { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, RotateCcw, Mic, MicOff } from 'lucide-react';
import { Button } from '../ui/Button';
import { AIMessage } from './AIMessage';
import { AICommandPreview } from './AICommandPreview';
import { useAIChat } from '../../hooks/useAIChat';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import type { UMLModel } from '../../domain/uml-model';

interface AIAssistantPanelProps {
  diagramId: string;
  model: UMLModel;
  onClose: () => void;
  onApplyCommands: (commands: ReturnType<typeof useAIChat>['pendingCommands']) => void;
}

const SUGGESTIONS = [
  'Añade una clase Usuario con atributos básicos',
  'Crea una relación de herencia entre Empleado y Persona',
  'Añade un método guardar() a todas las entidades',
  'Sugiere mejoras para el diagrama actual',
];

export function AIAssistantPanel({ diagramId, model, onClose, onApplyCommands }: AIAssistantPanelProps) {
  const [input, setInput] = useState('');
  const { messages, pendingCommands, isLoading, sendMessage, confirmCommands, rejectCommands, undo } = useAIChat(diagramId);
  const { isRecording, supported, start, stop } = useVoiceInput();
  const bottomRef = useRef<HTMLDivElement>(null);

  const handleMic = () => {
    if (isRecording) {
      stop();
    } else {
      start((text) => {
        setInput((prev) => (prev ? `${prev} ${text}` : text));
      });
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim(), model);
    setInput('');
  };

  const handleConfirm = () => {
    const cmds = confirmCommands();
    onApplyCommands(cmds);
  };

  return (
    <div className="flex flex-col w-[360px] flex-shrink-0 bg-[var(--color-secondary)] border-l border-[var(--color-border)] h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-[var(--color-icon)]" />
          <span className="text-sm font-semibold text-[var(--color-foreground)]">Asistente IA</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-[var(--color-background-hover)] transition-colors" aria-label="Cerrar asistente">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-[var(--color-foreground-muted)] text-center mt-4">
              ¿En qué puedo ayudarte con tu diagrama UML?
            </p>
            <div className="flex flex-col gap-2 mt-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => { setInput(s); }}
                  className="text-left text-xs px-3 py-2 rounded-[var(--radius-control)] bg-[var(--color-primary-muted)] text-[var(--color-foreground)] hover:bg-[var(--color-background-hover)] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => <AIMessage key={msg.id} message={msg} />)
        )}

        {/* Pending commands confirmation */}
        {pendingCommands && (
          <AICommandPreview
            commands={pendingCommands}
            onConfirm={handleConfirm}
            onReject={rejectCommands}
          />
        )}

        <div ref={bottomRef} />
      </div>

      {/* Undo button if applicable */}
      {messages.some((m) => m.role === 'assistant' && m.commands) && (
        <div className="px-4 pb-2">
          <button
            onClick={() => undo.mutate()}
            disabled={undo.isPending}
            className="flex items-center gap-1.5 text-xs text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Deshacer última operación IA
          </button>
        </div>
      )}

      {/* Composer */}
      <div className="p-3 border-t border-[var(--color-border)]">
        <div className="flex gap-2">
          {supported && (
            <button
              type="button"
              onClick={handleMic}
              title="Dictar comando por voz"
              aria-label="Dictar comando por voz"
              className={`flex items-center justify-center p-2 rounded-[var(--radius-control)] border border-[var(--color-border)] transition-all ${
                isRecording
                  ? 'bg-[var(--color-danger)] text-white animate-pulse border-transparent'
                  : 'bg-[var(--color-background)] text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]'
              }`}
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          )}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Escribe un comando..."
            disabled={isLoading}
            className="flex-1 text-sm px-3 py-2 rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] placeholder:text-[var(--color-foreground-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--color-icon)] disabled:opacity-50"
            aria-label="Mensaje para el asistente IA"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            loading={isLoading}
            size="md"
            className="px-3"
            aria-label="Enviar mensaje"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
