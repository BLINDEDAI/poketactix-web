// Mapping between PokéAPI version-group ids and generation numbers, plus a representative
// version-group id per generation. Used by the generation resolver to interpret `past_values`
// (which are keyed by version_group) as-of the chosen generation.
//
// `past_values[i]` in PokéAPI means: "in this version_group and EARLIER, the value was X".
// So to resolve a value as-of generation G, we take the earliest past_value whose version-group
// generation is >= G (i.e. the change had not yet happened), else fall back to the current value.

/** PokéAPI version-group id → generation number. Covers Gen 3–9 main-series groups the app targets. */
export const VERSION_GROUP_GENERATION: Record<number, number> = {
  // Gen 1
  1: 1, // red-blue
  2: 1, // yellow
  // Gen 2
  3: 2, // gold-silver
  4: 2, // crystal
  // Gen 3
  5: 3, // ruby-sapphire
  6: 3, // emerald
  7: 3, // firered-leafgreen
  // Gen 4
  8: 4, // diamond-pearl
  9: 4, // platinum
  10: 4, // heartgold-soulsilver
  // Gen 5
  11: 5, // black-white
  14: 5, // black-2-white-2
  // Gen 6
  15: 6, // x-y
  16: 6, // omega-ruby-alpha-sapphire
  // Gen 7
  17: 7, // sun-moon
  18: 7, // ultra-sun-ultra-moon
  19: 7, // lets-go-pikachu-lets-go-eevee
  // Gen 8
  20: 8, // sword-shield
  23: 8, // brilliant-diamond-shining-pearl
  24: 8, // legends-arceus
  // Gen 9
  25: 9, // scarlet-violet
}

/** Generation number → the generation number of a version group (identity helper for clarity). */
export function versionGroupGeneration(versionGroupId: number): number | null {
  return VERSION_GROUP_GENERATION[versionGroupId] ?? null
}
