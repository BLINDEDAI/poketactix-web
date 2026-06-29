// Boundary validation (US-040): narrow raw PokéAPI JSON (`unknown`) into the minimal typed shapes
// we consume, before any domain code touches it. Never trust raw external shapes deep in the app.
//
// We model ONLY the fields the app reads. Unknown extra fields are ignored. A missing/mistyped
// required field is a validation failure (PokeApiError 'INVALID_SHAPE'), not a silent default.

import type { TypeName } from '@/types/battle'
import { ALL_TYPE_NAMES } from '@/types/battle'

// --- low-level guards -------------------------------------------------------

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/** A PokéAPI named API resource: `{ name, url }`. We use `name` and extract the trailing id from `url`. */
export interface NamedResourceRaw {
  name: string
  url: string
}

export function asNamedResource(value: unknown): NamedResourceRaw | null {
  if (!isRecord(value)) return null
  const name = asString(value.name)
  const url = asString(value.url)
  if (name === null || url === null) return null
  return { name, url }
}

/** Extract the numeric id from a PokéAPI resource url like `.../type/9/`. */
export function idFromUrl(url: string): number | null {
  const match = url.match(/\/(\d+)\/?$/)
  if (!match || match[1] === undefined) return null
  const id = Number.parseInt(match[1], 10)
  return Number.isNaN(id) ? null : id
}

export function asTypeName(value: unknown): TypeName | null {
  const name = asString(value)
  if (name === null) return null
  return (ALL_TYPE_NAMES as readonly string[]).includes(name) ? (name as TypeName) : null
}

// --- /pokemon/{id} ----------------------------------------------------------

export interface PokemonRaw {
  id: number
  name: string
  types: TypeName[]
  baseStats: {
    hp: number
    attack: number
    defense: number
    specialAttack: number
    specialDefense: number
    speed: number
  }
  sprite: string | null
}

const STAT_KEY_MAP: Record<string, keyof PokemonRaw['baseStats']> = {
  hp: 'hp',
  attack: 'attack',
  defense: 'defense',
  'special-attack': 'specialAttack',
  'special-defense': 'specialDefense',
  speed: 'speed',
}

function parseSprite(value: unknown): string | null {
  if (!isRecord(value)) return null
  // Prefer official artwork; fall back to the default front sprite.
  const other = isRecord(value.other) ? value.other : undefined
  const official =
    other && isRecord(other['official-artwork']) ? other['official-artwork'] : undefined
  const officialFront = official ? asString(official.front_default) : null
  if (officialFront !== null) return officialFront
  return asString(value.front_default)
}

export function parsePokemon(value: unknown): PokemonRaw | null {
  if (!isRecord(value)) return null
  const id = asNumber(value.id)
  const name = asString(value.name)
  if (id === null || name === null) return null

  if (!isArray(value.types)) return null
  const types: TypeName[] = []
  for (const entry of value.types) {
    if (!isRecord(entry)) return null
    const typeRes = asNamedResource(entry.type)
    if (typeRes === null) return null
    const typeName = asTypeName(typeRes.name)
    if (typeName === null) return null // unknown type — reject rather than guess
    types.push(typeName)
  }
  if (types.length === 0) return null

  const baseStats: PokemonRaw['baseStats'] = {
    hp: 0,
    attack: 0,
    defense: 0,
    specialAttack: 0,
    specialDefense: 0,
    speed: 0,
  }
  if (!isArray(value.stats)) return null
  for (const entry of value.stats) {
    if (!isRecord(entry)) return null
    const statRes = asNamedResource(entry.stat)
    const base = asNumber(entry.base_stat)
    if (statRes === null || base === null) return null
    const key = STAT_KEY_MAP[statRes.name]
    if (key) baseStats[key] = base
  }

  return { id, name, types, baseStats, sprite: parseSprite(value.sprites) }
}

// --- /type/{id} (damage relations + past_damage_relations) ------------------

export interface DamageRelationsRaw {
  doubleDamageFrom: number[]
  halfDamageFrom: number[]
  noDamageFrom: number[]
}

export interface PastDamageRelationsRaw {
  /** generation number the change took effect (the generation this chart applies UP TO, exclusive of later). */
  generation: number
  relations: DamageRelationsRaw
}

export interface TypeRaw {
  id: number
  name: TypeName
  damageRelations: DamageRelationsRaw
  pastDamageRelations: PastDamageRelationsRaw[]
}

function parseResourceIds(value: unknown): number[] | null {
  if (!isArray(value)) return null
  const ids: number[] = []
  for (const entry of value) {
    const res = asNamedResource(entry)
    if (res === null) return null
    const id = idFromUrl(res.url)
    if (id === null) return null
    ids.push(id)
  }
  return ids
}

