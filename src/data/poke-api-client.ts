// PokeApiClient — the ONLY layer that touches the network (US-040 boundary, dev-bundle §5).
// REST + GraphQL beta, in-session response cache, explicit failure path + timeout on every call (US-024).
// Returns typed domain models / discriminated Results; never leaks raw PokéAPI shapes upward.

import type { Ability, Generation, Move, SpeciesData } from '@/types/battle'
import type { LocalizedNameEntry, SearchSuggestion } from '@/types/search'
import { PokeApiError, err, ok, type Result } from '@/data/poke-api-error'
import {
  isRecord,
  parseAbility,
  parseMove,
  parsePokemon,
  parseType,
  type TypeRaw,
} from '@/data/poke-api-schemas'
import { resolveDamageRelations, resolveMove } from '@/domain/generation-resolver'
import { computeTypeEffectiveness } from '@/domain/type-effectiveness'

const REST_BASE = 'https://pokeapi.co/api/v2'
const GRAPHQL_URL = 'https://beta.pokeapi.co/graphql/v1beta'
const DEFAULT_TIMEOUT_MS = 10_000

/** Lower-case + trim a user-supplied or API name into the PokéAPI slug form. */
function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

export interface PokeApiClientOptions {
  timeoutMs?: number
  /** Injectable fetch for tests; defaults to the global. */
  fetchFn?: typeof fetch
}

export class PokeApiClient {
  private readonly timeoutMs: number
  private readonly fetchFn: typeof fetch
  // In-session response caches (one per resource kind). Cleared only on page reload.
  private readonly jsonCache = new Map<string, unknown>()
  private readonly typeCache = new Map<string, Result<TypeRaw>>()

  constructor(options: PokeApiClientOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    this.fetchFn = options.fetchFn ?? globalThis.fetch.bind(globalThis)
  }

