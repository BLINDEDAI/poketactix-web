// Pure factory: build a fresh PokemonCard for a side from generation-resolved species data.
// I/O-free; weakness/resistance is computed here from the species types + generation.

import type {
  Generation,
  PokemonCard,
  RevealSlot,
  Move,
  SideKey,
  SpeciesData,
} from '@/types/battle'
import { computeTypeEffectiveness } from '@/domain/type-effectiveness'
import {
  initialAbilitySlot,
  initialItemSlot,
  initialMoveSlot,
  initialNatureSlot,
} from '@/domain/reveal-slot'

/** Generate a unique card id without an external dependency (crypto.randomUUID is widely available). */
function newCardId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback for environments without crypto.randomUUID — non-cryptographic, id-uniqueness only.
  return `card-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function createPokemonCard(
  species: SpeciesData,
  side: SideKey,
  generation: Generation,
): PokemonCard {
  const moves: [RevealSlot<Move>, RevealSlot<Move>, RevealSlot<Move>, RevealSlot<Move>] = [
    initialMoveSlot(side),
    initialMoveSlot(side),
    initialMoveSlot(side),
    initialMoveSlot(side),
  ]

  return {
    cardId: newCardId(),
    speciesId: species.speciesId,
    name: species.name,
    types: species.types,
    baseStats: species.baseStats,
    weaknessesResistances: computeTypeEffectiveness(species.types, generation),
    sprite: species.sprite,
    ability: initialAbilitySlot(side),
    moves,
    item: initialItemSlot(side),
    nature: initialNatureSlot(side),
    fainted: false,
    active: false,
    notes: '',
  }
}
