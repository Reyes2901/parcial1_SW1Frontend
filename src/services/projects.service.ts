import { apiClient } from './api-client';

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
  diagramCount?: number;
  members?: ProjectMember[];
}

export interface ProjectMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: 'owner' | 'editor' | 'viewer';
}

export interface CreateProjectPayload { name: string; description?: string; }

export const projectsService = {
  list: () => apiClient.get<Project[]>('/projects'),
  get: (id: string) => apiClient.get<Project>(`/projects/${id}`),
  create: (payload: CreateProjectPayload) => apiClient.post<Project>('/projects', payload),
  update: (id: string, payload: Partial<CreateProjectPayload>) => apiClient.put<Project>(`/projects/${id}`, payload),
  delete: (id: string) => apiClient.delete<void>(`/projects/${id}`),
  getMembers: (id: string) => apiClient.get<ProjectMember[]>(`/projects/${id}/members`),
  invite: (id: string, email: string, role: 'editor' | 'viewer') =>
    apiClient.post(`/projects/${id}/invitations`, { email, role }),
};
