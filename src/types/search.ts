// Search / autocomplete types (English identifiers; US-001).

/** A single autocomplete suggestion (Pokémon species, move, or ability). */
export interface SearchSuggestion {
  /** PokéAPI numeric id. */
  id: number
  /** Canonical English name (the PokéAPI resource name / slug, normalized for display). */
  name: string
  /** Localized display label (Spanish when known), falling back to the English name. */
  displayName: string
}

/** A name→id index entry sourced from the Spanish (language_id = 7) GraphQL/REST index. */
export interface LocalizedNameEntry {
  id: number
  /** Lower-cased Spanish name, for case-insensitive matching. */
  spanishName: string
}
