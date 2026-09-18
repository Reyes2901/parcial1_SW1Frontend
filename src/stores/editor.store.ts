import { create } from 'zustand';

type ActivePanel = 'inspector' | 'ai' | null;
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface LockState {
  lockedBy: string;
  expiresAt?: number;
}

interface EditorState {
  activePanel: ActivePanel;
  zoom: number;
  selectedId: string | null;
  lockState: LockState | null;
  saveStatus: SaveStatus;
  setActivePanel: (panel: ActivePanel) => void;
  setZoom: (zoom: number) => void;
  setSelectedId: (id: string | null) => void;
  setLockState: (lock: LockState | null) => void;
  setSaveStatus: (status: SaveStatus) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  activePanel: null,
  zoom: 1,
  selectedId: null,
  lockState: null,
  saveStatus: 'idle',
  setActivePanel: (panel) => set({ activePanel: panel }),
  setZoom: (zoom) => set({ zoom }),
  setSelectedId: (id) => set({ selectedId: id }),
  setLockState: (lock) => set({ lockState: lock }),
  setSaveStatus: (status) => set({ saveStatus: status }),
}));
