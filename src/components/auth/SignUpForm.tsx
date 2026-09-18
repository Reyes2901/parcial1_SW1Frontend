import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { friendlyMessage } from '../../lib/errors';

const schema = z.object({
  name: z.string().min(2, 'Nombre demasiado corto'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});
type FormData = z.infer<typeof schema>;

export function SignUpForm() {
  const { register: registerUser } = useAuth();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = ({ name, email, password }: FormData) => {
    registerUser.mutate({ name, email, password }, {
      onError: (err) => setError('root', { message: friendlyMessage(err) }),
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <Input label="Nombre completo" type="text" autoFocus autoComplete="name" placeholder="Juan García" error={errors.name?.message} {...register('name')} />
      <Input label="Correo electrónico" type="email" autoComplete="email" placeholder="tu@correo.com" error={errors.email?.message} {...register('email')} />
      <Input label="Contraseña" type="password" autoComplete="new-password" placeholder="••••••••" error={errors.password?.message} {...register('password')} hint="Mínimo 8 caracteres" />
      <Input label="Confirmar contraseña" type="password" autoComplete="new-password" placeholder="••••••••" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
      {errors.root && (
        <p role="alert" className="text-sm text-[var(--color-danger)] bg-[var(--color-danger)]/10 px-3 py-2 rounded-[var(--radius-control)]">
          {errors.root.message}
        </p>
      )}
      <Button type="submit" loading={registerUser.isPending} className="w-full justify-center">
        Crear cuenta
      </Button>
    </form>
  );
}