  /** GET a JSON resource with a timeout and an explicit failure path. Caches successful bodies. */
  private async getJson(url: string): Promise<Result<unknown>> {
    const cached = this.jsonCache.get(url)
    if (cached !== undefined) return ok(cached)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const response = await this.fetchFn(url, { signal: controller.signal })
      if (!response.ok) {
        if (response.status === 404) return err(new PokeApiError('NOT_FOUND', `404 for ${url}`))
        if (response.status === 429) return err(new PokeApiError('RATE_LIMITED', `429 for ${url}`))
        return err(new PokeApiError('SERVER', `HTTP ${response.status} for ${url}`))
      }
      const body: unknown = await response.json()
      this.jsonCache.set(url, body)
      return ok(body)
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') {
        return err(new PokeApiError('TIMEOUT', `request to ${url} timed out`, { cause }))
      }
      return err(new PokeApiError('NETWORK', `network error for ${url}`, { cause }))
    } finally {
      clearTimeout(timer)
    }
  }

  /** Fetch + validate + resolve a Pokémon's species data for the chosen generation. */
  async getSpecies(nameOrId: string, generation: Generation): Promise<Result<SpeciesData>> {
    const result = await this.getJson(`${REST_BASE}/pokemon/${normalizeName(nameOrId)}`)
    if (!result.ok) return result
    const parsed = parsePokemon(result.value)
    if (parsed === null) {
      return err(new PokeApiError('INVALID_SHAPE', 'unexpected /pokemon response shape'))
    }
    // weaknessesResistances are computed by the card factory; species carries types/stats/sprite.
    void generation
    return ok({
      speciesId: parsed.id,
      name: parsed.name,
      types: parsed.types,
      baseStats: parsed.baseStats,
      sprite: parsed.sprite,
    })
  }

  /** Fetch + validate a type's generation-resolved damage relations (cached per type name). */
  private async getType(typeName: string): Promise<Result<TypeRaw>> {
    const key = normalizeName(typeName)
    const cached = this.typeCache.get(key)
    if (cached !== undefined) return cached
    const result = await this.getJson(`${REST_BASE}/type/${key}`)
    let value: Result<TypeRaw>
    if (!result.ok) {
      value = result
    } else {
      const parsed = parseType(result.value)
      value =
        parsed === null
          ? err(new PokeApiError('INVALID_SHAPE', `unexpected /type/${key} response shape`))
          : ok(parsed)
    }
    this.typeCache.set(key, value)
    return value
  }

  /** Fetch + validate + resolve a move for the chosen generation. */
  async getMove(nameOrId: string, generation: Generation): Promise<Result<Move>> {
    const result = await this.getJson(`${REST_BASE}/move/${normalizeName(nameOrId)}`)
    if (!result.ok) return result
    const parsed = parseMove(result.value)
    if (parsed === null) {
      return err(new PokeApiError('INVALID_SHAPE', 'unexpected /move response shape'))
    }
    return ok(resolveMove(parsed, generation))
  }

  /** Fetch + validate an ability. (Abilities are not generation-resolved beyond existence.) */
  async getAbility(nameOrId: string): Promise<Result<Ability>> {
    const result = await this.getJson(`${REST_BASE}/ability/${normalizeName(nameOrId)}`)
    if (!result.ok) return result
    const parsed = parseAbility(result.value)
    if (parsed === null) {
      return err(new PokeApiError('INVALID_SHAPE', 'unexpected /ability response shape'))
    }
    return ok({
      id: parsed.id,
      name: parsed.name,
      displayName: parsed.spanishName ?? parsed.name,
      effect: parsed.effect,
    })
  }

  /**
   * List resource names of a kind (`pokemon` | `move` | `ability`) for autocomplete.
   * Uses a large `limit` to pull the full index once (cached); the search composable filters locally.
   */
  async listResource(
    kind: 'pokemon' | 'move' | 'ability',
    limit = 2000,
  ): Promise<Result<SearchSuggestion[]>> {
    const result = await this.getJson(`${REST_BASE}/${kind}?limit=${limit}&offset=0`)
    if (!result.ok) return result
    if (!isRecord(result.value) || !Array.isArray(result.value.results)) {
      return err(new PokeApiError('INVALID_SHAPE', `unexpected /${kind} list response shape`))
    }
    const suggestions: SearchSuggestion[] = []
    for (const entry of result.value.results) {
      if (!isRecord(entry)) continue
      const name = typeof entry.name === 'string' ? entry.name : null
      const url = typeof entry.url === 'string' ? entry.url : null
      if (name === null || url === null) continue
      const match = url.match(/\/(\d+)\/?$/)
      const id = match && match[1] !== undefined ? Number.parseInt(match[1], 10) : NaN
      if (Number.isNaN(id)) continue
      suggestions.push({ id, name, displayName: name })
    }
    return ok(suggestions)
  }

  /**
   * Spanish (language_id = 7) name→id index for moves or abilities, via the GraphQL beta endpoint.
   * Seam-isolated: on any failure the caller falls back to REST `names` / English-only search.
   */
  async getSpanishNameIndex(kind: 'move' | 'ability'): Promise<Result<LocalizedNameEntry[]>> {
    const table = kind === 'move' ? 'pokemon_v2_movename' : 'pokemon_v2_abilityname'
    const idField = kind === 'move' ? 'move_id' : 'ability_id'
    const query = `query SpanishNames { ${table}(where: { language_id: { _eq: 7 } }) { ${idField} name } }`

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const response = await this.fetchFn(GRAPHQL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: controller.signal,
      })
      if (!response.ok) {
        return err(new PokeApiError('SERVER', `GraphQL HTTP ${response.status}`))
      }
      const body: unknown = await response.json()
      const entries = this.parseSpanishIndex(body, table, idField)
      if (entries === null) {
        return err(new PokeApiError('INVALID_SHAPE', 'unexpected GraphQL index shape'))
      }
      return ok(entries)
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') {
        return err(new PokeApiError('TIMEOUT', 'GraphQL request timed out', { cause }))
      }
      return err(new PokeApiError('NETWORK', 'GraphQL network error', { cause }))
    } finally {
      clearTimeout(timer)
    }
  }

  private parseSpanishIndex(
    body: unknown,
    table: string,
    idField: string,
  ): LocalizedNameEntry[] | null {
    if (!isRecord(body)) return null
    const data = body.data
    if (!isRecord(data)) return null
    const rows = data[table]
    if (!Array.isArray(rows)) return null
    const entries: LocalizedNameEntry[] = []
    for (const row of rows) {
      if (!isRecord(row)) continue
      const id = typeof row[idField] === 'number' ? (row[idField] as number) : null
      const name = typeof row.name === 'string' ? row.name : null
      if (id === null || name === null) continue
      entries.push({ id, spanishName: name.trim().toLowerCase() })
    }
    return entries
  }

  /**
   * Compute generation-correct weakness/resistance from the bundled chart.
   * Exposed here so the (optional) PokéAPI `past_damage_relations` path can be cross-checked;
   * the default board path uses the bundled chart in the domain layer for offline determinism.
   */
  async typeEffectivenessFromApi(
    types: readonly string[],
    generation: Generation,
  ): Promise<Result<ReturnType<typeof computeTypeEffectiveness>>> {
    // Validate the type fetches succeed (so failures still surface), then defer to the bundled chart.
    for (const type of types) {
      const typeResult = await this.getType(type)
      if (!typeResult.ok) return typeResult
      void resolveDamageRelations(typeResult.value, generation)
    }
    // The bundled chart is the source of truth (design-decisions: bundled pre-Gen-6 chart).
    return ok(computeTypeEffectiveness(types as never, generation))
  }
}
