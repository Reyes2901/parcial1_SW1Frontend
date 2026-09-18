import { Link } from 'react-router-dom';
import { GoogleButton } from '../../../components/auth/GoogleButton';
import { SignUpForm } from '../../../components/auth/SignUpForm';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] flex-shrink-0 bg-[var(--color-primary)] p-12">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 flex items-center justify-center rounded-[var(--radius-control)] bg-white/15">
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
              <rect x="2" y="2" width="8" height="6" rx="1" />
              <rect x="14" y="2" width="8" height="6" rx="1" />
              <rect x="8" y="16" width="8" height="6" rx="1" />
            </svg>
          </div>
          <span className="text-white font-semibold">CASE UML</span>
        </div>
        <div>
          <h1 className="text-4xl font-semibold text-white leading-tight">Únete a la plataforma</h1>
          <p className="mt-4 text-white/70">Crea tu cuenta y empieza a modelar.</p>
        </div>
        <p className="text-xs text-white/40">© 2024 CASE UML Platform</p>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[var(--color-background)]">
        <div className="w-full max-w-sm">
          <div className="bg-[var(--color-secondary)] rounded-[var(--radius-modal)] shadow-[var(--shadow-lg)] p-8 flex flex-col gap-6">
            <div>
              <h2 className="text-xl font-semibold text-[var(--color-foreground)]">Crear cuenta</h2>
              <p className="text-sm text-[var(--color-foreground-muted)] mt-1">Completa el formulario para registrarte.</p>
            </div>
            <GoogleButton />
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[var(--color-border)]" />
              <span className="text-xs text-[var(--color-foreground-faint)]">o</span>
              <div className="flex-1 h-px bg-[var(--color-border)]" />
            </div>
            <SignUpForm />
            <p className="text-center text-sm text-[var(--color-foreground-muted)]">
              ¿Ya tienes cuenta?{' '}
              <Link to="/sign-in" className="text-[var(--color-icon)] font-medium hover:underline">Inicia sesión</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
