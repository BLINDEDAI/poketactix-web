// Unit tests: generation.ts — generationNumber, isFairyAvailable, isTypeValid, validTypes, typeChartFor
// Covers AC-2 (per-generation type chart, Fairy gating)

import { describe, it, expect } from 'vitest'
import {
  generationNumber,
  isFairyAvailable,
  isTypeValid,
  validTypes,
  typeChartFor,
} from '@/domain/generation'
import { MODERN_TYPE_CHART, PRE_GEN6_TYPE_CHART } from '@/data/type-chart'
import type { Generation } from '@/types/battle'

const PRE_FAIRY_GENS: Generation[] = ['GEN_3', 'GEN_4', 'GEN_5']
const FAIRY_GENS: Generation[] = ['GEN_6', 'GEN_7', 'GEN_8', 'GEN_9']

describe('generationNumber', () => {
  it('extracts the numeric suffix from each generation', () => {
    expect(generationNumber('GEN_3')).toBe(3)
    expect(generationNumber('GEN_6')).toBe(6)
    expect(generationNumber('GEN_9')).toBe(9)
  })
})

describe('isFairyAvailable', () => {
  it('returns false for Gen 3, 4, 5', () => {
    for (const gen of PRE_FAIRY_GENS) {
      expect(isFairyAvailable(gen)).toBe(false)
    }
  })

  it('returns true for Gen 6 and later', () => {
    for (const gen of FAIRY_GENS) {
      expect(isFairyAvailable(gen)).toBe(true)
    }
  })
})

describe('isTypeValid', () => {
  it('fairy is invalid before Gen 6', () => {
    for (const gen of PRE_FAIRY_GENS) {
      expect(isTypeValid('fairy', gen)).toBe(false)
    }
  })

  it('fairy is valid from Gen 6 onward', () => {
    for (const gen of FAIRY_GENS) {
      expect(isTypeValid('fairy', gen)).toBe(true)
    }
  })

  it('non-fairy types are always valid', () => {
    expect(isTypeValid('fire', 'GEN_3')).toBe(true)
    expect(isTypeValid('dragon', 'GEN_5')).toBe(true)
    expect(isTypeValid('steel', 'GEN_3')).toBe(true)
  })
})

describe('validTypes', () => {
  it('excludes fairy in pre-Gen-6 generations', () => {
    for (const gen of PRE_FAIRY_GENS) {
      const types = validTypes(gen)
      expect(types).not.toContain('fairy')
    }
  })

  it('includes fairy from Gen 6 onward', () => {
    for (const gen of FAIRY_GENS) {
      const types = validTypes(gen)
      expect(types).toContain('fairy')
    }
  })

  it('returns 17 types for pre-Gen-6 (all types minus fairy)', () => {
    expect(validTypes('GEN_5').length).toBe(17)
  })

  it('returns 18 types for Gen 6+', () => {
    expect(validTypes('GEN_6').length).toBe(18)
  })
})

describe('typeChartFor', () => {
  it('returns PRE_GEN6_TYPE_CHART for generations before Gen 6', () => {
    for (const gen of PRE_FAIRY_GENS) {
      expect(typeChartFor(gen)).toBe(PRE_GEN6_TYPE_CHART)
    }
  })

  it('returns MODERN_TYPE_CHART for Gen 6 and later', () => {
    for (const gen of FAIRY_GENS) {
      expect(typeChartFor(gen)).toBe(MODERN_TYPE_CHART)
    }
  })
})
