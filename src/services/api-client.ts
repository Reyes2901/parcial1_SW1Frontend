import { AppError } from '../lib/errors';
import { useAuthStore } from '../stores/auth.store';
import { toast } from 'sonner';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

interface BackendError {
  error: string;
  code: string;
  details?: unknown;
}

interface LockConflictResponse {
  locked: true;
  by: string;
}

function getToken(): string | null {
  return useAuthStore.getState().token;
}

function handleGlobalLogout(): void {
  useAuthStore.getState().clearSession();
  try {
    window.location.href = `/sign-in?next=${encodeURIComponent(window.location.pathname)}`;
  } catch {
    /* ignore jsdom navigation error in tests */
  }
}

async function parseResponse<T>(
  res: Response,
  path: string,
): Promise<T | LockConflictResponse> {
  // Lock 409 — no lanzar, devolver
  if (res.status === 409 && path.includes('/locks')) {
    const body = await res.json().catch(() => ({}));
    return { locked: true, by: (body as { lockedBy?: string }).lockedBy ?? 'otro usuario' };
  }

  if (!res.ok) {
    let errBody: Partial<BackendError> = {};
    try { errBody = await res.json(); } catch { /* no body */ }

    if (res.status === 401) {
      const hadToken = !!getToken();
      if (hadToken) handleGlobalLogout();
      throw new AppError(
        hadToken ? 'Sesión expirada' : 'Credenciales inválidas',
        401,
        errBody.code ?? 'UNAUTHORIZED',
        errBody.details,
      );
    }
    if (res.status === 403) {
      toast.error('No tienes permiso para realizar esta acción.');
      throw new AppError('Forbidden', 403, errBody.code ?? 'FORBIDDEN', errBody.details);
    }
    if (res.status >= 500) {
      toast.error('Error del servidor. Por favor, inténtalo de nuevo.');
      console.error('[apiClient] Server error', { path, status: res.status, body: errBody });
      throw new AppError(errBody.error ?? 'Server error', res.status, errBody.code ?? 'SERVER_ERROR', errBody.details);
    }
    throw new AppError(
      errBody.error ?? `HTTP ${res.status}`,
      res.status,
      errBody.code ?? 'REQUEST_ERROR',
      errBody.details,
    );
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

function buildHeaders(extra?: HeadersInit): HeadersInit {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extra as Record<string, string> ?? {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

function timeout(ms: number): AbortController {
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), ms);
  return ctrl;
}

function isLongRequest(path: string): boolean {
  return path.includes('/generate') || path.includes('/import');
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts?: RequestInit,
): Promise<T> {
  const ms = isLongRequest(path) ? 120_000 : 30_000;
  const ctrl = timeout(ms);
  const signal = opts?.signal ?? ctrl.signal;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: buildHeaders(opts?.headers),
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
    ...opts,
  });

  return parseResponse<T>(res, path) as Promise<T>;
}

export function buildFilePatchPath(generationId: string, filePath: string): string {
  const encoded = filePath.split('/').map(encodeURIComponent).join('/');
  return `/generations/${generationId}/files/${encoded}`;
}

export const apiClient = {
  get: <T>(path: string, opts?: RequestInit) => request<T>('GET', path, undefined, opts),
  post: <T>(path: string, body?: unknown, opts?: RequestInit) => request<T>('POST', path, body, opts),
  put: <T>(path: string, body?: unknown, opts?: RequestInit) => request<T>('PUT', path, body, opts),
  patch: <T>(path: string, body?: unknown, opts?: RequestInit) => request<T>('PATCH', path, body, opts),
  delete: <T>(path: string, opts?: RequestInit) => request<T>('DELETE', path, undefined, opts),
};