function parseDamageRelations(value: unknown): DamageRelationsRaw | null {
  if (!isRecord(value)) return null
  const doubleDamageFrom = parseResourceIds(value.double_damage_from)
  const halfDamageFrom = parseResourceIds(value.half_damage_from)
  const noDamageFrom = parseResourceIds(value.no_damage_from)
  if (doubleDamageFrom === null || halfDamageFrom === null || noDamageFrom === null) return null
  return { doubleDamageFrom, halfDamageFrom, noDamageFrom }
}

export function parseType(value: unknown): TypeRaw | null {
  if (!isRecord(value)) return null
  const id = asNumber(value.id)
  const name = asTypeName(value.name)
  if (id === null || name === null) return null
  const damageRelations = parseDamageRelations(value.damage_relations)
  if (damageRelations === null) return null

  const pastDamageRelations: PastDamageRelationsRaw[] = []
  if (isArray(value.past_damage_relations)) {
    for (const entry of value.past_damage_relations) {
      if (!isRecord(entry)) continue
      const genRes = asNamedResource(entry.generation)
      const relations = parseDamageRelations(entry.damage_relations)
      if (genRes === null || relations === null) continue
      const genId = idFromUrl(genRes.url)
      if (genId === null) continue
      pastDamageRelations.push({ generation: genId, relations })
    }
  }
  return { id, name, damageRelations, pastDamageRelations }
}

// --- /move/{id} (with past_values) ------------------------------------------

export interface MovePastValueRaw {
  versionGroup: number
  power: number | null
  accuracy: number | null
  pp: number | null
  type: TypeName | null
}

export interface MoveRaw {
  id: number
  name: string
  type: TypeName
  category: 'physical' | 'special' | 'status'
  power: number | null
  accuracy: number | null
  pp: number | null
  effect: string
  spanishName: string | null
  pastValues: MovePastValueRaw[]
}

function parseEffectEntries(value: unknown): { effect: string; lang: string }[] {
  const entries: { effect: string; lang: string }[] = []
  if (!isArray(value)) return entries
  for (const entry of value) {
    if (!isRecord(entry)) continue
    // `short_effect` is more concise; fall back to `effect`.
    const text = asString(entry.short_effect) ?? asString(entry.effect)
    const langRes = asNamedResource(entry.language)
    if (text === null || langRes === null) continue
    entries.push({ effect: text, lang: langRes.name })
  }
  return entries
}

/** Pick the English effect, falling back to the first available. */
export function pickEffect(entries: { effect: string; lang: string }[]): string {
  const english = entries.find((e) => e.lang === 'en')
  if (english) return english.effect
  return entries[0]?.effect ?? ''
}

function parseSpanishName(value: unknown): string | null {
  if (!isArray(value)) return null
  for (const entry of value) {
    if (!isRecord(entry)) continue
    const langRes = asNamedResource(entry.language)
    const name = asString(entry.name)
    if (langRes && langRes.name === 'es' && name !== null) return name
  }
  return null
}

function parseCategory(value: unknown): MoveRaw['category'] | null {
  const res = asNamedResource(value)
  if (res === null) return null
  if (res.name === 'physical' || res.name === 'special' || res.name === 'status') return res.name
  return null
}

export function parseMove(value: unknown): MoveRaw | null {
  if (!isRecord(value)) return null
  const id = asNumber(value.id)
  const name = asString(value.name)
  if (id === null || name === null) return null
  const typeRes = asNamedResource(value.type)
  if (typeRes === null) return null
  const type = asTypeName(typeRes.name)
  if (type === null) return null
  const category = parseCategory(value.damage_class)
  if (category === null) return null

  const power = asNumber(value.power)
  const accuracy = asNumber(value.accuracy)
  const pp = asNumber(value.pp)
  const effect = pickEffect(parseEffectEntries(value.effect_entries))
  const spanishName = parseSpanishName(value.names)

  const pastValues: MovePastValueRaw[] = []
  if (isArray(value.past_values)) {
    for (const entry of value.past_values) {
      if (!isRecord(entry)) continue
      const vgRes = asNamedResource(entry.version_group)
      if (vgRes === null) continue
      const vgId = idFromUrl(vgRes.url)
      if (vgId === null) continue
      const pastTypeRes = asNamedResource(entry.type)
      const pastType = pastTypeRes ? asTypeName(pastTypeRes.name) : null
      pastValues.push({
        versionGroup: vgId,
        power: asNumber(entry.power),
        accuracy: asNumber(entry.accuracy),
        pp: asNumber(entry.pp),
        type: pastType,
      })
    }
  }

  return { id, name, type, category, power, accuracy, pp, effect, spanishName, pastValues }
}

// --- /ability/{id} ----------------------------------------------------------

export interface AbilityRaw {
  id: number
  name: string
  effect: string
  spanishName: string | null
}

export function parseAbility(value: unknown): AbilityRaw | null {
  if (!isRecord(value)) return null
  const id = asNumber(value.id)
  const name = asString(value.name)
  if (id === null || name === null) return null
  const effect = pickEffect(parseEffectEntries(value.effect_entries))
  const spanishName = parseSpanishName(value.names)
  return { id, name, effect, spanishName }
}
