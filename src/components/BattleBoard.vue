<script setup lang="ts">
// The battle board (AC-4..AC-16). Both teams share ONE grid so each row's two cards stay aligned
// across sides even when one card is expanded (no column drift). The in-UI PokéAPI error alert
// (role="alert", US-024 failure path) lives here too. (Streamer view removed; board is always editable.)
import { computed, ref } from 'vue'
import { useBattleStore } from '@/store/battle-store'
import { usePokeApi } from '@/composables/use-poke-api'
import { MAX_TEAM_SIZE } from '@/types/battle'
import type { SideKey } from '@/types/battle'
import type { SearchSuggestion } from '@/types/search'
import SearchAutocomplete from '@/components/SearchAutocomplete.vue'
import PokemonCard from '@/components/PokemonCard.vue'

const store = useBattleStore()
const { client, reportError, apiError, clearError } = usePokeApi()

const editable = computed(() => store.view === 'EDIT')
const modeLabel = computed(() => (store.mode === 'DOUBLES' ? 'Dobles' : 'Individuales'))

const confirmingNew = ref(false)
function confirmNew(): void {
  confirmingNew.value = false
  store.resetBattle()
}

const ownCards = computed(() => store.teamFor('own')?.pokemon ?? [])
const oppCards = computed(() => store.teamFor('opponent')?.pokemon ?? [])
const rowCount = computed(() => Math.max(ownCards.value.length, oppCards.value.length))
const canAddOwn = computed(() => ownCards.value.length < MAX_TEAM_SIZE)
const canAddOpp = computed(() => oppCards.value.length < MAX_TEAM_SIZE)

async function addPokemon(side: SideKey, suggestion: SearchSuggestion): Promise<void> {
  if (!store.battle) return
  const result = await client.getSpecies(suggestion.name, store.battle.generation)
  if (!result.ok) {
    reportError(result.error)
    return
  }
  store.addPokemon(side, result.value)
}
</script>

<template>
  <main v-if="store.battle" class="board">
    <header class="board__bar">
      <div class="board__meta">
        <span class="board__brand">⚔️ PokeTactix</span>
        <h1 class="board__name">{{ store.battle.name }}</h1>
        <p class="board__sub">
          Gen {{ store.battle.generation.replace('GEN_', '') }} · {{ modeLabel }}
        </p>
      </div>
      <button type="button" class="board__new" @click="confirmingNew = true">
        ＋ Nueva partida
      </button>
    </header>

    <p v-if="apiError" class="board__error" role="alert">
      {{ apiError }}
      <button
        type="button"
        class="board__error-close"
        aria-label="Cerrar aviso"
        @click="clearError"
      >
        ×
      </button>
    </p>

    <div class="board__grid">
      <h2 class="team__heading">Tu equipo</h2>
      <h2 class="team__heading">Equipo rival</h2>

      <div class="board__add">
        <SearchAutocomplete
          v-if="editable && canAddOwn"
          kind="pokemon"
          label="Añadir Pokémon"
          input-id="add-pokemon-own"
          placeholder="nombre del Pokémon"
          @select="(s) => addPokemon('own', s)"
        />
      </div>
      <div class="board__add">
        <SearchAutocomplete
          v-if="editable && canAddOpp"
          kind="pokemon"
          label="Añadir Pokémon"
          input-id="add-pokemon-opponent"
          placeholder="nombre del Pokémon"
          @select="(s) => addPokemon('opponent', s)"
        />
      </div>

      <template v-for="i in rowCount" :key="i">
        <PokemonCard
          v-if="ownCards[i - 1]"
          :card="ownCards[i - 1]"
          side="own"
          :generation="store.battle.generation"
          :editable="editable"
        />
        <div v-else class="board__empty"></div>

        <PokemonCard
          v-if="oppCards[i - 1]"
          :card="oppCards[i - 1]"
          side="opponent"
          :generation="store.battle.generation"
          :editable="editable"
        />
        <div v-else class="board__empty"></div>
      </template>
    </div>

    <div
      v-if="confirmingNew"
      class="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-new-title"
      @click.self="confirmingNew = false"
      @keydown.esc="confirmingNew = false"
    >
      <div class="modal__box">
        <h2 id="confirm-new-title" class="modal__title">¿Empezar una partida nueva?</h2>
        <p class="modal__text">Se perderá el combate actual.</p>
        <div class="modal__actions">
          <button type="button" class="modal__btn modal__btn--ghost" @click="confirmingNew = false">
            Cancelar
          </button>
          <button type="button" class="modal__btn modal__btn--danger" @click="confirmNew">
            Sí, empezar nueva
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.board {
  min-height: 100vh;
  padding: 1rem;
  background: radial-gradient(circle at 30% 0%, #1d2333, #0c0e16 70%);
}
.board__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}
.board__name {
  margin: 0;
  color: #f4f6fb;
  font-size: 1.4rem;
}
.board__brand {
  display: block;
  font-size: 1.6rem;
  font-weight: 900;
  letter-spacing: 0.01em;
  color: #f4c430;
  text-shadow: 0 2px 8px rgba(244, 196, 48, 0.25);
}
.board__sub {
  margin: 0.1rem 0 0;
  color: #aeb4c2;
  font-size: 0.85rem;
}
.board__new {
  min-height: 2.4rem;
  padding: 0.4rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid #f4c430;
  background: transparent;
  color: #f4c430;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease;
}
.board__new:hover {
  background: rgba(244, 196, 48, 0.12);
}
.board__new:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}
.board__error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin: 0 0 1rem;
  padding: 0.6rem 0.9rem;
  border-radius: 0.4rem;
  background: #4a1f1f;
  border: 1px solid #a23b3b;
  color: #ffd9d9;
}
.board__error-close {
  background: transparent;
  border: none;
  color: #ffd9d9;
  font-size: 1.2rem;
  cursor: pointer;
}
.board__error-close:focus-visible {
  outline: 2px solid #fff;
}

