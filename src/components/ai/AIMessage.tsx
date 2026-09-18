import { Bot, User } from 'lucide-react';
import { cn } from '../../lib/cn';
import type { ChatMessage } from '../../hooks/useAIChat';

interface AIMessageProps { message: ChatMessage; }

export function AIMessage({ message }: AIMessageProps) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex gap-2', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-muted)]">
          <Bot className="h-3.5 w-3.5 text-[var(--color-icon)]" />
        </div>
      )}
      <div className={cn(
        'max-w-[80%] rounded-[var(--radius-card)] px-3 py-2 text-sm',
        isUser
          ? 'bg-[var(--color-primary)] text-white rounded-tr-none'
          : 'bg-[var(--color-background)] text-[var(--color-foreground)] rounded-tl-none border border-[var(--color-border)]',
      )}>
        <p className="leading-relaxed">{message.content}</p>
        {message.commands && (
          <p className="mt-1 text-xs opacity-70">{message.commands.length} operación(es) propuesta(s)</p>
        )}
      </div>
      {isUser && (
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]">
          <User className="h-3.5 w-3.5 text-white" />
        </div>
      )}
    </div>
  );
}
