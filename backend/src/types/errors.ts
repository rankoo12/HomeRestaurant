/**
 * Canonical domain error codes + a typed AppError. Reuse these codes — don't
 * invent new error strings (see CLAUDE.md pre-implementation protocol).
 * The API maps `AppError.status` to the HTTP status and serializes
 * `{ error: { code, message } }`.
 */

export type ErrorCode =
  | 'VALIDATION_ERROR' // 400
  | 'UNAUTHENTICATED' // 401
  | 'INVALID_CREDENTIALS' // 401
  | 'INVALID_REFRESH' // 401
  | 'FORBIDDEN' // 403
  | 'ACCOUNT_SUSPENDED' // 403
  | 'NOT_FOUND' // 404
  | 'EMAIL_TAKEN'; // 409

const STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  INVALID_CREDENTIALS: 401,
  INVALID_REFRESH: 401,
  FORBIDDEN: 403,
  ACCOUNT_SUSPENDED: 403,
  NOT_FOUND: 404,
  EMAIL_TAKEN: 409,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;

  constructor(code: ErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'AppError';
    this.code = code;
    this.status = STATUS[code];
  }
}
