// Integration tests: PokemonCard offline path — AC-6 (offline workflow), AC-7 (sprite placeholder),
// AC-8 (effectiveness indicator wiring in PokemonCard), AC-9 (ValueSlot list selection), XSS bundled.
// Follows the same mock/fixture pattern as pokemon-card.spec.ts.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import type { PokemonCard as Card, Move } from '@/types/battle'
import type { SearchSuggestion } from '@/types/search'
import {
  setSlot,
  initialAbilitySlot,
  initialMoveSlot,
  initialItemSlot,
  initialNatureSlot,
} from '@/domain/reveal-slot'

// Mutable shared mock — tests mutate .results.value / .loaded.value before mounting.
const mockPokemonSearch = {
  query: { value: '' },
  results: { value: [] as SearchSuggestion[] },
  loading: { value: false },
  loaded: { value: false },
  ensureLoaded: vi.fn().mockResolvedValue(undefined),
}

// Mock usePokeApi before component import (vi.mock is hoisted)
vi.mock('@/composables/use-poke-api', () => ({
  usePokeApi: () => ({
    client: {
      getAbility: vi.fn(),
      getMove: vi.fn(),
      getSpecies: vi.fn(),
    },
    apiError: null,
    reportError: vi.fn(),
    clearError: vi.fn(),
  }),
}))

// Mock usePokemonSearch — returns the shared mutable object so tests control results
vi.mock('@/composables/use-pokemon-search', () => ({
  usePokemonSearch: () => mockPokemonSearch,
}))

import { useBattleStore } from '@/store/battle-store'
import PokemonCard from '@/components/PokemonCard.vue'
import ValueSlot from '@/components/ValueSlot.vue'

// ---- fixture helpers (mirrors pokemon-card.spec.ts) ----------------------------

const BASE_STATS = {
  hp: 45,
  attack: 49,
  defense: 49,
  specialAttack: 65,
  specialDefense: 65,
  speed: 45,
}

const MOCK_MOVE: Move = {
  id: 1,
  name: 'tackle',
  displayName: 'Placaje',
  type: 'normal',
  category: 'PHYSICAL',
  power: 40,
  accuracy: 100,
  pp: 35,
  effect: 'Charges at the target.',
}

// Grass move: super-effective (×2) vs water-type opponent (grass vs water = ×2)
const GRASS_MOVE: Move = {
  id: 71,
  name: 'absorb',
  displayName: 'Absorber',
  type: 'grass',
  category: 'SPECIAL',
  power: 20,
  accuracy: 100,
  pp: 25,
  effect: 'Drains half the damage.',
}

function makeOwnCard(overrides: Partial<Card> = {}): Card {
  return {
    cardId: 'card-own-1',
    speciesId: 1,
    name: 'bulbasaur',
    types: ['grass', 'poison'],
    baseStats: BASE_STATS,
    weaknessesResistances: {
      quadrupleWeak: [],
      weak: ['fire'],
      resist: ['water'],
      quarterResist: [],
      immune: [],
    },
    sprite: 'https://example.com/sprite.png',
    ability: setSlot({
      id: 65,
      name: 'overgrow',
      displayName: 'Espesura',
      effect: 'Powers up Grass moves.',
    }),
    moves: [
      setSlot(MOCK_MOVE),
      initialMoveSlot('own'),
      initialMoveSlot('own'),
      initialMoveSlot('own'),
    ],
    item: setSlot({ name: 'Oran Berry' }),
    nature: setSlot({ name: 'Timid' }),
    fainted: false,
    active: false,
    notes: '',
    ...overrides,
  }
}

function makeOpponentCard(overrides: Partial<Card> = {}): Card {
  return {
    cardId: 'card-opp-1',
    speciesId: 6,
    name: 'charizard',
    types: ['fire', 'flying'],
    baseStats: {
      hp: 78,
      attack: 84,
      defense: 78,
      specialAttack: 109,
      specialDefense: 85,
      speed: 100,
    },
    weaknessesResistances: {
      quadrupleWeak: ['rock'],
      weak: ['water', 'electric'],
      resist: ['bug', 'steel', 'fire', 'grass', 'fighting'],
      quarterResist: [],
      immune: ['ground'],
    },
    sprite: null,
    ability: initialAbilitySlot('opponent'),
    moves: [
      initialMoveSlot('opponent'),
      initialMoveSlot('opponent'),
      initialMoveSlot('opponent'),
      initialMoveSlot('opponent'),
    ],
    item: initialItemSlot('opponent'),
    nature: initialNatureSlot('opponent'),
    fainted: false,
    active: false,
    notes: '',
    ...overrides,
  }
}

