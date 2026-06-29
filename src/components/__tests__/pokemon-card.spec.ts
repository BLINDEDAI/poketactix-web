// Component tests: PokemonCard — AC-4..AC-12, AC-15, AC-16, XSS negative path.
// Mocks usePokeApi — no real network calls.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import type { PokemonCard as Card, SpeciesData } from '@/types/battle'
import {
  setSlot,
  initialAbilitySlot,
  initialMoveSlot,
  initialItemSlot,
  initialNatureSlot,
} from '@/domain/reveal-slot'
import { frameGradient, typeColor } from '@/data/type-colors'
import type { Ability, Move } from '@/types/battle'

// Mock usePokeApi before importing any component.
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

// Mock usePokemonSearch to avoid network calls from SearchAutocomplete.
vi.mock('@/composables/use-pokemon-search', () => ({
  usePokemonSearch: () => ({
    query: { value: '' },
    results: { value: [] },
    loading: { value: false },
    loaded: { value: false },
    ensureLoaded: vi.fn().mockResolvedValue(undefined),
  }),
}))

import { useBattleStore } from '@/store/battle-store'
import PokemonCard from '@/components/PokemonCard.vue'

// ---- fixture helpers -----------------------------------------------------------

const BASE_STATS = {
  hp: 45,
  attack: 49,
  defense: 49,
  specialAttack: 65,
  specialDefense: 65,
  speed: 45,
}
const MOCK_ABILITY: Ability = {
  id: 1,
  name: 'overgrow',
  displayName: 'Espesura',
  effect: 'Powers up Grass moves in a pinch.',
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
    ability: setSlot(MOCK_ABILITY),
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
    ability: initialAbilitySlot('opponent'), // HIDDEN
    moves: [
      initialMoveSlot('opponent'), // HIDDEN
      initialMoveSlot('opponent'),
      initialMoveSlot('opponent'),
      initialMoveSlot('opponent'),
    ],
    item: initialItemSlot('opponent'), // UNKNOWN
    nature: initialNatureSlot('opponent'), // UNKNOWN
    fainted: false,
    active: false,
    notes: '',
    ...overrides,
  }
}

function mountCard(card: Card, side: 'own' | 'opponent', editable = true) {
  return mount(PokemonCard, {
    props: {
      card,
      side,
      generation: 'GEN_6',
      editable,
    },
  })
}

// ---- tests ---------------------------------------------------------------------

describe('PokemonCard — add own Pokémon (AC-4)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders the Pokémon name', () => {
    const wrapper = mountCard(makeOwnCard(), 'own')
    expect(wrapper.text()).toContain('bulbasaur')
  })

  it('renders the sprite image when provided', () => {
    const wrapper = mountCard(makeOwnCard(), 'own')
    const img = wrapper.find('img.card__sprite')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('https://example.com/sprite.png')
    expect(img.attributes('alt')).toBe('bulbasaur')
  })

  it('renders the base stats', () => {
    const wrapper = mountCard(makeOwnCard(), 'own')
    const text = wrapper.text()
    expect(text).toContain('45') // hp
    expect(text).toContain('49') // attack / defense
    expect(text).toContain('65') // sp.attack / sp.defense
  })

  it('renders a WeaknessChart section', () => {
    const wrapper = mountCard(makeOwnCard(), 'own')
    // WeaknessChart is a child component — assert the rendered text includes the weak type
    expect(wrapper.text()).toContain('fire') // from weaknessesResistances.weak
  })
})

describe('PokemonCard — add opponent Pokémon (AC-5)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('shows species data (name)', () => {
    const wrapper = mountCard(makeOpponentCard(), 'opponent')
    expect(wrapper.text()).toContain('charizard')
  })

  it('does NOT show ability value when slot is HIDDEN', () => {
    const card = makeOpponentCard() // ability is HIDDEN
    const wrapper = mountCard(card, 'opponent')
    // The revealed value div must NOT be present (v-if="revealSlot.state === 'SET' && revealSlot.value")
    expect(wrapper.find('.ability-slot__value').exists()).toBe(false)
  })

  it('shows item as "Desconocido" when UNKNOWN', () => {
    const wrapper = mountCard(makeOpponentCard(), 'opponent')
    // ValueSlot renders "Desconocido" for null value
    expect(wrapper.text()).toContain('Desconocido')
  })
})

