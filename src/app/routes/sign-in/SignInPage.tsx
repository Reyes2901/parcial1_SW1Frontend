import { Link } from 'react-router-dom';
import { GoogleButton } from '../../../components/auth/GoogleButton';
import { SignInForm } from '../../../components/auth/SignInForm';

export default function SignInPage() {
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
              <line x1="6" y1="8" x2="6" y2="12" stroke="white" strokeWidth="2" />
              <line x1="18" y1="8" x2="18" y2="12" stroke="white" strokeWidth="2" />
              <line x1="6" y1="12" x2="18" y2="12" stroke="white" strokeWidth="2" />
              <line x1="12" y1="12" x2="12" y2="16" stroke="white" strokeWidth="2" />
            </svg>
          </div>
          <span className="text-white font-semibold tracking-tight">CASE UML</span>
        </div>
        <div>
          <h1 className="text-4xl font-semibold text-white leading-tight tracking-tight">
            Modela, colabora<br />y genera código.
          </h1>
          <p className="mt-4 text-base text-white/70 leading-relaxed">
            Diseña diagramas UML de clases, invita a tu equipo y genera código Spring Boot listo para producción.
          </p>
          <div className="mt-10 flex flex-col gap-3">
            {[
              'Editor visual Apollon integrado',
              'Asistente IA para diseño de clases',
              'Generación de código Spring Boot',
              'Colaboración en tiempo real',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm text-white/80">
                <div className="h-1.5 w-1.5 rounded-full bg-[var(--color-icon)]" />
                {feature}
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-white/40">© 2024 CASE UML Platform</p>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[var(--color-background)]">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">CASE UML</h1>
          </div>
          <div className="bg-[var(--color-secondary)] rounded-[var(--radius-modal)] shadow-[var(--shadow-lg)] p-8 flex flex-col gap-6">
            <div>
              <h2 className="text-xl font-semibold text-[var(--color-foreground)]">Iniciar sesión</h2>
              <p className="text-sm text-[var(--color-foreground-muted)] mt-1">Accede a tu cuenta para continuar.</p>
            </div>
            <GoogleButton />
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[var(--color-border)]" />
              <span className="text-xs text-[var(--color-foreground-faint)]">o</span>
              <div className="flex-1 h-px bg-[var(--color-border)]" />
            </div>
            <SignInForm />
            <p className="text-center text-sm text-[var(--color-foreground-muted)]">
              ¿No tienes cuenta?{' '}
              <Link to="/sign-up" className="text-[var(--color-icon)] font-medium hover:underline">
                Regístrate
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
