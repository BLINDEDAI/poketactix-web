// Typed failure for the PokéAPI data seam. No internal details are surfaced to the UI (invariant):
// the UI maps these to a clean user-facing message; the raw cause stays in the error object only.

export type PokeApiErrorKind =
  | 'NETWORK' // fetch rejected (offline, DNS, CSP block)
  | 'TIMEOUT' // request exceeded the deadline (US-024)
  | 'NOT_FOUND' // 404 — resource does not exist
  | 'RATE_LIMITED' // 429
  | 'SERVER' // 5xx or other non-OK status
  | 'INVALID_SHAPE' // response parsed but failed validation (US-040 boundary)

export class PokeApiError extends Error {
  readonly kind: PokeApiErrorKind

  constructor(kind: PokeApiErrorKind, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'PokeApiError'
    this.kind = kind
  }
}

/** Discriminated result so callers handle failure explicitly rather than via thrown strings. */
export type Result<T> = { ok: true; value: T } | { ok: false; error: PokeApiError }

export function ok<T>(value: T): Result<T> {
  return { ok: true, value }
}

export function err<T>(error: PokeApiError): Result<T> {
  return { ok: false, error }
}
