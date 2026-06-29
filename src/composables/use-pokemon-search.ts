// usePokemonSearch — autocomplete over pokemon / move / ability names, English + Spanish (AC-13).
// The English index comes from the REST list; the Spanish index (moves/abilities) comes from the
// GraphQL beta endpoint and degrades gracefully (REST names / English-only) on failure — seam-isolated.

import { computed, ref } from 'vue'
import type { SearchSuggestion } from '@/types/search'
import { usePokeApi } from '@/composables/use-poke-api'

export type SearchKind = 'pokemon' | 'move' | 'ability'

function normalize(text: string): string {
  return text.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') // strip accents for accent-insensitive matching
}

/** Humanize a PokéAPI slug for display: `flame-thrower` → `Flame Thrower`. */
function humanize(slug: string): string {
  return slug
    .split('-')
    .map((part) => (part.length > 0 ? part[0]!.toUpperCase() + part.slice(1) : part))
    .join(' ')
}

const MAX_RESULTS = 25

export function usePokemonSearch(kind: SearchKind) {
  const { client, reportError } = usePokeApi()

  const englishIndex = ref<SearchSuggestion[]>([])
  /** id → spanish display name, lower-cased + accent-stripped key for matching. */
  const spanishById = ref<Map<number, string>>(new Map())
  const loaded = ref(false)
  const loading = ref(false)
  const query = ref('')

  /** Load the English resource list and (for move/ability) the Spanish index. Idempotent. */
  async function ensureLoaded(): Promise<void> {
    if (loaded.value || loading.value) return
    loading.value = true
    try {
      const listResult = await client.listResource(kind)
      if (!listResult.ok) {
        reportError(listResult.error)
        return
      }
      englishIndex.value = listResult.value.map((s) => ({ ...s, displayName: humanize(s.name) }))

      if (kind === 'move' || kind === 'ability') {
        const spanishResult = await client.getSpanishNameIndex(kind)
        if (spanishResult.ok) {
          const map = new Map<number, string>()
          for (const entry of spanishResult.value) map.set(entry.id, entry.spanishName)
          spanishById.value = map
          // Enrich display names with the Spanish label where available.
          englishIndex.value = englishIndex.value.map((s) => {
            const spanish = map.get(s.id)
            return spanish ? { ...s, displayName: humanize(spanish) } : s
          })
        }
        // On Spanish failure we intentionally do NOT surface an error — English-only is acceptable
        // (seam-isolated graceful degradation, spec Edge Cases).
      }
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  /** Suggestions matching the current query against English name + Spanish name (accent-insensitive). */
  const results = computed<SearchSuggestion[]>(() => {
    const q = normalize(query.value)
    if (q === '') return []
    const matches: SearchSuggestion[] = []
    for (const suggestion of englishIndex.value) {
      const englishMatch = normalize(suggestion.name).includes(q)
      const spanish = spanishById.value.get(suggestion.id)
      const spanishMatch = spanish !== undefined && normalize(spanish).includes(q)
      if (englishMatch || spanishMatch) {
        matches.push(suggestion)
        if (matches.length >= MAX_RESULTS) break
      }
    }
    return matches
  })

  return {
    query,
    results,
    loading,
    loaded,
    ensureLoaded,
  }
}
