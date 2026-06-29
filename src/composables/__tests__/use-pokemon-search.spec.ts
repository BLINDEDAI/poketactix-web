// Unit tests: use-pokemon-search.ts — Spanish name → id mapping (AC-13).
// Mocks PokeApiClient — no real network calls.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import type { SearchSuggestion, LocalizedNameEntry } from '@/types/search'

// ---- mock usePokeApi before importing the composable ----
const mockClient = {
  listResource: vi.fn(),
  getSpanishNameIndex: vi.fn(),
}

vi.mock('@/composables/use-poke-api', () => ({
  usePokeApi: () => ({
    client: mockClient,
    apiError: null,
    reportError: vi.fn(),
    clearError: vi.fn(),
  }),
}))

import { usePokemonSearch } from '@/composables/use-pokemon-search'

const ENGLISH_MOVES: SearchSuggestion[] = [
  { id: 1, name: 'tackle', displayName: 'Tackle' },
  { id: 13, name: 'razor-wind', displayName: 'Razor Wind' },
  { id: 53, name: 'flamethrower', displayName: 'Flamethrower' },
]

const SPANISH_INDEX: LocalizedNameEntry[] = [
  { id: 1, spanishName: 'Placaje' },
  { id: 53, spanishName: 'Lanzallamas' },
]

describe('usePokemonSearch — Spanish name → id mapping (AC-13)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockClient.listResource.mockResolvedValue({ ok: true, value: ENGLISH_MOVES })
    mockClient.getSpanishNameIndex.mockResolvedValue({ ok: true, value: SPANISH_INDEX })
  })

  it('finds a move by its Spanish name', async () => {
    const search = usePokemonSearch('move')
    await search.ensureLoaded()

    search.query.value = 'placaje'
    const results = search.results.value
    expect(results.length).toBeGreaterThan(0)
    expect(results[0]!.id).toBe(1) // maps to the correct PokéAPI id
  })

  it('finds a move by partial Spanish name (accent-insensitive)', async () => {
    const search = usePokemonSearch('move')
    await search.ensureLoaded()

    // "Lanzallamas" should match "lanza"
    search.query.value = 'lanza'
    const results = search.results.value
    expect(results.some((r) => r.id === 53)).toBe(true)
  })

  it('still finds moves by English name after Spanish index is loaded', async () => {
    const search = usePokemonSearch('move')
    await search.ensureLoaded()

    search.query.value = 'razor'
    const results = search.results.value
    expect(results.some((r) => r.name === 'razor-wind')).toBe(true)
  })

  it('maps Spanish name to the same id as the English entry', async () => {
    const search = usePokemonSearch('move')
    await search.ensureLoaded()

    // "Lanzallamas" (Spanish for flamethrower, id=53)
    search.query.value = 'lanzallamas'
    const results = search.results.value
    const hit = results.find((r) => r.id === 53)
    expect(hit).toBeDefined()
    expect(hit!.name).toBe('flamethrower') // the English slug (PokéAPI id-linked)
  })

  it('degrades gracefully to English-only when the Spanish index fails', async () => {
    mockClient.getSpanishNameIndex.mockResolvedValue({
      ok: false,
      error: { kind: 'NETWORK', message: 'timeout' },
    })
    const search = usePokemonSearch('move')
    await search.ensureLoaded()

    // English search still works; no in-UI error thrown
    search.query.value = 'tackle'
    const results = search.results.value
    expect(results.some((r) => r.name === 'tackle')).toBe(true)
  })

  it('returns empty results when the query is empty', async () => {
    const search = usePokemonSearch('move')
    await search.ensureLoaded()

    search.query.value = ''
    expect(search.results.value).toHaveLength(0)
  })

  it('ensureLoaded is idempotent — listResource called only once', async () => {
    const search = usePokemonSearch('move')
    await search.ensureLoaded()
    await search.ensureLoaded()
    expect(mockClient.listResource).toHaveBeenCalledTimes(1)
  })
})
