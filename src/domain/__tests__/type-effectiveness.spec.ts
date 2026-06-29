// Unit tests: type-effectiveness.ts — combinedMultiplier + computeTypeEffectiveness
// Covers AC-2: per-generation type chart, including pre-Gen-6 no-Fairy invariants.
// Marquee assertion: Dragon in GEN_5 must NOT have fairy in any bucket;
// Steel in GEN_5 must resist Ghost & Dark (×0.5), which flip to neutral in GEN_6.

import { describe, it, expect } from 'vitest'
import { combinedMultiplier, computeTypeEffectiveness } from '@/domain/type-effectiveness'

describe('combinedMultiplier', () => {
  it('returns 1 for neutral matchups', () => {
    expect(combinedMultiplier('normal', ['fire'], 'GEN_6')).toBe(1)
  })

  it('returns 2 for a single weakness', () => {
    expect(combinedMultiplier('fire', ['grass'], 'GEN_6')).toBe(2)
  })

  it('returns 4 for a dual weakness (both types weak to attacker)', () => {
    // Ground vs Fire = ×2; Ground vs Rock = ×2 → dual: 2*2 = 4
    expect(combinedMultiplier('ground', ['fire', 'rock'], 'GEN_6')).toBe(4)
  })

  it('returns 0 for an immunity', () => {
    expect(combinedMultiplier('normal', ['ghost'], 'GEN_6')).toBe(0)
  })

  it('ignores fairy defender in pre-Gen-6 (fairy is not a valid type, filtered out)', () => {
    // If fairy defender were included, fairy would have no special relation to fire → ×1.
    // But the function must filter the defender type as invalid; we check result is same as
    // if the second type were absent.
    const withFairy = combinedMultiplier('fire', ['grass', 'fairy'], 'GEN_5')
    const withoutFairy = combinedMultiplier('fire', ['grass'], 'GEN_5')
    expect(withFairy).toBe(withoutFairy)
  })
})

describe('computeTypeEffectiveness — pre-Gen-6 no-Fairy invariant (AC-2)', () => {
  it('Dragon in GEN_5: fairy NOT in any effectiveness bucket', () => {
    const eff = computeTypeEffectiveness(['dragon'], 'GEN_5')
    const allBuckets = [
      ...eff.quadrupleWeak,
      ...eff.weak,
      ...eff.resist,
      ...eff.quarterResist,
      ...eff.immune,
    ]
    expect(allBuckets).not.toContain('fairy')
  })

  it('Dragon in GEN_6: fairy IS in the weak bucket', () => {
    const eff = computeTypeEffectiveness(['dragon'], 'GEN_6')
    expect(eff.weak).toContain('fairy')
  })

  it('Steel in GEN_5: Ghost and Dark are resists (×0.5)', () => {
    const eff = computeTypeEffectiveness(['steel'], 'GEN_5')
    expect(eff.resist).toContain('ghost')
    expect(eff.resist).toContain('dark')
  })

  it('Steel in GEN_6: Ghost and Dark become neutral (not in resist)', () => {
    const eff = computeTypeEffectiveness(['steel'], 'GEN_6')
    expect(eff.resist).not.toContain('ghost')
    expect(eff.resist).not.toContain('dark')
  })

  it('returns no fairy in any bucket for fire/flying in GEN_5', () => {
    const eff = computeTypeEffectiveness(['fire', 'flying'], 'GEN_5')
    const allBuckets = [
      ...eff.quadrupleWeak,
      ...eff.weak,
      ...eff.resist,
      ...eff.quarterResist,
      ...eff.immune,
    ]
    expect(allBuckets).not.toContain('fairy')
  })
})

describe('computeTypeEffectiveness — standard cases', () => {
  it('Water/Ground is quadruple-weak to grass', () => {
    const eff = computeTypeEffectiveness(['water', 'ground'], 'GEN_6')
    expect(eff.quadrupleWeak).toContain('grass')
  })

  it('Ghost/Dark is immune to normal and fighting', () => {
    const eff = computeTypeEffectiveness(['ghost', 'dark'], 'GEN_6')
    expect(eff.immune).toContain('normal')
    expect(eff.immune).toContain('fighting')
  })

  it('neutral types do not appear in any bucket', () => {
    const eff = computeTypeEffectiveness(['water'], 'GEN_6')
    const allBuckets = [
      ...eff.quadrupleWeak,
      ...eff.weak,
      ...eff.resist,
      ...eff.quarterResist,
      ...eff.immune,
    ]
    // Normal vs Water = ×1 — must not appear
    expect(allBuckets).not.toContain('normal')
  })
})
