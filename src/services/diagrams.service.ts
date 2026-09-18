import { apiClient } from './api-client';
import type { UMLModel } from '../domain/uml-model';
import type { UMLCommand } from '../domain/uml-command';

export interface Diagram {
  id: string;
  projectId: string;
  name: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  model: UMLModel;
}

export interface DiagramVersion {
  id: string;
  version: number;
  createdAt: string;
  createdBy: string;
}

export interface LockResponse { locked?: boolean; by?: string; lockedBy?: string; expiresAt?: string; }
export interface AICommandResponse { commands: UMLCommand[]; requiresConfirmation?: boolean; description?: string; }

export const diagramsService = {
  list: (projectId: string) => apiClient.get<Diagram[]>(`/projects/${projectId}/diagrams`),
  get: (id: string) => apiClient.get<Diagram>(`/diagrams/${id}`),
  create: (projectId: string, payload: { name: string }) =>
    apiClient.post<Diagram>(`/projects/${projectId}/diagrams`, payload),
  save: (id: string, model: UMLModel) => apiClient.put<Diagram>(`/diagrams/${id}`, { model }),
  versions: (id: string) => apiClient.get<DiagramVersion[]>(`/diagrams/${id}/versions`),
  createVersion: (id: string) => apiClient.post(`/diagrams/${id}/versions`),
  acquireLock: (id: string, classId: string) =>
    apiClient.post<LockResponse>(`/diagrams/${id}/locks`, { classId }),
  releaseLock: (id: string, classId: string) =>
    apiClient.delete<void>(`/diagrams/${id}/locks/${classId}`),
  aiCommand: (id: string, prompt: string, model: UMLModel) =>
    apiClient.post<AICommandResponse>(`/diagrams/${id}/ai/command`, { prompt, model }),
  aiUndo: (id: string) => apiClient.post<void>(`/diagrams/${id}/ai/undo`),
  importXmi: (id: string, xmi: string) =>
    apiClient.post<UMLCommand[]>(`/diagrams/${id}/import/xmi`, { xmi }),
  importImage: (id: string, base64: string, mimeType: string) =>
    apiClient.post<UMLCommand[]>(`/diagrams/${id}/import/image`, { image: base64, mimeType }),
  generate: (id: string) => apiClient.post<{ generationId: string }>(`/diagrams/${id}/generate`),
};
