// PokeDataSource — the data-access seam the whole app binds to (the only boundary the rest of the
// app depends on, dev-bundle §4). It declares the five read methods the board consumes, each with the
// SAME discriminated `Result<T>` / `PokeApiError` channel, so callers (BattleBoard.getSpecies,
// MoveSlot.getMove, AbilitySlot.getAbility, usePokemonSearch.listResource + getSpanishNameIndex) are
// byte-for-byte unchanged whether the implementation is the network client or the bundled source.
//
// Two implementations exist:
//   - `BundledPokeDataSource` (runtime) — reads the committed `src/data/generated/*` modules; no fetch.
//   - `PokeApiClient` (build-time only) — relocated out of the runtime import graph; reachable only
//     from the generator. It `implements PokeDataSource` so the contract is enforced at compile time.

import type { Ability, Generation, Move, SpeciesData } from '@/types/battle'
import type { LocalizedNameEntry, SearchSuggestion } from '@/types/search'
import type { Result } from '@/data/poke-api-error'

/** A kind of listable PokéAPI resource for autocomplete. */
export type ResourceKind = 'pokemon' | 'move' | 'ability' | 'item' | 'nature'

/** A kind of resource that carries a Spanish (language_id = 7) name index. */
export type LocalizedKind = 'move' | 'ability' | 'item' | 'nature'

/**
 * The five read methods the board consumes. Signatures match `PokeApiClient` exactly so the
 * `use-poke-api` singleton can swap implementations with a one-line change and nothing else moves.
 */
export interface PokeDataSource {
  /** Generation-resolved species reference data (types, base stats, sprite). */
  getSpecies(nameOrId: string, generation: Generation): Promise<Result<SpeciesData>>
  /** Generation-resolved move (power/accuracy/pp/type as-of the chosen generation). */
  getMove(nameOrId: string, generation: Generation): Promise<Result<Move>>
  /** Ability (effect text); abilities are not generation-resolved beyond existence. */
  getAbility(nameOrId: string): Promise<Result<Ability>>
  /** The full English name index for a resource kind (autocomplete filters locally). */
  listResource(kind: ResourceKind, limit?: number): Promise<Result<SearchSuggestion[]>>
  /** The Spanish (language_id = 7) name→id index for a localized resource kind. */
  getSpanishNameIndex(kind: LocalizedKind): Promise<Result<LocalizedNameEntry[]>>
}
