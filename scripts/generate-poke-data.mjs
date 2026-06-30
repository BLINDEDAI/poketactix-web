// Build-time data generator for offline reference-data packaging (ADR-004).
//
// Plain Node ESM, built-in `fetch` (Node 20+), NO new dependency. Enumerates the Gen 3-9 entries
// from PokeAPI (REST) plus the Spanish (language_id = 7) name index (GraphQL beta) and emits the
// committed modules under `src/data/generated/`:
//   species.json       — slug -> { speciesId, name, types, baseStats, sprite }
//   moves.json         — slug -> MoveRaw shape (id,name,type,category,power,accuracy,pp,effect,
//                                                spanishName,pastValues)  (resolveMove runs at runtime)
//   abilities.json     — slug -> AbilityRaw shape (id,name,effect,spanishName)
//   search-index.json  — per kind: { english:[{id,name}], spanish:[{id,spanishName}] }
//   generated-meta.json— { generatedAt, snapshotNote, counts:{...} }
//
// A plain .mjs cannot import the TypeScript `poke-api-schemas.ts` parsers, so the minimal field
// extraction is inlined here to emit the SAME JSON shapes the runtime (`BundledPokeDataSource`)
// expects. The runtime reuses the existing pure `resolveMove` over the emitted MoveRaw-shaped JSON.
//
// No secret / API key — PokeAPI is public and unauthenticated (SC-001 / US-030).
//
// Usage: `npm run gen:poke-data` (full set: every /pokemon, /move, /ability + EN/ES indexes for all
// five kinds; ~2.7k requests). Per-generation correctness (Fairy gating, gen-varying move values) is
// applied at RUNTIME by `resolveMove` + the bundled charts, so the bundle carries the full set rather
// than being narrowed by generation.
//   Flags (optional, for a smaller sample run only):
//     --limit-pokemon=N  --limit-moves=N  --limit-abilities=N   cap each kind (0 = all)

import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const REST_BASE = 'https://pokeapi.co/api/v2'
const GRAPHQL_URL = 'https://beta.pokeapi.co/graphql/v1beta'
const REQUEST_TIMEOUT_MS = 20_000
const CONCURRENCY = 8
const MIN_GEN = 3
const MAX_GEN = 9

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(HERE, '..', 'src', 'data', 'generated')

// 18 type names the app knows (mirrors src/types/battle.ts ALL_TYPE_NAMES).
const KNOWN_TYPES = new Set([
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
])

const STAT_KEY_MAP = {
  hp: 'hp',
  attack: 'attack',
  defense: 'defense',
  'special-attack': 'specialAttack',
  'special-defense': 'specialDefense',
  speed: 'speed',
}

// --- arg parsing ------------------------------------------------------------

function parseArgs(argv) {
  const args = { limitPokemon: 0, limitMoves: 0, limitAbilities: 0 }
  for (const a of argv.slice(2)) {
    if (a.startsWith('--limit-pokemon=')) args.limitPokemon = Number(a.split('=')[1]) || 0
    else if (a.startsWith('--limit-moves=')) args.limitMoves = Number(a.split('=')[1]) || 0
    else if (a.startsWith('--limit-abilities=')) args.limitAbilities = Number(a.split('=')[1]) || 0
  }
  return args
}

// --- low-level fetch helpers (explicit timeout + failure path, US-024) ------

async function getJson(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

async function postGraphql(query) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

/** Map an array through `fn` with bounded concurrency, preserving input order. */
async function mapPool(items, limit, fn) {
  const out = new Array(items.length)
  let cursor = 0
  async function worker() {
    let i = cursor++
    while (i < items.length) {
      out[i] = await fn(items[i], i)
      i = cursor++
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length || 1) }, () => worker())
  await Promise.all(workers)
  return out
}

function idFromUrl(url) {
  const m = String(url).match(/\/(\d+)\/?$/)
  return m ? Number.parseInt(m[1], 10) : null
}

// --- minimal extractors (mirror poke-api-schemas.ts emitted shapes) ---------

