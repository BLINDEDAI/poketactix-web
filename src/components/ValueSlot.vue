<script setup lang="ts">
// Item / nature slot (AC-6, AC-9). A dedicated slot (not free notes). Own = set directly;
// opponent starts UNKNOWN and is filled when discovered. Free-text value (no PokéAPI text rendered).
import { ref } from 'vue'

const props = defineProps<{
  label: string
  /** Current value name, or null when unset/unknown. */
  value: string | null
  state: 'SET' | 'UNKNOWN' | 'HIDDEN'
  inputId: string
}>()

const emit = defineEmits<{
  (event: 'set', value: string): void
}>()

const draft = ref(props.value ?? '')
const editing = ref(false)

function commit(): void {
  const trimmed = draft.value.trim()
  if (trimmed === '') return
  emit('set', trimmed)
  editing.value = false
}
</script>

<template>
  <div class="value-slot">
    <label v-if="editing" :for="inputId" class="value-slot__label">{{ label }}</label>
    <span v-else class="value-slot__label">{{ label }}</span>

    <template v-if="editing">
      <input
        :id="inputId"
        v-model="draft"
        type="text"
        class="value-slot__input"
        @keydown.enter.prevent="commit"
      />
      <button type="button" class="value-slot__save" @click="commit">Guardar</button>
    </template>

    <template v-else>
      <button
        type="button"
        class="value-slot__display"
        :class="{ 'value-slot__display--unknown': value === null }"
        :aria-label="value ? `${label}: ${value}. Editar` : `${label} desconocido. Establecer`"
        @click="editing = true"
      >
        {{ value ?? 'Desconocido' }}
      </button>
    </template>
  </div>
</template>

<style scoped>
.value-slot {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.value-slot__label {
  font-size: 0.78rem;
  color: #9aa1b2;
  min-width: 4rem;
}
.value-slot__input {
  min-height: 2rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.35rem;
  border: 1px solid #5b6172;
  background: #1c1f29;
  color: #f4f6fb;
}
.value-slot__input:focus-visible,
.value-slot__display:focus-visible,
.value-slot__save:focus-visible {
  outline: 2px solid #f4c430;
  outline-offset: 1px;
}
.value-slot__display {
  min-height: 2rem;
  padding: 0.25rem 0.6rem;
  border-radius: 0.35rem;
  border: 1px solid #5b6172;
  background: #262b37;
  color: #f4f6fb;
  font-weight: 700;
  cursor: pointer;
}
.value-slot__display--unknown {
  color: #9aa1b2;
  font-style: italic;
  font-weight: 500;
}
.value-slot__save {
  min-height: 2rem;
  padding: 0.25rem 0.6rem;
  border-radius: 0.35rem;
  border: none;
  background: #f4c430;
  color: #1c1f29;
  font-weight: 700;
  cursor: pointer;
}
</style>
