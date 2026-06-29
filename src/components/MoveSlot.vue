<script setup lang="ts">
// One of four move slots: own side editable (SET), opponent face-down (HIDDEN) → flip on reveal
// (AC-8, AC-15). Reveal is unconstrained (any move). Move text via interpolation (US-043).
import { ref } from 'vue'
import type { Generation, Move, RevealSlot } from '@/types/battle'
import type { SearchSuggestion } from '@/types/search'
import { isFaceDown } from '@/domain/reveal-slot'
import { usePokeApi } from '@/composables/use-poke-api'
import SearchAutocomplete from '@/components/SearchAutocomplete.vue'
import MoveChip from '@/components/MoveChip.vue'

const props = defineProps<{
  revealSlot: RevealSlot<Move>
  generation: Generation
  cardId: string
  slotIndex: number
  effectiveness?: number | null
}>()

const emit = defineEmits<{
  (event: 'reveal', move: Move): void
}>()

const { client, reportError } = usePokeApi()
const choosing = ref(false)
const justRevealed = ref(false)

async function onSelect(suggestion: SearchSuggestion): Promise<void> {
  const result = await client.getMove(suggestion.name, props.generation)
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
  <div class="move-slot">
    <!-- Revealed / own SET value -->
    <div
      v-if="revealSlot.state === 'SET' && revealSlot.value"
      class="flip"
      :class="{ 'flip--in': justRevealed }"
    >
      <MoveChip :move="revealSlot.value" :effectiveness="effectiveness" />
    </div>

    <!-- Choosing: search field (opens from the compact button below) -->
    <SearchAutocomplete
      v-else-if="choosing"
      kind="move"
      :label="
        isFaceDown(revealSlot)
          ? `Revelar movimiento ${slotIndex + 1}`
          : `Movimiento ${slotIndex + 1}`
      "
      :input-id="`move-${cardId}-${slotIndex}`"
      placeholder="movimiento (ES/EN)"
      @select="onSelect"
    />

    <!-- Compact slot button: '?' for the opponent (face-down), '+' for your own unset slot -->
    <button
      v-else
      type="button"
      class="facedown"
      :class="{ 'facedown--own': !isFaceDown(revealSlot) }"
      :aria-label="
        isFaceDown(revealSlot)
          ? `Revelar el movimiento ${slotIndex + 1} del Pokémon oponente`
          : `Asignar el movimiento ${slotIndex + 1}`
      "
      @click="choosing = true"
    >
      <span aria-hidden="true">{{ isFaceDown(revealSlot) ? '?' : '+' }}</span>
    </button>
  </div>
</template>

<style scoped>
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
