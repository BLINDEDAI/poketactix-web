// Unit tests: BundledPokeDataSource — AC-1/AC-2 (no fetch), AC-3 (item/nature indexes), AC-4 (pre-Gen-6 parity), AC-5 (generation-varying move).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { BundledPokeDataSource } from '@/data/bundled-poke-data-source'
import { computeTypeEffectiveness } from '@/domain/type-effectiveness'

describe('BundledPokeDataSource — AC-1/AC-2 (bundled species/move/ability, no fetch)', () => {
  let source: BundledPokeDataSource
  const fetchSpy = vi.fn(() => {
    throw new Error('fetch called — must not happen in offline mode')
  })

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchSpy)
    source = new BundledPokeDataSource()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('getSpecies returns bundled bulbasaur with correct types and no fetch (AC-1)', async () => {
    const result = await source.getSpecies('bulbasaur', 'GEN_6')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.name).toBe('bulbasaur')
    expect(result.value.speciesId).toBe(1)
    expect(result.value.types).toContain('grass')
    expect(result.value.types).toContain('poison')
    expect(result.value.baseStats.hp).toBeGreaterThan(0)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('getSpecies returns bundled charizard with fire/flying types (AC-1)', async () => {
    const result = await source.getSpecies('charizard', 'GEN_6')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.speciesId).toBe(6)
    expect(result.value.types).toContain('fire')
    expect(result.value.types).toContain('flying')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('getMove returns bundled flamethrower as SPECIAL fire move (AC-2)', async () => {
    const result = await source.getMove('flamethrower', 'GEN_6')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.name).toBe('flamethrower')
    expect(result.value.type).toBe('fire')
    expect(result.value.category).toBe('SPECIAL')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('getAbility returns bundled overgrow with Spanish displayName (AC-2)', async () => {
    const result = await source.getAbility('overgrow')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.name).toBe('overgrow')
    expect(result.value.displayName).toBe('Espesura')
    expect(result.value.effect).toContain('Grass')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('returns NOT_FOUND for unknown species slug (AC-1)', async () => {
    const result = await source.getSpecies('totally-fake-pokemon-xyz', 'GEN_6')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.kind).toBe('NOT_FOUND')
  })

  it('returns NOT_FOUND for unknown move slug (AC-2)', async () => {
    const result = await source.getMove('totally-fake-move-xyz', 'GEN_6')
    expect(result.ok).toBe(false)
  })
})

describe('BundledPokeDataSource — AC-3 (item/nature EN+ES indexes)', () => {
  let source: BundledPokeDataSource

  beforeEach(() => {
    source = new BundledPokeDataSource()
  })

  it('listResource("item") returns EN index with >100 entries', async () => {
    const result = await source.listResource('item')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.length).toBeGreaterThan(100)
    const first = result.value[0]
    expect(first).toHaveProperty('id')
    expect(first).toHaveProperty('name')
    expect(first).toHaveProperty('displayName')
  })

  it('listResource("nature") returns 25 natures including bold', async () => {
    const result = await source.listResource('nature')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.length).toBe(25)
    const bold = result.value.find((s) => s.name === 'bold')
    expect(bold).toBeDefined()
  })

  it('getSpanishNameIndex("item") includes Spanish entry for oran-berry (AC-3)', async () => {
    const result = await source.getSpanishNameIndex('item')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.length).toBeGreaterThan(0)
    // oran-berry id=132 → ES 'baya aranja'
    const oranBerry = result.value.find((e) => e.id === 132)
    expect(oranBerry).toBeDefined()
    expect(oranBerry!.spanishName).toBe('baya aranja')
  })

  it('getSpanishNameIndex("nature") includes Spanish entry for bold (AC-3)', async () => {
    const result = await source.getSpanishNameIndex('nature')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    // bold id=2 → ES 'osada'
    const bold = result.value.find((e) => e.id === 2)
    expect(bold).toBeDefined()
    expect(bold!.spanishName).toBe('osada')
  })
})

describe('BundledPokeDataSource — AC-4 (pre-Gen-6 parity: no Fairy in GEN_5)', () => {
  let source: BundledPokeDataSource

  beforeEach(() => {
    source = new BundledPokeDataSource()
  })

  it('gengar (ghost/poison) bundled species has no Fairy bucket in GEN_5 weakness chart (AC-4)', async () => {
    const result = await source.getSpecies('gengar', 'GEN_5')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.types).toContain('ghost')
    expect(result.value.types).toContain('poison')

    // Compute type effectiveness from the bundled types at GEN_5
    const eff = computeTypeEffectiveness(result.value.types, 'GEN_5')
    const allBuckets = [
      ...eff.quadrupleWeak,
      ...eff.weak,
      ...eff.resist,
      ...eff.quarterResist,
      ...eff.immune,
    ]
    expect(allBuckets).not.toContain('fairy')
  })

  it('dual-type water/ground bundled species has grass in quadrupleWeak (AC-4 parity check)', async () => {
    // swampert is water/ground — ×4 weak to grass
    const result = await source.getSpecies('swampert', 'GEN_5')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.types).toContain('water')
    expect(result.value.types).toContain('ground')

    const eff = computeTypeEffectiveness(result.value.types, 'GEN_5')
    expect(eff.quadrupleWeak).toContain('grass')
  })
})

describe('BundledPokeDataSource — AC-5 (generation-varying move resolves correctly)', () => {
  let source: BundledPokeDataSource

  beforeEach(() => {
    source = new BundledPokeDataSource()
  })

  it('absorb at GEN_3 has pp=20 (old value from pastValues)', async () => {
    const result = await source.getMove('absorb', 'GEN_3')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.name).toBe('absorb')
    // In GEN_3, versionGroup 8 (Gen4) is the earliest applicable entry → pp=20
    expect(result.value.pp).toBe(20)
  })

  it('absorb at GEN_8 has pp=15 and power=40 (from versionGroup 20)', async () => {
    const result = await source.getMove('absorb', 'GEN_8')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.pp).toBe(15)
    expect(result.value.power).toBe(40)
  })

  it('absorb at GEN_9 has current values (pp=25, power=20 — no past entry applies)', async () => {
    const result = await source.getMove('absorb', 'GEN_9')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.pp).toBe(25)
    expect(result.value.power).toBe(20)
  })
})
