// localStorage persistence for the single current battle (AC-14).
// Single key with a schemaVersion; incompatible versions are discarded, never crashed on.
// localStorage may be unavailable (private mode, quota, disabled) — every access is guarded.

import type { Battle } from '@/types/battle'

export const STORAGE_KEY = 'poketactix:currentBattle'

/** Bump when the persisted Battle shape changes incompatibly. Older payloads are discarded. */
export const SCHEMA_VERSION = 1

interface PersistedEnvelope {
  schemaVersion: number
  battle: Battle
}

function safeLocalStorage(): Storage | null {
  try {
    // Accessing localStorage can throw in sandboxed iframes / disabled-storage browsers.
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null
  }
}

/** Serialize + write the current battle. Silently no-ops when storage is unavailable/full. */
export function saveBattle(battle: Battle): void {
  const store = safeLocalStorage()
  if (store === null) return
  const envelope: PersistedEnvelope = { schemaVersion: SCHEMA_VERSION, battle }
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(envelope))
  } catch {
    // Quota exceeded or write blocked — persistence is best-effort; the in-memory board is unaffected.
  }
}

/**
 * Read + validate the persisted battle. Returns `null` when absent, unreadable, malformed, or on an
 * incompatible schemaVersion (the incompatible payload is discarded so the app starts fresh).
 */
export function loadBattle(): Battle | null {
  const store = safeLocalStorage()
  if (store === null) return null

  let raw: string | null
  try {
    raw = store.getItem(STORAGE_KEY)
  } catch {
    return null
  }
  if (raw === null) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    clearBattle()
    return null
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    (parsed as { schemaVersion?: unknown }).schemaVersion !== SCHEMA_VERSION
  ) {
    // Incompatible / unknown version — discard rather than risk a malformed hydrate.
    clearBattle()
    return null
  }

  const battle = (parsed as PersistedEnvelope).battle
  if (typeof battle !== 'object' || battle === null) {
    clearBattle()
    return null
  }
  return battle
}

export function clearBattle(): void {
  const store = safeLocalStorage()
  if (store === null) return
  try {
    store.removeItem(STORAGE_KEY)
  } catch {
    // ignore — nothing else we can do
  }
}
