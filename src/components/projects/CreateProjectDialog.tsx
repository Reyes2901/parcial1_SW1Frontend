import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useProjects } from '../../hooks/useProjects';

const schema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(80),
  description: z.string().max(200).optional(),
});
type FormData = z.infer<typeof schema>;

interface CreateProjectDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateProjectDialog({ open, onClose }: CreateProjectDialogProps) {
  const { createMutation } = useProjects();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data, { onSuccess: () => { reset(); onClose(); } });
  };

  return (
    <Modal open={open} onClose={onClose} title="Nuevo proyecto" description="Crea un proyecto para organizar tus diagramas UML.">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input label="Nombre del proyecto" autoFocus placeholder="Mi sistema" error={errors.name?.message} {...register('name')} />
        <Input label="Descripción (opcional)" placeholder="Breve descripción..." error={errors.description?.message} {...register('description')} />
        <div className="flex justify-end gap-2 mt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={createMutation.isPending}>Crear proyecto</Button>
        </div>
      </form>
    </Modal>
  );
}
