// Pinia battle store (Composition syntax). Holds the single current Battle + UI flags, exposes the
// spec's actions, and persists to localStorage via a subscription. Never destructure reactive state.

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  Ability,
  Battle,
  BattleMode,
  Generation,
  Item,
  Move,
  Nature,
  PokemonCard,
  SideKey,
  SpeciesData,
  Team,
  ViewMode,
} from '@/types/battle'
import { MAX_MOVE_SLOTS, MAX_TEAM_SIZE } from '@/types/battle'
import { createPokemonCard } from '@/domain/pokemon-card'
import { reveal, setSlot } from '@/domain/reveal-slot'
import { loadBattle, saveBattle } from '@/store/persistence'

function newBattleId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `battle-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function emptyTeam(side: SideKey): Team {
  return { side, pokemon: [] }
}

export const useBattleStore = defineStore('battle', () => {
  // --- state ---------------------------------------------------------------
  const battle = ref<Battle | null>(null)
  /** True once a battle is created — the board replaces the Create-battle screen (no vue-router). */
  const boardOpen = ref(false)

  // --- getters -------------------------------------------------------------
  const hasBattle = computed(() => battle.value !== null)
  const generation = computed<Generation | null>(() => battle.value?.generation ?? null)
  const mode = computed<BattleMode | null>(() => battle.value?.mode ?? null)
  const view = computed<ViewMode | null>(() => battle.value?.view ?? null)
  const maxActivePerSide = computed(() => (battle.value?.mode === 'DOUBLES' ? 2 : 1))

  function teamFor(side: SideKey): Team | null {
    if (battle.value === null) return null
    return side === 'own' ? battle.value.ownTeam : battle.value.opponentTeam
  }

  function findCard(side: SideKey, cardId: string): PokemonCard | null {
    const team = teamFor(side)
    if (team === null) return null
    return team.pokemon.find((card) => card.cardId === cardId) ?? null
  }

  // --- actions -------------------------------------------------------------

  /** AC-1 — create the battle from the Create-battle screen and open the board. */
  function createBattle(input: {
    name: string
    generation: Generation
    mode: BattleMode
    view: ViewMode
  }): void {
    battle.value = {
      id: newBattleId(),
      name: input.name,
      generation: input.generation,
      mode: input.mode,
      view: input.view,
      ownTeam: emptyTeam('own'),
      opponentTeam: emptyTeam('opponent'),
    }
    boardOpen.value = true
  }

  /** AC-4 / AC-5 — add a Pokémon to a side from generation-resolved species data. */
  function addPokemon(side: SideKey, species: SpeciesData): boolean {
    if (battle.value === null) return false
    const team = teamFor(side)
    if (team === null || team.pokemon.length >= MAX_TEAM_SIZE) return false
    team.pokemon.push(createPokemonCard(species, side, battle.value.generation))
    return true
  }

  function removePokemon(side: SideKey, cardId: string): void {
    const team = teamFor(side)
    if (team === null) return
    team.pokemon = team.pokemon.filter((card) => card.cardId !== cardId)
  }

  /** AC-6 — set an own-side ability or move (own slots are SET/editable). */
  function setOwnAbility(cardId: string, ability: Ability): void {
    const card = findCard('own', cardId)
    if (card === null) return
    card.ability = setSlot(ability)
  }

  function setOwnMove(cardId: string, slotIndex: number, move: Move): void {
    const card = findCard('own', cardId)
    if (card === null || slotIndex < 0 || slotIndex >= MAX_MOVE_SLOTS) return
    card.moves[slotIndex] = setSlot(move)
  }

  /** AC-7 — reveal an opponent ability (any existing ability; unconstrained randomizer reveal). */
  function revealOpponentAbility(cardId: string, ability: Ability): void {
    const card = findCard('opponent', cardId)
    if (card === null) return
    card.ability = reveal(card.ability, ability)
  }

  /** AC-8 — reveal an opponent move slot (any existing move). */
  function revealOpponentMove(cardId: string, slotIndex: number, move: Move): void {
    const card = findCard('opponent', cardId)
    if (card === null || slotIndex < 0 || slotIndex >= MAX_MOVE_SLOTS) return
    card.moves[slotIndex] = reveal(card.moves[slotIndex], move)
  }

  /** AC-6 / AC-9 — set item on either side (own = directly; opponent = discovered). */
  function setItem(side: SideKey, cardId: string, item: Item): void {
    const card = findCard(side, cardId)
    if (card === null) return
    card.item = setSlot(item)
  }

  /** AC-6 / AC-9 — set nature on either side. */
  function setNature(side: SideKey, cardId: string, nature: Nature): void {
    const card = findCard(side, cardId)
    if (card === null) return
    card.nature = setSlot(nature)
  }

  /** AC-10 — toggle fainted. */
  function toggleFainted(side: SideKey, cardId: string): void {
    const card = findCard(side, cardId)
    if (card === null) return
    card.fainted = !card.fainted
  }

  /**
   * AC-11 — set the active Pokémon for a side. One active in singles, up to two in doubles.
   * Toggling an active card off is allowed; turning one on past the cap is ignored.
   */
  function setActive(side: SideKey, cardId: string, active: boolean): void {
    const team = teamFor(side)
    if (team === null) return
    const target = team.pokemon.find((card) => card.cardId === cardId)
    if (target === undefined) return

    if (!active) {
      target.active = false
      return
    }
    const cap = maxActivePerSide.value
    const currentlyActive = team.pokemon.filter((card) => card.active)
    if (target.active) return
    if (currentlyActive.length >= cap) {
      // Singles: replace the existing active. Doubles: ignore beyond two (operator deselects first).
      if (cap === 1 && currentlyActive[0]) currentlyActive[0].active = false
      else return
    }
    target.active = true
  }

  /** AC-12 — free-form per-Pokémon notes. */
  function setNotes(side: SideKey, cardId: string, notes: string): void {
    const card = findCard(side, cardId)
    if (card === null) return
    card.notes = notes
  }

  /** AC-3 — switch between EDIT and STREAMER over the same battle data. */
  function switchView(next: ViewMode): void {
    if (battle.value === null) return
    battle.value.view = next
  }

  /** AC-14 — hydrate the current battle from localStorage on app boot. */
  function hydrate(): void {
    const restored = loadBattle()
    if (restored !== null) {
      battle.value = restored
      boardOpen.value = true
    }
  }

  /** Persist the current battle (driven by the store subscription; exposed for explicit saves/tests). */
  function persist(): void {
    if (battle.value !== null) saveBattle(battle.value)
  }

  return {
    // state
    battle,
    boardOpen,
    // getters
    hasBattle,
    generation,
    mode,
    view,
    maxActivePerSide,
    teamFor,
    findCard,
    // actions
    createBattle,
    addPokemon,
    removePokemon,
    setOwnAbility,
    setOwnMove,
    revealOpponentAbility,
    revealOpponentMove,
    setItem,
    setNature,
    toggleFainted,
    setActive,
    setNotes,
    switchView,
    hydrate,
    persist,
  }
})
