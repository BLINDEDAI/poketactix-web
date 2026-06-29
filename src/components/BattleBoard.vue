<script setup lang="ts">
// The battle board (AC-3..AC-16). Two TeamPanels, the EDIT⇄STREAMER view switch, the in-UI PokéAPI
// error alert (role="alert", US-024 failure path). Layout scales up in STREAMER view for readability.
import { computed } from 'vue'
import { useBattleStore } from '@/store/battle-store'
import { usePokeApi } from '@/composables/use-poke-api'
import TeamPanel from '@/components/TeamPanel.vue'

const store = useBattleStore()
const { apiError, clearError } = usePokeApi()

const isStreamer = computed(() => store.view === 'STREAMER')
const editable = computed(() => store.view === 'EDIT')
const modeLabel = computed(() => (store.mode === 'DOUBLES' ? 'Dobles' : 'Individuales'))
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

    <div class="board__sides">
      <TeamPanel side="own" :generation="store.battle.generation" :editable="editable" />
      <TeamPanel side="opponent" :generation="store.battle.generation" :editable="editable" />
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
.board__sides {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
}
/* STREAMER view scales the board up for readability at a distance. */
.board--streamer {
  font-size: 1.1rem;
}
.board--streamer .board__sides {
  gap: 2rem;
}
@media (max-width: 720px) {
  .board__sides {
    grid-template-columns: 1fr;
  }
}
</style>