describe('PokemonCard — set own ability/move/item/nature (AC-6)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('displays the ability name when SET', () => {
    const wrapper = mountCard(makeOwnCard(), 'own')
    expect(wrapper.text()).toContain('Espesura') // displayName of MOCK_ABILITY
  })

  it('displays the move displayName when SET', () => {
    const wrapper = mountCard(makeOwnCard(), 'own')
    expect(wrapper.text()).toContain('Placaje') // displayName of MOCK_MOVE
  })

  it('displays the item name when SET', () => {
    const wrapper = mountCard(makeOwnCard(), 'own')
    expect(wrapper.text()).toContain('Oran Berry')
  })

  it('displays the nature name when SET', () => {
    const wrapper = mountCard(makeOwnCard(), 'own')
    expect(wrapper.text()).toContain('Timid')
  })
})

describe('PokemonCard — reveal opponent ability (AC-7)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('shows ability displayName + effect after reveal', () => {
    // Build a card with ability already revealed (SET)
    const card = makeOpponentCard({
      ability: setSlot(MOCK_ABILITY),
    })
    const wrapper = mountCard(card, 'opponent')
    expect(wrapper.text()).toContain('Espesura')
    expect(wrapper.text()).toContain('Powers up Grass moves in a pinch.')
    // The hidden ability state button must NOT be present inside the ability-slot
    const abilitySlot = wrapper.find('.ability-slot')
    expect(abilitySlot.find('.facedown').exists()).toBe(false)
  })

  it('shows face-down button inside ability-slot when ability is HIDDEN', () => {
    const wrapper = mountCard(makeOpponentCard(), 'opponent')
    // The facedown button should be present inside ability-slot when HIDDEN
    const abilitySlot = wrapper.find('.ability-slot')
    expect(abilitySlot.find('.facedown').exists()).toBe(true)
  })
})

describe('PokemonCard — reveal opponent move (AC-8)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('shows move type, category, power, accuracy, PP, and effect after reveal', () => {
    const revealedMove: Move = {
      id: 53,
      name: 'flamethrower',
      displayName: 'Lanzallamas',
      type: 'fire',
      category: 'SPECIAL',
      power: 90,
      accuracy: 100,
      pp: 15,
      effect: 'Burns the target.',
    }
    const card = makeOpponentCard({
      moves: [
        setSlot(revealedMove),
        initialMoveSlot('opponent'),
        initialMoveSlot('opponent'),
        initialMoveSlot('opponent'),
      ],
    })
    const wrapper = mountCard(card, 'opponent')
    const text = wrapper.text()
    expect(text).toContain('Lanzallamas') // displayName
    expect(text).toContain('90') // power
    expect(text).toContain('15') // pp
    expect(text).toContain('Burns the target.') // effect
    // category label — MoveChip renders 'Especial' for SPECIAL
    expect(text).toContain('Especial')
  })
})

describe('PokemonCard — set opponent item/nature from unknown (AC-9)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('displays item name when SET', () => {
    const card = makeOpponentCard({
      item: setSlot({ name: 'Choice Scarf' }),
    })
    const wrapper = mountCard(card, 'opponent')
    expect(wrapper.text()).toContain('Choice Scarf')
  })

  it('displays nature name when SET', () => {
    const card = makeOpponentCard({
      nature: setSlot({ name: 'Jolly' }),
    })
    const wrapper = mountCard(card, 'opponent')
    expect(wrapper.text()).toContain('Jolly')
  })
})

describe('PokemonCard — fainted distinguishes card (AC-10)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('adds card--fainted class when fainted is true', () => {
    const card = makeOwnCard({ fainted: true })
    const wrapper = mountCard(card, 'own')
    expect(wrapper.find('article.card').classes()).toContain('card--fainted')
  })

  it('does NOT have card--fainted class when not fainted', () => {
    const card = makeOwnCard({ fainted: false })
    const wrapper = mountCard(card, 'own')
    expect(wrapper.find('article.card').classes()).not.toContain('card--fainted')
  })
})