function extractSpecies(raw) {
  if (!raw || typeof raw.id !== 'number' || typeof raw.name !== 'string') return null
  const types = []
  for (const entry of raw.types ?? []) {
    const name = entry?.type?.name
    if (typeof name !== 'string' || !KNOWN_TYPES.has(name)) return null
    types.push(name)
  }
  if (types.length === 0) return null
  const baseStats = { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 }
  for (const entry of raw.stats ?? []) {
    const key = STAT_KEY_MAP[entry?.stat?.name]
    if (key && typeof entry.base_stat === 'number') baseStats[key] = entry.base_stat
  }
  const other = raw.sprites?.other
  const sprite = other?.['official-artwork']?.front_default ?? raw.sprites?.front_default ?? null
  return { speciesId: raw.id, name: raw.name, types, baseStats, sprite }
}

function pickEffect(entries) {
  const list = []
  for (const e of entries ?? []) {
    const text = e?.short_effect ?? e?.effect
    const lang = e?.language?.name
    if (typeof text === 'string' && typeof lang === 'string') list.push({ text, lang })
  }
  const english = list.find((e) => e.lang === 'en')
  return english ? english.text : (list[0]?.text ?? '')
}

function pickSpanishName(names) {
  for (const entry of names ?? []) {
    if (entry?.language?.name === 'es' && typeof entry.name === 'string') return entry.name
  }
  return null
}

function extractMove(raw) {
  if (!raw || typeof raw.id !== 'number' || typeof raw.name !== 'string') return null
  const type = raw.type?.name
  if (typeof type !== 'string' || !KNOWN_TYPES.has(type)) return null
  const category = raw.damage_class?.name
  if (category !== 'physical' && category !== 'special' && category !== 'status') return null
  const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
  const pastValues = []
  for (const entry of raw.past_values ?? []) {
    const vgId = idFromUrl(entry?.version_group?.url)
    if (vgId === null) continue
    const pastType = entry?.type?.name
    pastValues.push({
      versionGroup: vgId,
      power: num(entry.power),
      accuracy: num(entry.accuracy),
      pp: num(entry.pp),
      type: typeof pastType === 'string' && KNOWN_TYPES.has(pastType) ? pastType : null,
    })
  }
  return {
    id: raw.id,
    name: raw.name,
    type,
    category,
    power: num(raw.power),
    accuracy: num(raw.accuracy),
    pp: num(raw.pp),
    effect: pickEffect(raw.effect_entries),
    spanishName: pickSpanishName(raw.names),
    pastValues,
  }
}

function extractAbility(raw) {
  if (!raw || typeof raw.id !== 'number' || typeof raw.name !== 'string') return null
  return {
    id: raw.id,
    name: raw.name,
    effect: pickEffect(raw.effect_entries),
    spanishName: pickSpanishName(raw.names),
  }
}

// --- enumeration ------------------------------------------------------------

/**
 * All slugs for a resource kind, from the full REST list endpoint.
 *
 * We enumerate the FULL list (not just `/generation/{n}` introductions) on purpose: a Gen 3-9 BATTLE
 * can field a Pokemon / move / ability from ANY earlier generation (a Gen-1 Charizard plays a Gen-6
 * format), and the autocomplete index is exactly this same full REST list. Keying the bundle by the
 * full list guarantees every searchable entry resolves offline — parity with the on-demand network
 * client, which could fetch any slug. The per-generation correctness (Fairy gating, gen-varying move
 * values) is applied at RUNTIME by `resolveMove` + the bundled charts, not by narrowing the bundle.
 */
async function allSlugs(kind) {
  const data = await getJson(`${REST_BASE}/${kind}?limit=20000&offset=0`)
  const set = new Set()
  for (const entry of data.results ?? []) {
    if (typeof entry?.name === 'string') set.add(entry.name)
  }
  return [...set].sort()
}

async function fetchSpanishIndex(kind) {
  const table =
    kind === 'move'
      ? 'pokemon_v2_movename'
      : kind === 'ability'
        ? 'pokemon_v2_abilityname'
        : kind === 'item'
          ? 'pokemon_v2_itemname'
          : 'pokemon_v2_naturename'
  const idField =
    kind === 'move'
      ? 'move_id'
      : kind === 'ability'
        ? 'ability_id'
        : kind === 'item'
          ? 'item_id'
          : 'nature_id'
  const query = `query SpanishNames { ${table}(where: { language_id: { _eq: 7 } }) { ${idField} name } }`
  const body = await postGraphql(query)
  const rows = body?.data?.[table] ?? []
  const entries = []
  for (const row of rows) {
    const id = typeof row?.[idField] === 'number' ? row[idField] : null
    const name = typeof row?.name === 'string' ? row.name : null
    if (id !== null && name !== null) entries.push({ id, spanishName: name.trim().toLowerCase() })
  }
  return entries
}

