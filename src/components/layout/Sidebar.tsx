import { Link, useLocation } from 'react-router-dom';
import { FolderKanban, LayoutTemplate, Activity, Settings, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useUIStore } from '../../stores/ui.store';
import { useAuth } from '../../hooks/useAuth';

const navItems = [
  { icon: FolderKanban, label: 'Mis proyectos', to: '/projects' },
  { icon: LayoutTemplate, label: 'Plantillas', to: '/templates' },
  { icon: Activity, label: 'Actividad', to: '/activity' },
];

export function Sidebar() {
  const { pathname } = useLocation();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { user, logout } = useAuth();

  return (
    <aside
      className={cn(
        'flex flex-col bg-[var(--color-primary)] text-[var(--color-foreground-inverse)] transition-all duration-200 relative flex-shrink-0',
        sidebarCollapsed ? 'w-16' : 'w-[248px]',
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] bg-white/15 flex-shrink-0">
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
            <rect x="2" y="2" width="8" height="6" rx="1" />
            <rect x="14" y="2" width="8" height="6" rx="1" />
            <rect x="8" y="16" width="8" height="6" rx="1" />
            <line x1="6" y1="8" x2="6" y2="12" stroke="currentColor" strokeWidth="2" />
            <line x1="18" y1="8" x2="18" y2="12" stroke="currentColor" strokeWidth="2" />
            <line x1="6" y1="12" x2="18" y2="12" stroke="currentColor" strokeWidth="2" />
            <line x1="12" y1="12" x2="12" y2="16" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>
        {!sidebarCollapsed && (
          <span className="text-sm font-semibold tracking-tight whitespace-nowrap">CASE UML</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 flex flex-col gap-1">
        {navItems.map(({ icon: Icon, label, to }) => {
          const active = pathname === to || pathname.startsWith(to + '/');
          return (
            <Link
              key={to}
              to={to}
              title={sidebarCollapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-[var(--radius-control)] text-sm font-medium transition-colors duration-150',
                active
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white',
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {!sidebarCollapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-2 border-t border-white/10 flex flex-col gap-1">
        <Link
          to="/settings"
          title={sidebarCollapsed ? 'Configuración' : undefined}
          className="flex items-center gap-3 px-3 py-2 rounded-[var(--radius-control)] text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          <Settings className="h-4 w-4 flex-shrink-0" />
          {!sidebarCollapsed && <span>Configuración</span>}
        </Link>
        {user && (
          <div className={cn('flex items-center gap-3 px-3 py-2', sidebarCollapsed && 'justify-center')}>
            <div className="h-7 w-7 rounded-full bg-[var(--color-icon)] flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
              {(user.name ?? user.email ?? '?').charAt(0).toUpperCase()}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{user.name ?? 'Usuario'}</p>
                <p className="text-xs text-white/50 truncate">{user.email ?? '—'}</p>
              </div>
            )}
            {!sidebarCollapsed && (
              <button
                onClick={() => logout.mutate()}
                className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                aria-label="Cerrar sesión"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-6 h-6 w-6 rounded-full bg-[var(--color-primary)] border border-white/20 flex items-center justify-center text-white hover:bg-[var(--color-primary-hover)] transition-colors z-10"
        aria-label={sidebarCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
      >
        {sidebarCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </aside>
  );
}