describe('PokemonCard — active highlight (AC-11)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('adds card--active class when active is true', () => {
    const card = makeOwnCard({ active: true })
    const wrapper = mountCard(card, 'own')
    expect(wrapper.find('article.card').classes()).toContain('card--active')
  })

  it('does NOT have card--active class when not active', () => {
    const card = makeOwnCard({ active: false })
    const wrapper = mountCard(card, 'own')
    expect(wrapper.find('article.card').classes()).not.toContain('card--active')
  })
})

describe('PokemonCard — setActive in store: singles cap (AC-11)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('allows exactly one active per side in SINGLES', () => {
    const store = useBattleStore()
    store.createBattle({ name: 'T', generation: 'GEN_6', mode: 'SINGLES', view: 'EDIT' })

    const spec1: SpeciesData = {
      speciesId: 1,
      name: 'a',
      types: ['fire'],
      baseStats: BASE_STATS,
      sprite: null,
    }
    const spec2: SpeciesData = {
      speciesId: 2,
      name: 'b',
      types: ['water'],
      baseStats: BASE_STATS,
      sprite: null,
    }
    store.addPokemon('own', spec1)
    store.addPokemon('own', spec2)

    const cards = store.battle!.ownTeam.pokemon
    const id1 = cards[0]!.cardId
    const id2 = cards[1]!.cardId

    store.setActive('own', id1, true)
    expect(cards[0]!.active).toBe(true)
    expect(cards[1]!.active).toBe(false)

    // Activating the second should deactivate the first (singles cap = 1)
    store.setActive('own', id2, true)
    expect(cards[0]!.active).toBe(false)
    expect(cards[1]!.active).toBe(true)
  })

  it('allows up to two active per side in DOUBLES', () => {
    const store = useBattleStore()
    store.createBattle({ name: 'T', generation: 'GEN_6', mode: 'DOUBLES', view: 'EDIT' })

    const specs: SpeciesData[] = [
      { speciesId: 1, name: 'a', types: ['fire'], baseStats: BASE_STATS, sprite: null },
      { speciesId: 2, name: 'b', types: ['water'], baseStats: BASE_STATS, sprite: null },
      { speciesId: 3, name: 'c', types: ['grass'], baseStats: BASE_STATS, sprite: null },
    ]
    specs.forEach((s) => store.addPokemon('own', s))
    const cards = store.battle!.ownTeam.pokemon
    const ids = cards.map((c) => c.cardId)

    store.setActive('own', ids[0]!, true)
    store.setActive('own', ids[1]!, true)
    // Two active — OK
    const activeCount = cards.filter((c) => c.active).length
    expect(activeCount).toBe(2)

    // Third activation ignored
    store.setActive('own', ids[2]!, true)
    expect(cards.filter((c) => c.active).length).toBe(2)
  })
})

describe('PokemonCard — per-Pokémon note shown (AC-12)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('shows the notes in a readonly paragraph in STREAMER view (editable=false)', () => {
    const card = makeOwnCard({ notes: 'Watch out for burns!' })
    const wrapper = mountCard(card, 'own', /* editable= */ false)
    expect(wrapper.find('p.card__notes-readonly').text()).toBe('Watch out for burns!')
  })

  it('shows a textarea for notes in EDIT view (editable=true)', () => {
    const card = makeOwnCard({ notes: '' })
    const wrapper = mountCard(card, 'own', true)
    expect(wrapper.find('textarea.card__notes-input').exists()).toBe(true)
  })
})

