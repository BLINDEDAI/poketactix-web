<script setup lang="ts">
// The battle board (AC-3..AC-16). Both teams share ONE grid so each row's two cards stay aligned
// across sides even when one card is expanded (no column drift). EDIT⇄STREAMER view switch and the
// in-UI PokéAPI error alert (role="alert", US-024 failure path) live here too.
import { computed } from 'vue'
import { useBattleStore } from '@/store/battle-store'
import { usePokeApi } from '@/composables/use-poke-api'
import { MAX_TEAM_SIZE } from '@/types/battle'
import type { SideKey } from '@/types/battle'
import type { SearchSuggestion } from '@/types/search'
import SearchAutocomplete from '@/components/SearchAutocomplete.vue'
import PokemonCard from '@/components/PokemonCard.vue'

const store = useBattleStore()
const { client, reportError, apiError, clearError } = usePokeApi()

const isStreamer = computed(() => store.view === 'STREAMER')
const editable = computed(() => store.view === 'EDIT')
const modeLabel = computed(() => (store.mode === 'DOUBLES' ? 'Dobles' : 'Individuales'))

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
  <main v-if="store.battle" class="board" :class="{ 'board--streamer': isStreamer }">
    <header class="board__bar">
      <div class="board__meta">
        <h1 class="board__name">{{ store.battle.name }}</h1>
        <p class="board__sub">
          Gen {{ store.battle.generation.replace('GEN_', '') }} · {{ modeLabel }}
        </p>
      </div>
      <div class="board__views" role="group" aria-label="Cambiar vista">
        <button
          type="button"
          class="viewbtn"
          :aria-pressed="store.view === 'EDIT'"
          @click="store.switchView('EDIT')"
        >
          Edición
        </button>
        <button
          type="button"
          class="viewbtn"
          :aria-pressed="store.view === 'STREAMER'"
          @click="store.switchView('STREAMER')"
        >
          Streamer
        </button>
      </div>
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
.board__sub {
  margin: 0.1rem 0 0;
  color: #aeb4c2;
  font-size: 0.85rem;
}
.board__views {
  display: flex;
  gap: 0.4rem;
}
.viewbtn {
  min-height: 2.4rem;
  padding: 0.4rem 0.9rem;
  border-radius: 0.4rem;
  border: 1px solid #5b6172;
  background: #262b37;
  color: #f4f6fb;
  cursor: pointer;
}
.viewbtn[aria-pressed='true'] {
  background: #f4c430;
  color: #1c1f29;
  font-weight: 700;
}
.viewbtn:focus-visible {
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
.board--streamer {
  font-size: 1.1rem;
}
.board--streamer .board__grid {
  column-gap: 2rem;
}
@media (max-width: 720px) {
  .board__grid {
    grid-template-columns: 1fr;
  }
}
</style>
