// BundledPokeDataSource — the RUNTIME data source (ADR-004). Implements `PokeDataSource` by reading
// the committed `src/data/generated/*` modules; it makes NO network call. Every lookup resolves
// synchronously from in-memory maps (the methods keep their `Promise<Result<T>>` signatures purely so
// every call-site contract is unchanged — there is no fetch, no timeout, no loading state).
//
// Generation-correctness is parity-by-construction: moves are resolved with the EXISTING pure
// `resolveMove(raw, generation)` over the bundled `MoveRaw`-shaped records (with `pastValues`), and
// weakness/resistance + the effectiveness indicator use the already-bundled type charts (unchanged).
//
// A lookup miss returns `err(new PokeApiError('NOT_FOUND', …))` — never a network error (the board
// surfaces it through the same in-UI `role="alert"` path). This is vanishingly rare offline because
// the generator enumerates the full Gen 3-9 set; the fix is to regenerate the bundle.

import type { Ability, Generation, Move, SpeciesData } from '@/types/battle'
import type { LocalizedNameEntry, SearchSuggestion } from '@/types/search'
import type { LocalizedKind, PokeDataSource, ResourceKind } from '@/data/poke-data-source'
import type { AbilityRaw, MoveRaw } from '@/data/poke-api-schemas'
import { PokeApiError, err, ok, type Result } from '@/data/poke-api-error'
import { resolveMove } from '@/domain/generation-resolver'

import speciesData from '@/data/generated/species.json'
import movesData from '@/data/generated/moves.json'
import abilitiesData from '@/data/generated/abilities.json'
import searchIndexData from '@/data/generated/search-index.json'

/** The committed species record shape (the same non-generation-resolved shape `getSpecies` returns). */
interface SpeciesRecord {
  speciesId: number
  name: string
  types: SpeciesData['types']
  baseStats: SpeciesData['baseStats']
  sprite: string | null
}

/** The committed search-index shape per kind. */
interface SearchIndexEntry {
  english: { id: number; name: string }[]
  spanish: { id: number; spanishName: string }[]
}

const species = speciesData as Record<string, SpeciesRecord>
const moves = movesData as Record<string, MoveRaw>
const abilities = abilitiesData as Record<string, AbilityRaw>
const searchIndex = searchIndexData as Record<string, SearchIndexEntry>

/** Lower-case + trim a user-supplied or bundled name into the slug form used as the map key. */
function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

export class BundledPokeDataSource implements PokeDataSource {
  async getSpecies(nameOrId: string, generation: Generation): Promise<Result<SpeciesData>> {
    const record = species[normalizeName(nameOrId)]
    if (record === undefined) {
      return err(new PokeApiError('NOT_FOUND', `species "${nameOrId}" not in bundle`))
    }
    // Species data is not generation-resolved (parity with the network path); generation is unused
    // here but kept in the signature for an unchanged call-site contract.
    void generation
    return ok({
      speciesId: record.speciesId,
      name: record.name,
      types: record.types,
      baseStats: record.baseStats,
      sprite: record.sprite,
    })
  }

  async getMove(nameOrId: string, generation: Generation): Promise<Result<Move>> {
    const raw = moves[normalizeName(nameOrId)]
    if (raw === undefined) {
      return err(new PokeApiError('NOT_FOUND', `move "${nameOrId}" not in bundle`))
    }
    // Reuse the EXISTING pure resolver over the bundled MoveRaw — identical to the online path (AC-5).
    return ok(resolveMove(raw, generation))
  }

  async getAbility(nameOrId: string): Promise<Result<Ability>> {
    const raw = abilities[normalizeName(nameOrId)]
    if (raw === undefined) {
      return err(new PokeApiError('NOT_FOUND', `ability "${nameOrId}" not in bundle`))
    }
    return ok({
      id: raw.id,
      name: raw.name,
      displayName: raw.spanishName ?? raw.name,
      effect: raw.effect,
    })
  }

  async listResource(kind: ResourceKind, limit = 2000): Promise<Result<SearchSuggestion[]>> {
    const entry = searchIndex[kind]
    if (entry === undefined) {
      return err(new PokeApiError('NOT_FOUND', `search index for "${kind}" not in bundle`))
    }
    const suggestions: SearchSuggestion[] = []
    for (const { id, name } of entry.english) {
      suggestions.push({ id, name, displayName: name })
      if (suggestions.length >= limit) break
    }
    return ok(suggestions)
  }

  async getSpanishNameIndex(kind: LocalizedKind): Promise<Result<LocalizedNameEntry[]>> {
    const entry = searchIndex[kind]
    if (entry === undefined) {
      return err(new PokeApiError('NOT_FOUND', `Spanish index for "${kind}" not in bundle`))
    }
    return ok(entry.spanish.map(({ id, spanishName }) => ({ id, spanishName })))
  }
}
