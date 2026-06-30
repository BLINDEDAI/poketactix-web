// usePokeApi — single PokeApiClient instance + reactive in-UI error state (US-024 failure path).
// The board surfaces `apiError` via role="alert"; the raw cause never reaches the user (invariant).

import { readonly, ref } from 'vue'
import { BundledPokeDataSource } from '@/data/bundled-poke-data-source'
import type { PokeDataSource } from '@/data/poke-data-source'
import type { PokeApiError, PokeApiErrorKind } from '@/data/poke-api-error'

// One data source per session. After ADR-004 this is the BUNDLED source: reference data is read from
// the committed in-app bundle, never the network — so adds / reveals / search resolve instantly and
// work offline. The whole app binds to the `PokeDataSource` interface, so this is the only line that
// changed when the source moved from network to bundle. No runtime module imports a network client.
const client: PokeDataSource = new BundledPokeDataSource()

const apiError = ref<string | null>(null)

/** Map a typed error to a clean, user-facing Spanish message (no internal details). */
function messageFor(kind: PokeApiErrorKind): string {
  switch (kind) {
    case 'TIMEOUT':
      return 'La consulta a PokéAPI tardó demasiado. Inténtalo de nuevo.'
    case 'NETWORK':
      return 'No se pudo conectar con PokéAPI. Revisa tu conexión e inténtalo de nuevo.'
    case 'NOT_FOUND':
      return 'No se encontró ese Pokémon, movimiento o habilidad.'
    case 'RATE_LIMITED':
      return 'Demasiadas consultas a PokéAPI. Espera un momento e inténtalo de nuevo.'
    case 'SERVER':
      return 'PokéAPI no está disponible ahora mismo. Inténtalo de nuevo en unos momentos.'
    case 'INVALID_SHAPE':
      return 'PokéAPI devolvió datos inesperados. Inténtalo de nuevo.'
  }
}

export function usePokeApi() {
  function reportError(error: PokeApiError): void {
    apiError.value = messageFor(error.kind)
  }

  function clearError(): void {
    apiError.value = null
  }

  return {
    client,
    apiError: readonly(apiError),
    reportError,
    clearError,
  }
}
