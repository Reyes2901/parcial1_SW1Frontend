import { useParams } from 'react-router-dom';
import { Topbar } from '../../../components/layout/Topbar';
import { GenerationWorkbench } from '../../../components/code-generation/GenerationWorkbench';

export default function GenerationPage() {
  const { generationId } = useParams<{ generationId: string }>();
  return (
    <div className="flex flex-col h-full">
      <Topbar>
        <h1 className="text-sm font-semibold text-[var(--color-foreground)]">Código generado</h1>
      </Topbar>
      <div className="flex-1 overflow-hidden">
        <GenerationWorkbench generationId={generationId!} />
      </div>
    </div>
  );
}
