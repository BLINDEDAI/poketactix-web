<script setup lang="ts">
// Create-battle screen (AC-1): name, generation (Gen 3–9, required), mode.
// Validation shown only after interaction; submit disabled until valid; @submit.prevent.
// (view is fixed to EDIT internally — the streamer view was removed.)
import { computed, ref } from 'vue'
import type { BattleMode, Generation, ViewMode } from '@/types/battle'
import { ALL_GENERATIONS } from '@/types/battle'
import { generationNumber } from '@/domain/generation'
import { useBattleStore } from '@/store/battle-store'

const store = useBattleStore()

const name = ref('')
const generation = ref<Generation | ''>('')
const mode = ref<BattleMode>('SINGLES')
const view = ref<ViewMode>('EDIT')
const touched = ref(false)

const nameError = computed(() =>
  touched.value && name.value.trim() === '' ? 'Indica un nombre.' : '',
)
const generationError = computed(() =>
  touched.value && generation.value === '' ? 'Elige una generación.' : '',
)

const isValid = computed(() => name.value.trim() !== '' && generation.value !== '')

function genLabel(gen: Generation): string {
  return `Generación ${generationNumber(gen)}`
}

function onSubmit(): void {
  touched.value = true
  if (!isValid.value || generation.value === '') return
  store.createBattle({
    name: name.value.trim(),
    generation: generation.value,
    mode: mode.value,
    view: view.value,
  })
}
</script>

<template>
  <main class="create" aria-labelledby="create-title">
    <h1 id="create-title" class="create__title">PokeTactix — Nuevo combate</h1>

    <form class="create__form" novalidate @submit.prevent="onSubmit">
      <div class="field">
        <label for="battle-name">Nombre del combate</label>
        <input
          id="battle-name"
          v-model="name"
          type="text"
          autocomplete="off"
          :aria-invalid="nameError !== ''"
          @blur="touched = true"
        />
        <p v-if="nameError" class="field__error" role="alert">{{ nameError }}</p>
      </div>

      <div class="field">
        <label for="battle-generation">Generación</label>
        <select
          id="battle-generation"
          v-model="generation"
          :aria-invalid="generationError !== ''"
          @blur="touched = true"
        >
          <option value="" disabled>Elige una generación</option>
          <option v-for="gen in ALL_GENERATIONS" :key="gen" :value="gen">
            {{ genLabel(gen) }}
          </option>
        </select>
        <p v-if="generationError" class="field__error" role="alert">{{ generationError }}</p>
      </div>

      <fieldset class="field">
        <legend>Modo</legend>
        <label class="radio"
          ><input v-model="mode" type="radio" value="SINGLES" /> Individuales</label
        >
        <label class="radio"><input v-model="mode" type="radio" value="DOUBLES" /> Dobles</label>
      </fieldset>

      <button type="submit" class="create__submit" :disabled="touched && !isValid">
        Empezar combate
      </button>
    </form>
  </main>
</template>

<style scoped>
.create {
  max-width: 30rem;
  margin: 0 auto;
  padding: 2rem 1.25rem;
}
.create__title {
  text-align: center;
  color: #f4f6fb;
}
.create__form {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  border: none;
  padding: 0;
  margin: 0;
}
.field label,
.field legend {
  font-size: 0.9rem;
  color: #cfd3dc;
}
.field input[type='text'],
.field select {
  min-height: 2.4rem;
  padding: 0.45rem 0.6rem;
  border-radius: 0.4rem;
  border: 1px solid #5b6172;
  background: #1c1f29;
  color: #f4f6fb;
}
.field input:focus-visible,
.field select:focus-visible,
.radio input:focus-visible {
  outline: 2px solid #f4c430;
  outline-offset: 1px;
}
.radio {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-right: 1rem;
  color: #e6e9f0;
}
.field__error {
  margin: 0;
  font-size: 0.8rem;
  color: #ff9b9b;
}
.create__submit {
  min-height: 2.6rem;
  border-radius: 0.45rem;
  border: none;
  background: #f4c430;
  color: #1c1f29;
  font-weight: 800;
  font-size: 1rem;
  cursor: pointer;
}
.create__submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.create__submit:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}
</style>
