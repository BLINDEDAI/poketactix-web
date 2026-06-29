// Domain types for the PokeTactix battle board.
// English identifiers only (US-001). User-facing Spanish lives in i18n values / search index, never here.

/** The 18 Pokémon types. `FAIRY` only exists from Gen 6 onward (enforced by the generation domain). */
export type TypeName =
  | 'normal'
  | 'fire'
  | 'water'
  | 'electric'
  | 'grass'
  | 'ice'
  | 'fighting'
  | 'poison'
  | 'ground'
  | 'flying'
  | 'psychic'
  | 'bug'
  | 'rock'
  | 'ghost'
  | 'dragon'
  | 'dark'
  | 'steel'
  | 'fairy'

export const ALL_TYPE_NAMES: readonly TypeName[] = [
  'normal',
  'fire',
  'water',
  'electric',
  'grass',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
  'fairy',
]

/** Generations the board supports (Gen 3–9). The numeric suffix is the canonical generation number. */
export type Generation = 'GEN_3' | 'GEN_4' | 'GEN_5' | 'GEN_6' | 'GEN_7' | 'GEN_8' | 'GEN_9'

export const ALL_GENERATIONS: readonly Generation[] = [
  'GEN_3',
  'GEN_4',
  'GEN_5',
  'GEN_6',
  'GEN_7',
  'GEN_8',
  'GEN_9',
]

export type BattleMode = 'SINGLES' | 'DOUBLES'

export type ViewMode = 'EDIT' | 'STREAMER'

export type MoveCategory = 'PHYSICAL' | 'SPECIAL' | 'STATUS'

export type SideKey = 'own' | 'opponent'

/**
 * A reveal slot holds either a known value (`SET`), a face-down opponent slot (`HIDDEN`),
 * or an as-yet-undiscovered opponent attribute (`UNKNOWN`).
 * - Own-side ability/move/item/nature start `SET`.
 * - Opponent ability/move start `HIDDEN` (face-down card, flip to reveal).
 * - Opponent item/nature start `UNKNOWN`.
 */
export type SlotState = 'SET' | 'HIDDEN' | 'UNKNOWN'

export interface RevealSlot<T> {
  state: SlotState
  value: T | null
}

/** Generation-resolved move data. All values are correct as-of the battle's generation. */
export interface Move {
  id: number
  name: string
  /** Localized Spanish display name when available; falls back to the English name. */
  displayName: string
  type: TypeName
  category: MoveCategory
  /** `null` when the move has no power (status moves, or PokéAPI reports null). */
  power: number | null
  /** `null` when the move never misses (PokéAPI reports null for always-hit moves). */
  accuracy: number | null
  pp: number | null
  /** Plain-text effect description. Rendered via interpolation only — never v-html (US-043). */
  effect: string
}

/** Generation-resolved ability data. */
export interface Ability {
  id: number
  name: string
  displayName: string
  /** Plain-text effect description. Rendered via interpolation only — never v-html (US-043). */
  effect: string
}

export interface Item {
  name: string
}

export interface Nature {
  name: string
}

export interface BaseStats {
  hp: number
  attack: number
  defense: number
  specialAttack: number
  specialDefense: number
  speed: number
}

/** Weakness / resistance breakdown for a Pokémon, computed for the battle's generation. */
export interface TypeEffectiveness {
  /** ×4 weaknesses. */
  quadrupleWeak: TypeName[]
  /** ×2 weaknesses. */
  weak: TypeName[]
  /** ×0.5 resistances. */
  resist: TypeName[]
  /** ×0.25 resistances. */
  quarterResist: TypeName[]
  /** ×0 immunities. */
  immune: TypeName[]
}

/** Generation-correct species reference data (the part filled automatically from PokéAPI). */
export interface SpeciesData {
  speciesId: number
  name: string
  types: TypeName[]
  baseStats: BaseStats
  /** Official artwork / sprite URL. */
  sprite: string | null
}

export interface PokemonCard {
  /** Stable per-card id (uuid) — distinct from `speciesId` so duplicates of the same species coexist. */
  cardId: string
  speciesId: number
  name: string
  types: TypeName[]
  baseStats: BaseStats
  /** Derived for the battle's generation at add time; stored so the card stays stable. */
  weaknessesResistances: TypeEffectiveness
  sprite: string | null
  ability: RevealSlot<Ability>
  moves: [RevealSlot<Move>, RevealSlot<Move>, RevealSlot<Move>, RevealSlot<Move>]
  item: RevealSlot<Item>
  nature: RevealSlot<Nature>
  fainted: boolean
  active: boolean
  notes: string
}

export interface Team {
  side: SideKey
  pokemon: PokemonCard[]
}

export interface Battle {
  id: string
  name: string
  generation: Generation
  mode: BattleMode
  view: ViewMode
  ownTeam: Team
  opponentTeam: Team
}

export const MAX_TEAM_SIZE = 6
export const MAX_MOVE_SLOTS = 4