/* Both teams in one grid → rows stay aligned across sides regardless of card height. */
.board__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 1.25rem;
  row-gap: 0.4rem;
  /* align-items: stretch (default) → the two cards in a row match the taller one's height. */
}
.team__heading {
  margin: 0;
  font-size: 1.15rem;
  color: #f4f6fb;
}
.board__add {
  min-height: 0;
}
.board__empty {
  /* placeholder grid cell so a side with fewer Pokémon keeps the other column aligned */
}
@media (max-width: 720px) {
  .board__grid {
    grid-template-columns: 1fr;
  }
}

/* New-battle confirmation modal */
.modal {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(4, 6, 11, 0.72);
  backdrop-filter: blur(2px);
}
.modal__box {
  width: 100%;
  max-width: 24rem;
  padding: 1.5rem;
  border-radius: 1rem;
  border: 1px solid #2a313f;
  background: linear-gradient(180deg, #171c26, #11141c);
  box-shadow: 0 20px 60px -20px #000;
  text-align: center;
}
.modal__title {
  margin: 0 0 0.4rem;
  font-size: 1.25rem;
  color: #fff;
}
.modal__text {
  margin: 0 0 1.3rem;
  color: #aeb4c2;
  font-size: 0.92rem;
}
.modal__actions {
  display: flex;
  gap: 0.7rem;
  justify-content: center;
}
.modal__btn {
  min-height: 2.5rem;
  padding: 0.5rem 1.1rem;
  border-radius: 0.55rem;
  font-weight: 700;
  cursor: pointer;
}
.modal__btn:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}
.modal__btn--ghost {
  border: 1px solid #5b6172;
  background: transparent;
  color: #f4f6fb;
}
.modal__btn--ghost:hover {
  background: rgba(255, 255, 255, 0.06);
}
.modal__btn--danger {
  border: none;
  background: #f4c430;
  color: #1c1f29;
}
.modal__btn--danger:hover {
  filter: brightness(1.06);
}
</style>
