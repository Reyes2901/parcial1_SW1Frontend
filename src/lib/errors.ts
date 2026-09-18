export class AppError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(message: string, status: number, code: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const FRIENDLY_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.',
  FORBIDDEN: 'No tienes permiso para realizar esta acción.',
  NOT_FOUND: 'El recurso solicitado no existe.',
  VALIDATION_ERROR: 'Los datos enviados no son válidos.',
  CONFLICT: 'Existe un conflicto con los datos actuales.',
  SERVER_ERROR: 'Error del servidor. Por favor, inténtalo de nuevo.',
};

export function normalizeError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof Error) {
    return new AppError(err.message, 0, 'UNKNOWN');
  }
  return new AppError('Error desconocido', 0, 'UNKNOWN');
}

export function friendlyMessage(err: unknown): string {
  const appErr = normalizeError(err);
  return FRIENDLY_MESSAGES[appErr.code] ?? appErr.message ?? 'Ha ocurrido un error inesperado.';
}
