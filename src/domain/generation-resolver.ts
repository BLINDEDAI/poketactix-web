// Pure generation resolver: given a raw-but-validated PokéAPI move/type and a target generation,
// resolve the values as-of that generation via `past_values` / `past_damage_relations`, falling
// back to the current values when no past entry applies. I/O-free and unit-testable.

import type { Generation, Move, MoveCategory, TypeName } from '@/types/battle'
import type {
  DamageRelationsRaw,
  MovePastValueRaw,
  MoveRaw,
  TypeRaw,
} from '@/data/poke-api-schemas'
import { generationNumber } from '@/domain/generation'
import { versionGroupGeneration } from '@/data/version-groups'

function categoryFromRaw(category: MoveRaw['category']): MoveCategory {
  switch (category) {
    case 'physical':
      return 'PHYSICAL'
    case 'special':
      return 'SPECIAL'
    case 'status':
      return 'STATUS'
  }
}

/**
 * Resolve a move's power/accuracy/pp/type as-of the target generation.
 *
 * PokéAPI `past_values[i]` describes the value that applied in `version_group` and EARLIER.
 * We pick the earliest past entry whose version-group generation is >= the target generation
 * (the change to the current value had not happened yet at the target gen). Each field falls
 * back independently to the current value when the past entry leaves it null.
 */
export function resolveMove(raw: MoveRaw, generation: Generation): Move {
  const targetGen = generationNumber(generation)

  // Candidate past entries that still applied at (or after) the target generation, earliest first.
  const applicable: MovePastValueRaw[] = raw.pastValues
    .map((entry) => ({ entry, gen: versionGroupGeneration(entry.versionGroup) }))
    .filter(
      (item): item is { entry: MovePastValueRaw; gen: number } =>
        item.gen !== null && item.gen >= targetGen,
    )
    .sort((a, b) => a.gen - b.gen)
    .map((item) => item.entry)

  const firstWith = <K extends keyof MovePastValueRaw>(
    field: K,
  ): MovePastValueRaw[K] | undefined => {
    for (const entry of applicable) {
      if (entry[field] !== null && entry[field] !== undefined) return entry[field]
    }
    return undefined
  }

  const power = firstWith('power') ?? raw.power
  const accuracy = firstWith('accuracy') ?? raw.accuracy
  const pp = firstWith('pp') ?? raw.pp
  const resolvedType = (firstWith('type') as TypeName | undefined) ?? raw.type

  return {
    id: raw.id,
    name: raw.name,
    displayName: raw.spanishName ?? raw.name,
    type: resolvedType,
    category: categoryFromRaw(raw.category),
    power: power ?? null,
    accuracy: accuracy ?? null,
    pp: pp ?? null,
    effect: raw.effect,
  }
}

/**
 * Resolve a type's damage relations as-of the target generation.
 * `past_damage_relations[i].generation` = the generation in which `relations` last applied.
 * We pick the earliest past chart whose generation is >= the target (it still applied then),
 * else the current relations.
 */
export function resolveDamageRelations(raw: TypeRaw, generation: Generation): DamageRelationsRaw {
  const targetGen = generationNumber(generation)
  const applicable = raw.pastDamageRelations
    .filter((entry) => entry.generation >= targetGen)
    .sort((a, b) => a.generation - b.generation)
  return applicable.length > 0 && applicable[0] ? applicable[0].relations : raw.damageRelations
}
