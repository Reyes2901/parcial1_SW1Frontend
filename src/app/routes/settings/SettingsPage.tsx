import { useState } from 'react';
import { Topbar } from '../../../components/layout/Topbar';
import { cn } from '../../../lib/cn';
import { useAuthStore } from '../../../stores/auth.store';

type Tab = 'profile' | 'security' | 'preferences' | 'appearance';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const { user } = useAuthStore();

  const tabs: { id: Tab; label: string }[] = [
    { id: 'profile', label: 'Perfil' },
    { id: 'security', label: 'Seguridad' },
    { id: 'preferences', label: 'Preferencias' },
    { id: 'appearance', label: 'Apariencia' },
  ];

  return (
    <div className="flex flex-col h-full">
      <Topbar>
        <h1 className="text-sm font-semibold text-[var(--color-foreground)]">Configuración</h1>
      </Topbar>
      <div className="flex flex-1 overflow-hidden">
        {/* Tab sidebar */}
        <div className="w-48 flex-shrink-0 border-r border-[var(--color-border)] bg-[var(--color-secondary)] p-3">
          <div className="flex flex-col gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'text-left px-3 py-2 rounded-[var(--radius-control)] text-sm transition-colors',
                  activeTab === tab.id
                    ? 'bg-[var(--color-primary-muted)] text-[var(--color-foreground)] font-medium'
                    : 'text-[var(--color-foreground-muted)] hover:bg-[var(--color-background-hover)]',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 max-w-2xl">
          {activeTab === 'profile' && (
            <div className="flex flex-col gap-6">
              <h2 className="text-lg font-semibold">Perfil</h2>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-2xl font-semibold text-white">
                  {user?.name?.charAt(0) ?? '?'}
                </div>
                <div>
                  <p className="font-medium">{user?.name}</p>
                  <p className="text-sm text-[var(--color-foreground-muted)]">{user?.email}</p>
                </div>
              </div>
              <p className="text-sm text-[var(--color-foreground-muted)]">Edición de perfil disponible próximamente.</p>
            </div>
          )}
          {activeTab === 'security' && (
            <div className="flex flex-col gap-6">
              <h2 className="text-lg font-semibold">Seguridad</h2>
              <p className="text-sm text-[var(--color-foreground-muted)]">Cambio de contraseña disponible próximamente.</p>
            </div>
          )}
          {activeTab === 'preferences' && (
            <div className="flex flex-col gap-6">
              <h2 className="text-lg font-semibold">Preferencias</h2>
              <p className="text-sm text-[var(--color-foreground-muted)]">Confirmar operaciones destructivas: activado por defecto.</p>
            </div>
          )}
          {activeTab === 'appearance' && (
            <div className="flex flex-col gap-6">
              <h2 className="text-lg font-semibold">Apariencia</h2>
              <p className="text-sm text-[var(--color-foreground-muted)]">
                Tema oscuro diferido a la siguiente fase (§5.6). Solo tema claro disponible.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
