import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiClient, buildFilePatchPath } from './api-client';
import { useAuthStore } from '../stores/auth.store';
import { AppError } from '../lib/errors';

describe('apiClient', () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession();
    vi.restoreAllMocks();
  });

  it('buildFilePatchPath encodes subpaths correctly', () => {
    const path = buildFilePatchPath('gen-123', 'src/main/java/com/example/Foo.java');
    expect(path).toBe('/generations/gen-123/files/src/main/java/com/example/Foo.java');
  });

  it('injects Authorization header when JWT token exists in auth store', async () => {
    useAuthStore.getState().setSession({
      token: 'jwt-secret-token',
      user: { id: 'u1', email: 'test@example.com', name: 'Test User' },
    });

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    vi.stubGlobal('fetch', mockFetch);

    await apiClient.get('/projects');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, init] = mockFetch.mock.calls[0];
    const headers = init?.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer jwt-secret-token');
  });

  it('handles 409 conflict on /locks without throwing AppError', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ lockedBy: 'User B' }), { status: 409 }),
    );
    vi.stubGlobal('fetch', mockFetch);

    const result = await apiClient.post<{ locked: boolean; by: string }>('/diagrams/d1/locks');
    expect(result).toEqual({ locked: true, by: 'User B' });
  });

  it('parses error response and throws AppError on 403 Forbidden', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Access denied', code: 'FORBIDDEN' }), { status: 403 }),
    );
    vi.stubGlobal('fetch', mockFetch);

    await expect(apiClient.get('/projects/secret')).rejects.toThrow(AppError);
  });

  it('triggers logout on 401 Unauthorized when token was present', async () => {
    useAuthStore.getState().setSession({
      token: 'valid-token',
      user: { id: 'u1', email: 'a@b.com', name: 'User' },
    });

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Token expired', code: 'UNAUTHORIZED' }), { status: 401 }),
    );
    vi.stubGlobal('fetch', mockFetch);

    await expect(apiClient.get('/projects')).rejects.toThrow('Sesión expirada');
    expect(useAuthStore.getState().token).toBeNull();
  });

  it('throws AppError without logout on 401 Unauthorized when no token was present', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Invalid credentials', code: 'UNAUTHORIZED' }), { status: 401 }),
    );
    vi.stubGlobal('fetch', mockFetch);

    await expect(apiClient.post('/auth/login', { email: 'a', password: 'b' })).rejects.toThrow('Credenciales inválidas');
    expect(useAuthStore.getState().token).toBeNull();
  });
});