function mountCard(card: Card, side: 'own' | 'opponent', editable = true) {
  return mount(PokemonCard, {
    props: { card, side, generation: 'GEN_6', editable },
  })
}

// ---- AC-6: offline workflow (fetch stubbed to throw) ----------------------------

describe('AC-6 — offline workflow: fetch stubbed to throw, card renders from props', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        throw new Error('No network — offline mode')
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders own-side card with all data fields when fetch is disabled', () => {
    const wrapper = mountCard(makeOwnCard(), 'own')
    expect(wrapper.text()).toContain('bulbasaur')
    expect(wrapper.text()).toContain('45') // hp from BASE_STATS
    expect(wrapper.text()).toContain('Espesura') // ability displayName
    expect(wrapper.text()).toContain('Placaje') // move displayName
    expect(wrapper.text()).toContain('Oran Berry') // item
    expect(wrapper.text()).toContain('Timid') // nature
  })

  it('renders opponent card with sprite placeholder when sprite is null (offline)', () => {
    const wrapper = mountCard(makeOpponentCard(), 'opponent')
    expect(wrapper.text()).toContain('charizard')
    const img = wrapper.find('img.card__sprite')
    expect(img.exists()).toBe(true)
    expect(img.classes()).toContain('card__sprite--placeholder')
  })

  it('does not throw when rendering cards under offline fetch stub (no freeze/crash)', () => {
    expect(() => mountCard(makeOwnCard(), 'own')).not.toThrow()
    expect(() => mountCard(makeOpponentCard(), 'opponent')).not.toThrow()
  })
})

// ---- AC-7: offline sprite degradation -------------------------------------------

describe('AC-7 — sprite placeholder when sprite is null or image load fails', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('img element always renders even when sprite is null (new contract: placeholder not absent)', () => {
    // Developer note: sprite:null now renders the placeholder <img>, not "no img"
    const wrapper = mountCard(makeOpponentCard(), 'opponent')
    expect(wrapper.find('img.card__sprite').exists()).toBe(true)
  })

  it('img has card__sprite--placeholder class when sprite is null', () => {
    const wrapper = mountCard(makeOpponentCard(), 'opponent')
    expect(wrapper.find('img.card__sprite').classes()).toContain('card__sprite--placeholder')
  })

  it('img src is a data: URI (SPRITE_PLACEHOLDER) when sprite is null', () => {
    const wrapper = mountCard(makeOpponentCard(), 'opponent')
    expect(wrapper.find('img.card__sprite').attributes('src')).toMatch(/^data:/)
  })

  it('all data-driven content renders correctly when sprite is null (AC-7 card intact)', () => {
    const wrapper = mountCard(makeOpponentCard(), 'opponent')
    expect(wrapper.text()).toContain('charizard')
    expect(wrapper.text()).toContain('78') // hp
    expect(wrapper.text()).toContain('rock') // quadruple weak from weaknessesResistances
  })

  it('img shows real sprite URL and no placeholder class when sprite is provided', () => {
    const wrapper = mountCard(makeOwnCard(), 'own') // sprite: 'https://example.com/sprite.png'
    const img = wrapper.find('img.card__sprite')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('https://example.com/sprite.png')
    expect(img.classes()).not.toContain('card__sprite--placeholder')
  })

  it('shows placeholder after @error fires — spriteFailed flips spriteSrc to data: URI', async () => {
    const wrapper = mountCard(makeOwnCard(), 'own')
    const img = wrapper.find('img.card__sprite')
    // Confirm starting state
    expect(img.attributes('src')).toBe('https://example.com/sprite.png')
    // Simulate image load failure
    await img.trigger('error')
    await nextTick()
    const updatedImg = wrapper.find('img.card__sprite')
    expect(updatedImg.attributes('src')).toMatch(/^data:/)
    expect(updatedImg.classes()).toContain('card__sprite--placeholder')
  })
})

// ---- AC-8: effectiveness indicator wiring in PokemonCard -------------------------

