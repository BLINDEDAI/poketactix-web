// Pure weakness/resistance computation for a (possibly dual-typed) Pokémon, generation-correct.
// I/O-free and unit-testable.

import type { Generation, TypeEffectiveness, TypeName } from '@/types/battle'
import { isTypeValid, typeChartFor, validTypes } from '@/domain/generation'

/** Multiplier an attacking type deals to a single defending type, per the generation's chart. */
function attackMultiplier(
  attacker: TypeName,
  defender: TypeName,
  chart: ReturnType<typeof typeChartFor>,
): number {
  const row = chart[attacker]
  if (!row) return 1
  const value = row[defender]
  return value === undefined ? 1 : value
}

/**
 * Combined multiplier an attacking type deals to a defender with one or two types.
 * Generation-invalid defender types (e.g. Fairy pre-Gen-6) are ignored — they cannot appear.
 */
export function combinedMultiplier(
  attacker: TypeName,
  defenderTypes: readonly TypeName[],
  generation: Generation,
): number {
  const chart = typeChartFor(generation)
  return defenderTypes
    .filter((type) => isTypeValid(type, generation))
    .reduce((product, defender) => product * attackMultiplier(attacker, defender, chart), 1)
}

/**
 * Full weakness/resistance breakdown for a defender, bucketed by multiplier.
 * Only attacking types that exist in the generation are considered (no Fairy pre-Gen-6).
 */
export function computeTypeEffectiveness(
  defenderTypes: readonly TypeName[],
  generation: Generation,
): TypeEffectiveness {
  const result: TypeEffectiveness = {
    quadrupleWeak: [],
    weak: [],
    resist: [],
    quarterResist: [],
    immune: [],
  }

  for (const attacker of validTypes(generation)) {
    const multiplier = combinedMultiplier(attacker, defenderTypes, generation)
    if (multiplier === 0) result.immune.push(attacker)
    else if (multiplier >= 4) result.quadrupleWeak.push(attacker)
    else if (multiplier >= 2) result.weak.push(attacker)
    else if (multiplier <= 0.25) result.quarterResist.push(attacker)
    else if (multiplier <= 0.5) result.resist.push(attacker)
    // multiplier === 1 -> neutral, omitted
  }

  return result
}
