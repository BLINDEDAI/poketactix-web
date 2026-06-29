// Unit/integration tests: persistence.ts — saveBattle, loadBattle, clearBattle
// Covers AC-14: localStorage serialize/hydrate + incompatible-schemaVersion discard.

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  saveBattle,
  loadBattle,
  clearBattle,
  STORAGE_KEY,
  SCHEMA_VERSION,
} from '@/store/persistence'
import type { Battle } from '@/types/battle'

// Minimal valid Battle fixture for persistence tests.
function makeBattle(overrides: Partial<Battle> = {}): Battle {
  return {
    id: 'test-battle-1',
    name: 'Test Battle',
    generation: 'GEN_6',
    mode: 'SINGLES',
    view: 'EDIT',
    ownTeam: { side: 'own', pokemon: [] },
    opponentTeam: { side: 'opponent', pokemon: [] },
    ...overrides,
  }
}

describe('saveBattle / loadBattle — round-trip', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('writes a valid envelope to localStorage', () => {
    const battle = makeBattle()
    saveBattle(battle)
    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!)
    expect(parsed.schemaVersion).toBe(SCHEMA_VERSION)
    expect(parsed.battle.id).toBe('test-battle-1')
  })

  it('hydrates the saved battle back', () => {
    const battle = makeBattle({ name: 'My Battle', generation: 'GEN_5' })
    saveBattle(battle)
    const loaded = loadBattle()
    expect(loaded).not.toBeNull()
    expect(loaded!.name).toBe('My Battle')
    expect(loaded!.generation).toBe('GEN_5')
    expect(loaded!.mode).toBe('SINGLES')
    expect(loaded!.view).toBe('EDIT')
  })

  it('preserves both teams through serialization', () => {
    const battle = makeBattle({
      ownTeam: { side: 'own', pokemon: [] },
      opponentTeam: { side: 'opponent', pokemon: [] },
    })
    saveBattle(battle)
    const loaded = loadBattle()
    expect(loaded!.ownTeam.side).toBe('own')
    expect(loaded!.opponentTeam.side).toBe('opponent')
  })
})

describe('loadBattle — incompatible schemaVersion discard (AC-14)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('returns null and clears the key when schemaVersion does not match', () => {
    const envelope = JSON.stringify({
      schemaVersion: SCHEMA_VERSION + 99,
      battle: makeBattle(),
    })
    localStorage.setItem(STORAGE_KEY, envelope)

    const loaded = loadBattle()
    expect(loaded).toBeNull()
    // The incompatible payload must be cleared, not left behind.
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('returns null when nothing is stored', () => {
    expect(loadBattle()).toBeNull()
  })

  it('returns null for malformed JSON and clears the key', () => {
    localStorage.setItem(STORAGE_KEY, 'NOT_JSON}}}')
    const loaded = loadBattle()
    expect(loaded).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('returns null when the envelope has no battle property', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION }))
    const loaded = loadBattle()
    expect(loaded).toBeNull()
  })
})

describe('clearBattle', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('removes the key from localStorage', () => {
    saveBattle(makeBattle())
    clearBattle()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('does not throw when the key is absent', () => {
    expect(() => clearBattle()).not.toThrow()
  })
})

describe('saveBattle — no crash on unavailable storage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('silently no-ops when setItem throws (quota exceeded)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })
    expect(() => saveBattle(makeBattle())).not.toThrow()
  })
})