describe('AC-8 — effectiveness indicator wiring (singles/doubles/no-active)', () => {
  const SQUIRTLE_STATS = {
    hp: 44,
    attack: 48,
    defense: 65,
    specialAttack: 50,
    specialDefense: 64,
    speed: 43,
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  function setupSinglesWithActiveWaterOpponent() {
    const store = useBattleStore()
    store.createBattle({ name: 'T', generation: 'GEN_6', mode: 'SINGLES', view: 'EDIT' })
    store.addPokemon('opponent', {
      speciesId: 7,
      name: 'squirtle',
      types: ['water'],
      baseStats: SQUIRTLE_STATS,
      sprite: null,
    })
    const oppCard = store.battle!.opponentTeam.pokemon[0]!
    store.setActive('opponent', oppCard.cardId, true)
    return store
  }

  it('SINGLES + own active + grass move vs active water opponent → eff badge x2 shown', () => {
    setupSinglesWithActiveWaterOpponent()
    const ownCard = makeOwnCard({
      active: true,
      moves: [
        setSlot(GRASS_MOVE),
        initialMoveSlot('own'),
        initialMoveSlot('own'),
        initialMoveSlot('own'),
      ],
    })
    const wrapper = mountCard(ownCard, 'own')
    // grass vs water = ×2 — MoveChip compact view shows the eff badge
    expect(wrapper.text()).toContain('x2')
  })

  it('DOUBLES → NO eff badge even with active cards on both sides (suppressed in doubles)', () => {
    const store = useBattleStore()
    store.createBattle({ name: 'T', generation: 'GEN_6', mode: 'DOUBLES', view: 'EDIT' })
    store.addPokemon('opponent', {
      speciesId: 7,
      name: 'squirtle',
      types: ['water'],
      baseStats: SQUIRTLE_STATS,
      sprite: null,
    })
    const oppCard = store.battle!.opponentTeam.pokemon[0]!
    store.setActive('opponent', oppCard.cardId, true)
    const ownCard = makeOwnCard({
      active: true,
      moves: [
        setSlot(GRASS_MOVE),
        initialMoveSlot('own'),
        initialMoveSlot('own'),
        initialMoveSlot('own'),
      ],
    })
    const wrapper = mountCard(ownCard, 'own')
    // mode !== SINGLES → opposingActiveTypes = null → no eff label in MoveChip
    expect(wrapper.find('.eff').exists()).toBe(false)
  })

  it('SINGLES + own NOT active → NO eff badge (card is not in play)', () => {
    setupSinglesWithActiveWaterOpponent()
    const ownCard = makeOwnCard({
      active: false, // own card NOT active
      moves: [
        setSlot(GRASS_MOVE),
        initialMoveSlot('own'),
        initialMoveSlot('own'),
        initialMoveSlot('own'),
      ],
    })
    const wrapper = mountCard(ownCard, 'own')
    expect(wrapper.find('.eff').exists()).toBe(false)
  })

  it('SINGLES + own active + no opposing active → NO eff badge', () => {
    const store = useBattleStore()
    store.createBattle({ name: 'T', generation: 'GEN_6', mode: 'SINGLES', view: 'EDIT' })
    store.addPokemon('opponent', {
      speciesId: 7,
      name: 'squirtle',
      types: ['water'],
      baseStats: SQUIRTLE_STATS,
      sprite: null,
    })
    // Opponent added but NOT set active
    const ownCard = makeOwnCard({
      active: true,
      moves: [
        setSlot(GRASS_MOVE),
        initialMoveSlot('own'),
        initialMoveSlot('own'),
        initialMoveSlot('own'),
      ],
    })
    const wrapper = mountCard(ownCard, 'own')
    expect(wrapper.find('.eff').exists()).toBe(false)
  })
})

// ---- AC-9: ValueSlot list selection (not free text) ----------------------------
// Strategy: mount ValueSlot, click to enter editing mode (shows SearchAutocomplete),
// then emit the 'select' event directly on the SearchAutocomplete child component —
// this proves ValueSlot wires onSelect → emit('set', suggestion.displayName) without
// fighting the reactive results-list rendering in jsdom.

import SearchAutocomplete from '@/components/SearchAutocomplete.vue'

describe('AC-9 — ValueSlot opens SearchAutocomplete and emits selected suggestion displayName', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockPokemonSearch.query.value = ''
    mockPokemonSearch.results.value = []
    mockPokemonSearch.loaded.value = false
  })

  it('shows display button (not editing) initially', () => {
    const wrapper = mount(ValueSlot, {
      props: { label: 'Objeto', kind: 'item', value: null, state: 'UNKNOWN', inputId: 'item-1' },
    })
    expect(wrapper.find('button.value-slot__display').exists()).toBe(true)
  })

  it('shows SearchAutocomplete component (with combobox input) after clicking display button', async () => {
    const wrapper = mount(ValueSlot, {
      props: { label: 'Objeto', kind: 'item', value: null, state: 'UNKNOWN', inputId: 'item-1' },
    })
    await wrapper.find('button.value-slot__display').trigger('click')
    await nextTick()
    // SearchAutocomplete renders an input[role="combobox"]
    expect(wrapper.find('input[role="combobox"]').exists()).toBe(true)
  })

  it('emits "set" with EN suggestion displayName when SearchAutocomplete emits select (list pick)', async () => {
    const suggestion: SearchSuggestion = { id: 132, name: 'oran-berry', displayName: 'Oran Berry' }

    const wrapper = mount(ValueSlot, {
      props: { label: 'Objeto', kind: 'item', value: null, state: 'UNKNOWN', inputId: 'item-1' },
    })
    await wrapper.find('button.value-slot__display').trigger('click')
    await nextTick()

    // Emit 'select' on the SearchAutocomplete child — proves ValueSlot wires onSelect → emit('set')
    const autocomplete = wrapper.findComponent(SearchAutocomplete)
    expect(autocomplete.exists()).toBe(true)
    await autocomplete.vm.$emit('select', suggestion)
    await nextTick()

    const emitted = wrapper.emitted('set') as string[][]
    expect(emitted).toBeDefined()
    expect(emitted[0]![0]).toBe('Oran Berry') // suggestion.displayName emitted, not slug
    expect(emitted[0]![0]).not.toBe('oran-berry')
  })

  it('emits "set" with Spanish displayName when ES suggestion is selected (AC-9 Spanish)', async () => {
    // usePokemonSearch enriches displayName with the Spanish name — simulate that output
    const suggestion: SearchSuggestion = { id: 2, name: 'bold', displayName: 'Osada' }

    const wrapper = mount(ValueSlot, {
      props: {
        label: 'Naturaleza',
        kind: 'nature',
        value: null,
        state: 'UNKNOWN',
        inputId: 'nature-1',
      },
    })
    await wrapper.find('button.value-slot__display').trigger('click')
    await nextTick()

    const autocomplete = wrapper.findComponent(SearchAutocomplete)
    expect(autocomplete.exists()).toBe(true)
    await autocomplete.vm.$emit('select', suggestion)
    await nextTick()

    const emitted = wrapper.emitted('set') as string[][]
    expect(emitted[0]![0]).toBe('Osada') // Spanish displayName emitted, not EN slug
  })

  it('emitted "set" value exactly matches suggestion.displayName — not the raw API slug', async () => {
    const suggestion: SearchSuggestion = { id: 1, name: 'master-ball', displayName: 'Master Ball' }

    const wrapper = mount(ValueSlot, {
      props: { label: 'Objeto', kind: 'item', value: null, state: 'UNKNOWN', inputId: 'item-2' },
    })
    await wrapper.find('button.value-slot__display').trigger('click')
    await nextTick()

    const autocomplete = wrapper.findComponent(SearchAutocomplete)
    await autocomplete.vm.$emit('select', suggestion)
    await nextTick()

    const emitted = wrapper.emitted('set') as string[][]
    expect(emitted[0]![0]).toBe('Master Ball')
    expect(emitted[0]![0]).not.toBe('master-ball') // proves it is NOT the raw slug
  })
})

// ---- XSS sanity check over bundled data path (threat model) --------------------

describe('XSS — bundled data path renders move/ability HTML as inert text', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('move effect containing <script> renders as inert text, no <script> element created', () => {
    const xssMove: Move = {
      id: 999,
      name: 'xss-move',
      displayName: 'XSS Move',
      type: 'normal',
      category: 'PHYSICAL',
      power: 1,
      accuracy: 100,
      pp: 10,
      effect: '<script>alert(1)</script>',
    }
    const card = makeOwnCard({
      moves: [
        setSlot(xssMove),
        initialMoveSlot('own'),
        initialMoveSlot('own'),
        initialMoveSlot('own'),
      ],
    })
    const wrapper = mountCard(card, 'own')
    expect(wrapper.text()).toContain('<script>alert(1)</script>')
    expect(wrapper.find('script').exists()).toBe(false)
  })
})
