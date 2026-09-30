import { apiClient, buildFilePatchPath } from './api-client';
import { useAuthStore } from '../stores/auth.store';

export interface GenerationFile {
  path: string;
  content: string;
  language: string;
}

export interface Generation {
  id: string;
  diagramId: string;
  status: 'queued' | 'generating' | 'completed' | 'error';
  createdAt: string;
  completedAt?: string;
  error?: string;
}

export const generationService = {
  get: (id: string) => apiClient.get<Generation>(`/generations/${id}`),
  files: (id: string) => apiClient.get<GenerationFile[]>(`/generations/${id}/files`),
  patchFile: (id: string, filePath: string, content: string) =>
    apiClient.patch<GenerationFile>(buildFilePatchPath(id, filePath), { content }),
  download: async (id: string) => {
    const token = useAuthStore.getState().token;
    const base = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
    const res = await fetch(`${base}/generations/${id}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    return res.blob();
  },
};
