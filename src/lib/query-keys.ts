export const queryKeys = {
  me: ['me'] as const,
  projects: ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
  projectMembers: (id: string) => ['projects', id, 'members'] as const,
  projectInvitations: (id: string) => ['projects', id, 'invitations'] as const,
  diagrams: (projectId: string) => ['projects', projectId, 'diagrams'] as const,
  diagram: (id: string) => ['diagrams', id] as const,
  diagramVersions: (id: string) => ['diagrams', id, 'versions'] as const,
  generation: (id: string) => ['generations', id] as const,
  generationFiles: (id: string) => ['generations', id, 'files'] as const,
} as const;
