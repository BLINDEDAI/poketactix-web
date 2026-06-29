// Pure generation logic: numbering, type validity, and the as-of-generation type chart selection.
// I/O-free and unit-testable (no fetch, no store).

import type { Generation, TypeName } from '@/types/battle'
import { ALL_TYPE_NAMES } from '@/types/battle'
import { MODERN_TYPE_CHART, PRE_GEN6_TYPE_CHART, type TypeChart } from '@/data/type-chart'

/** The canonical numeric generation (3–9) for a `Generation` enum value. */
export function generationNumber(generation: Generation): number {
  // 'GEN_6' -> 6
  const parsed = Number.parseInt(generation.slice('GEN_'.length), 10)
  return parsed
}

/** Fairy was introduced in Gen 6. */
export function isFairyAvailable(generation: Generation): boolean {
  return generationNumber(generation) >= 6
}

/** Whether a given type exists in the chosen generation (only Fairy is generation-gated in Gen 3–9). */
export function isTypeValid(type: TypeName, generation: Generation): boolean {
  if (type === 'fairy') return isFairyAvailable(generation)
  return true
}

/** The set of types that exist in the chosen generation. */
export function validTypes(generation: Generation): TypeName[] {
  return ALL_TYPE_NAMES.filter((type) => isTypeValid(type, generation))
}

/** The type chart to use for weakness/resistance in the chosen generation. */
export function typeChartFor(generation: Generation): TypeChart {
  return isFairyAvailable(generation) ? MODERN_TYPE_CHART : PRE_GEN6_TYPE_CHART
}
