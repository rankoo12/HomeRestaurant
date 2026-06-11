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
  | 'EMAIL_TAKEN' // 409
  | 'INSUFFICIENT_SEATS' // 409 — overbooking abort (docs/specs/booking-and-concurrency.md §8)
  | 'INVALID_BOOKING_STATE' // 409 — action not valid for the booking's current status
  | 'PROFILE_EXISTS' // 409 — user already has a chef profile (chef-onboarding spec §4)
  | 'VERIFICATION_REQUIRED' // 403 — unverified chef tried to publish (events spec §4)
  | 'INVALID_EVENT_STATE' // 409 — event transition/edit not valid for its status (events spec §5)
  | 'REVIEW_NOT_ELIGIBLE' // 409 — booking not confirmed / event not completed (reviews spec §4)
  | 'ALREADY_REVIEWED' // 409 — one review per guest per event (reviews spec §4)
  | 'INVALID_STATE' // 409 — generic wrong-current-state for admin actions (admin spec §4)
  | 'RATE_LIMITED'; // 429 — too many requests (admin spec §9 hardening)

const STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  INVALID_CREDENTIALS: 401,
  INVALID_REFRESH: 401,
  FORBIDDEN: 403,
  ACCOUNT_SUSPENDED: 403,
  NOT_FOUND: 404,
  EMAIL_TAKEN: 409,
  INSUFFICIENT_SEATS: 409,
  INVALID_BOOKING_STATE: 409,
  PROFILE_EXISTS: 409,
  VERIFICATION_REQUIRED: 403,
  INVALID_EVENT_STATE: 409,
  REVIEW_NOT_ELIGIBLE: 409,
  ALREADY_REVIEWED: 409,
  INVALID_STATE: 409,
  RATE_LIMITED: 429,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  /** Optional structured payload (e.g. the INSUFFICIENT_SEATS details block). */
  readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, message?: string, details?: Record<string, unknown>) {
    super(message ?? code);
    this.name = 'AppError';
    this.code = code;
    this.status = STATUS[code];
    this.details = details;
  }
}