describe('PokemonCard — flip/reveal state toggles (AC-15)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('face-down ability slot shows facedown button (HIDDEN state → card not revealed)', () => {
    const wrapper = mountCard(makeOpponentCard(), 'opponent')
    // The ability slot renders the facedown button when HIDDEN
    expect(wrapper.find('.facedown').exists()).toBe(true)
  })

  it('revealed ability slot does NOT show facedown button inside ability-slot', () => {
    const card = makeOpponentCard({ ability: setSlot(MOCK_ABILITY) })
    const wrapper = mountCard(card, 'opponent')
    // facedown must be gone from the ability-slot once revealed (move slots are separate)
    const abilitySlot = wrapper.find('.ability-slot')
    expect(abilitySlot.find('.facedown').exists()).toBe(false)
  })

  it('revealed ability slot has flip-in class after justRevealed (verify class presence on .flip element)', () => {
    // The flip animation is driven by `justRevealed` ref that is set inside AbilitySlot.
    // We can verify that the `.flip` container exists when the ability is SET.
    const card = makeOpponentCard({ ability: setSlot(MOCK_ABILITY) })
    const wrapper = mountCard(card, 'opponent')
    // The AbilitySlot has .flip on the value div
    expect(wrapper.find('.ability-slot__value.flip').exists()).toBe(true)
  })
})

describe('PokemonCard — card frame + move chip colours bind to type(s) (AC-16)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('card frame style reflects primary type colour', () => {
    // grass/poison — frame gradient from type-colors
    const card = makeOwnCard({ types: ['grass', 'poison'] })
    const wrapper = mountCard(card, 'own')
    const frameEl = wrapper.find('.card__frame')
    const expectedGradient = frameGradient(['grass', 'poison'])
    // The style is set as an inline style via :style binding
    expect(frameEl.attributes('style')).toContain(expectedGradient.split('(')[0]!) // 'linear-gradient'
  })

  it('MoveChip border colour reflects move type', () => {
    const wrapper = mountCard(makeOwnCard(), 'own')
    // MoveChip for MOCK_MOVE (type: normal) should have a type-coloured border
    const chip = wrapper.find('article.move-chip')
    expect(chip.exists()).toBe(true)
    const style = chip.attributes('style') ?? ''
    const expectedColor = typeColor('normal')
    expect(style).toContain(expectedColor)
  })

  it('TypeBadge is rendered for each type', () => {
    const card = makeOwnCard({ types: ['grass', 'poison'] })
    const wrapper = mountCard(card, 'own')
    // TypeBadge renders the type name; at minimum one per type
    const text = wrapper.text()
    expect(text.toLowerCase()).toContain('grass')
    expect(text.toLowerCase()).toContain('poison')
  })
})

describe('XSS negative path — move-effect/ability string with HTML renders as inert text (threat model)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('a move effect containing <script>alert(1)</script> renders as inert text, not executed', () => {
    const xssMove: Move = {
      id: 999,
      name: 'xss-test',
      displayName: 'XSS Test',
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

    // The raw string must appear as text in the DOM
    expect(wrapper.text()).toContain('<script>alert(1)</script>')
    // No <script> element must have been created
    expect(wrapper.find('script').exists()).toBe(false)
  })

  it('an ability effect containing HTML renders as inert text, not injected as DOM', () => {
    const xssAbility: Ability = {
      id: 999,
      name: 'xss-ability',
      displayName: 'XSS Ability',
      effect: '<img src=x onerror=alert(1)>',
    }
    const card = makeOwnCard({ ability: setSlot(xssAbility) })
    const wrapper = mountCard(card, 'own')

    // The raw HTML string must appear as literal text
    expect(wrapper.text()).toContain('<img src=x onerror=alert(1)>')
    // No img element from the XSS string should exist (only the sprite img, which has a known src)
    const imgs = wrapper.findAll('img')
    // The only img is the sprite (src = sprite URL), not an injected one from the effect string
    for (const img of imgs) {
      expect(img.attributes('src')).not.toBe('x')
    }
  })

  it('a move displayName with HTML renders as inert text in MoveChip', () => {
    const xssMove: Move = {
      id: 998,
      name: 'xss-name',
      displayName: '<b>Bold Move</b>',
      type: 'fire',
      category: 'SPECIAL',
      power: 90,
      accuracy: 100,
      pp: 10,
      effect: 'Normal effect.',
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

    // Text content should include the angle-bracket string literally
    expect(wrapper.text()).toContain('<b>Bold Move</b>')
    // No <b> element created from the move name
    expect(wrapper.find('b').exists()).toBe(false)
  })
})
