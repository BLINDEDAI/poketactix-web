// Unit tests: generation-resolver.ts — resolveMove (past_values as-of generation)
// Covers AC-2: generation resolver with past_values + per-field fallback to current.

import { describe, it, expect } from 'vitest'
import { resolveMove } from '@/domain/generation-resolver'
import type { MoveRaw } from '@/data/poke-api-schemas'

/**
 * Build a minimal MoveRaw fixture for resolver tests.
 * versionGroupId: the id that maps to a specific generation via VERSION_GROUP_GENERATION.
 * Gen 5 → vg 11 (black-white), Gen 6 → vg 15 (x-y)
 */
function makeRaw(overrides: Partial<MoveRaw> = {}): MoveRaw {
  return {
    id: 1,
    name: 'tackle',
    type: 'normal',
    category: 'physical',
    power: 50,
    accuracy: 100,
    pp: 35,
    effect: 'Deals damage.',
    spanishName: 'Placaje',
    pastValues: [],
    ...overrides,
  }
}

describe('resolveMove — no past_values', () => {
  it('uses the current values when there are no past_values', () => {
    const raw = makeRaw({ power: 40, accuracy: 95, pp: 35 })
    const resolved = resolveMove(raw, 'GEN_6')
    expect(resolved.power).toBe(40)
    expect(resolved.accuracy).toBe(95)
    expect(resolved.pp).toBe(35)
    expect(resolved.name).toBe('tackle')
    expect(resolved.displayName).toBe('Placaje') // Spanish name preferred
  })

  it('falls back to English name when spanishName is null', () => {
    const raw = makeRaw({ spanishName: null })
    const resolved = resolveMove(raw, 'GEN_6')
    expect(resolved.displayName).toBe('tackle')
  })
})

describe('resolveMove — past_values resolution', () => {
  it('uses the past power when the target gen is at or before the past entry gen', () => {
    // Tackle had 35 power in Gen 5 (vg 11 = Gen 5); bumped to 50 in Gen 6.
    // past_values entry for vg 11 (gen 5): power = 35, accuracy = 95, pp = 35
    const raw = makeRaw({
      power: 50, // current (Gen 6+)
      accuracy: 100,
      pp: 35,
      pastValues: [
        { versionGroup: 11, power: 35, accuracy: 95, pp: 35, type: null }, // vg 11 = Gen 5
      ],
    })

    // Resolve as-of GEN_5: should pick the past entry (earliest past entry whose gen >= 5)
    const resolvedGen5 = resolveMove(raw, 'GEN_5')
    expect(resolvedGen5.power).toBe(35)
    expect(resolvedGen5.accuracy).toBe(95)

    // Resolve as-of GEN_6: no past entry applies (vg 11 = gen 5 < 6) → current values
    const resolvedGen6 = resolveMove(raw, 'GEN_6')
    expect(resolvedGen6.power).toBe(50)
    expect(resolvedGen6.accuracy).toBe(100)
  })

  it('falls back per-field when a past entry has null for that field', () => {
    // past entry records power change but leaves accuracy null → accuracy falls back to current
    const raw = makeRaw({
      power: 50,
      accuracy: 100,
      pp: 35,
      pastValues: [
        { versionGroup: 11, power: 35, accuracy: null, pp: null, type: null }, // Gen 5
      ],
    })
    const resolved = resolveMove(raw, 'GEN_5')
    expect(resolved.power).toBe(35) // from past entry
    expect(resolved.accuracy).toBe(100) // fallback to current (null in past entry)
    expect(resolved.pp).toBe(35) // fallback to current (null in past entry)
  })

  it('resolves past type change correctly', () => {
    // Move was normal in Gen 5 (vg 11), changed to fairy in Gen 6
    const raw = makeRaw({
      type: 'fairy', // current (Gen 6+)
      pastValues: [
        { versionGroup: 11, power: null, accuracy: null, pp: null, type: 'normal' }, // Gen 5
      ],
    })
    const resolvedGen5 = resolveMove(raw, 'GEN_5')
    expect(resolvedGen5.type).toBe('normal')

    const resolvedGen6 = resolveMove(raw, 'GEN_6')
    expect(resolvedGen6.type).toBe('fairy')
  })

  it('picks the earliest applicable past entry when there are multiple', () => {
    // vg 8 = Gen 4, vg 11 = Gen 5; target = GEN_4 → should use vg 8 entry
    const raw = makeRaw({
      power: 50,
      pastValues: [
        { versionGroup: 11, power: 35, accuracy: null, pp: null, type: null }, // Gen 5 entry
        { versionGroup: 8, power: 30, accuracy: null, pp: null, type: null }, // Gen 4 entry
      ],
    })
    const resolved = resolveMove(raw, 'GEN_4')
    expect(resolved.power).toBe(30) // earliest gen >= 4 is vg 8 (gen 4)
  })

  it('maps category string to domain enum', () => {
    const raw = makeRaw({ category: 'special' })
    expect(resolveMove(raw, 'GEN_6').category).toBe('SPECIAL')

    const raw2 = makeRaw({ category: 'status' })
    expect(resolveMove(raw2, 'GEN_6').category).toBe('STATUS')

    const raw3 = makeRaw({ category: 'physical' })
    expect(resolveMove(raw3, 'GEN_6').category).toBe('PHYSICAL')
  })
})
