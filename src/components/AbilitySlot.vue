<script setup lang="ts">
// Ability slot: own side editable (SET), opponent side face-down (HIDDEN) → flip on reveal (AC-7, AC-15).
// Reveal is unconstrained — any existing ability may be chosen. Effect text via interpolation (US-043).
import { ref } from 'vue'
import type { Ability, RevealSlot } from '@/types/battle'
import type { SearchSuggestion } from '@/types/search'
import { isFaceDown } from '@/domain/reveal-slot'
import { usePokeApi } from '@/composables/use-poke-api'
import SearchAutocomplete from '@/components/SearchAutocomplete.vue'

defineProps<{
  revealSlot: RevealSlot<Ability>
  cardId: string
}>()

const emit = defineEmits<{
  (event: 'reveal', ability: Ability): void
}>()

const { client, reportError } = usePokeApi()
const choosing = ref(false)
const justRevealed = ref(false)

async function onSelect(suggestion: SearchSuggestion): Promise<void> {
  const result = await client.getAbility(suggestion.name)
  if (!result.ok) {
    reportError(result.error)
    return
  }
  emit('reveal', result.value)
  choosing.value = false
  justRevealed.value = true
}
</script>

<template>
  <div class="ability-slot">
    <h4 class="ability-slot__label">Habilidad</h4>

    <!-- Revealed / own SET value -->
    <div
      v-if="revealSlot.state === 'SET' && revealSlot.value"
      class="ability-slot__value flip"
      :class="{ 'flip--in': justRevealed }"
    >
      <strong>{{ revealSlot.value.displayName }}</strong>
      <p v-if="revealSlot.value.effect" class="ability-slot__effect">
        {{ revealSlot.value.effect }}
      </p>
    </div>

    <!-- Choosing: search field (opens from the compact button below) -->
    <div v-else-if="choosing" class="ability-slot__hidden">
      <SearchAutocomplete
        kind="ability"
        :label="isFaceDown(revealSlot) ? 'Revelar habilidad' : 'Habilidad'"
        :input-id="`ability-${cardId}`"
        placeholder="habilidad (ES/EN)"
        @select="onSelect"
      />
    </div>

    <!-- Compact slot button: '?' for the opponent (face-down), '+' for your own unset slot -->
    <div v-else class="ability-slot__hidden">
      <button
        type="button"
        class="facedown"
        :class="{ 'facedown--own': !isFaceDown(revealSlot) }"
        :aria-label="
          isFaceDown(revealSlot)
            ? 'Revelar la habilidad del Pokémon oponente'
            : 'Asignar la habilidad'
        "
        @click="choosing = true"
      >
        <span aria-hidden="true">{{ isFaceDown(revealSlot) ? '?' : '+' }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.ability-slot__label {
  margin: 0 0 0.25rem;
  font-size: 0.8rem;
  font-weight: 800;
  color: #eef1f6;
}
.ability-slot__value {
  padding: 0.45rem 0.55rem;
  border-radius: 0.45rem;
  background: rgba(8, 10, 16, 0.55);
}
.ability-slot__value strong {
  color: #ffffff;
  font-weight: 800;
  font-size: 0.92rem;
}
.ability-slot__effect {
  margin: 0.2rem 0 0;
  font-size: 0.8rem;
  font-weight: 700;
  color: #eef1f6;
}
.facedown {
  width: 100%;
  min-height: 2.1rem;
  border-radius: 0.4rem;
  border: 1px dashed #6b7280;
  background: linear-gradient(135deg, #3a4256, #232838);
  color: #f4c430;
  font-size: 1.1rem;
  font-weight: 800;
  cursor: pointer;
}
.facedown--own {
  border-style: solid;
  border-color: #4a5165;
  background: #21262f;
  color: #8b93a4;
}
.facedown:focus-visible {
  outline: 2px solid #f4c430;
  outline-offset: 2px;
}
/* AC-15 flip-in transition when a slot is revealed. */
.flip {
  transform: rotateY(0deg);
  transition: transform 0.4s ease;
}
.flip--in {
  animation: flip-in 0.45s ease;
}
@keyframes flip-in {
  from {
    transform: rotateY(90deg);
    opacity: 0;
  }
  to {
    transform: rotateY(0deg);
    opacity: 1;
  }
}
</style>
