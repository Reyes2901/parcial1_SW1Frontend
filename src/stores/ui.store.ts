import { create } from 'zustand';

type Theme = 'light'; // dark diferido §5.6
type Density = 'comfortable' | 'compact';

interface UIState {
  theme: Theme;
  density: Density;
  sidebarCollapsed: boolean;
  setTheme: (theme: Theme) => void;
  setDensity: (density: Density) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: 'light',
  density: 'comfortable',
  sidebarCollapsed: false,
  setTheme: (theme) => set({ theme }),
  setDensity: (density) => set({ density }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