/** English {id,name}[] index from a REST list endpoint. */
async function fetchEnglishIndex(kind) {
  const data = await getJson(`${REST_BASE}/${kind}?limit=20000&offset=0`)
  const out = []
  for (const entry of data.results ?? []) {
    const id = idFromUrl(entry?.url)
    if (id !== null && typeof entry?.name === 'string') out.push({ id, name: entry.name })
  }
  return out
}

// --- main -------------------------------------------------------------------

async function run() {
  const args = parseArgs(process.argv)
  await mkdir(OUT_DIR, { recursive: true })

  console.log(
    `[gen] enumerating species/moves/abilities (full set, usable in Gen ${MIN_GEN}-${MAX_GEN})…`,
  )
  let pokemonSlugs = await allSlugs('pokemon')
  let moveSlugs = await allSlugs('move')
  let abilitySlugs = await allSlugs('ability')

  if (args.limitPokemon > 0) pokemonSlugs = pokemonSlugs.slice(0, args.limitPokemon)
  if (args.limitMoves > 0) moveSlugs = moveSlugs.slice(0, args.limitMoves)
  if (args.limitAbilities > 0) abilitySlugs = abilitySlugs.slice(0, args.limitAbilities)

  console.log(
    `[gen] fetching ${pokemonSlugs.length} pokemon, ${moveSlugs.length} moves, ${abilitySlugs.length} abilities…`,
  )

  const species = {}
  await mapPool(pokemonSlugs, CONCURRENCY, async (slug) => {
    try {
      const parsed = extractSpecies(await getJson(`${REST_BASE}/pokemon/${slug}`))
      if (parsed) species[slug] = parsed
    } catch (e) {
      console.warn(`[gen] skip pokemon ${slug}: ${e.message}`)
    }
  })

  const moves = {}
  await mapPool(moveSlugs, CONCURRENCY, async (slug) => {
    try {
      const parsed = extractMove(await getJson(`${REST_BASE}/move/${slug}`))
      if (parsed) moves[slug] = parsed
    } catch (e) {
      console.warn(`[gen] skip move ${slug}: ${e.message}`)
    }
  })

  const abilities = {}
  await mapPool(abilitySlugs, CONCURRENCY, async (slug) => {
    try {
      const parsed = extractAbility(await getJson(`${REST_BASE}/ability/${slug}`))
      if (parsed) abilities[slug] = parsed
    } catch (e) {
      console.warn(`[gen] skip ability ${slug}: ${e.message}`)
    }
  })

  console.log('[gen] building search indexes (English REST + Spanish GraphQL)…')
  const searchIndex = {}
  for (const kind of ['pokemon', 'move', 'ability', 'item', 'nature']) {
    const english = await fetchEnglishIndex(kind)
    const spanish = kind === 'pokemon' ? [] : await fetchSpanishIndex(kind)
    searchIndex[kind] = { english, spanish }
  }

  const meta = {
    generatedAt: new Date().toISOString(),
    snapshotNote: `PokeAPI Gen ${MIN_GEN}-${MAX_GEN} snapshot (REST v2 + GraphQL beta, language_id 7 for Spanish). Regenerate with: npm run gen:poke-data`,
    generationRange: { min: MIN_GEN, max: MAX_GEN },
    counts: {
      species: Object.keys(species).length,
      moves: Object.keys(moves).length,
      abilities: Object.keys(abilities).length,
      searchIndex: Object.fromEntries(
        Object.entries(searchIndex).map(([k, v]) => [
          k,
          { english: v.english.length, spanish: v.spanish.length },
        ]),
      ),
    },
  }

  const write = (file, value) =>
    writeFile(resolve(OUT_DIR, file), JSON.stringify(value, null, 0) + '\n', 'utf8')

  await write('species.json', species)
  await write('moves.json', moves)
  await write('abilities.json', abilities)
  await write('search-index.json', searchIndex)
  await write('generated-meta.json', meta)

  console.log('[gen] done. counts:', JSON.stringify(meta.counts))
}

run().catch((e) => {
  console.error('[gen] FAILED:', e)
  process.exit(1)
})
