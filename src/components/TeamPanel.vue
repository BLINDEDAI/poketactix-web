<script setup lang="ts">
// One side of the board (own = left, opponent = right). Add Pokémon by search (AC-4, AC-5),
// then renders each PokemonCard. Up to six per side.
import type { Generation, SideKey } from '@/types/battle'
import { MAX_TEAM_SIZE } from '@/types/battle'
import type { SearchSuggestion } from '@/types/search'
import { useBattleStore } from '@/store/battle-store'
import { usePokeApi } from '@/composables/use-poke-api'
import SearchAutocomplete from '@/components/SearchAutocomplete.vue'
import PokemonCard from '@/components/PokemonCard.vue'

const props = defineProps<{
  side: SideKey
  generation: Generation
  editable: boolean
}>()

const store = useBattleStore()
const { client, reportError } = usePokeApi()

const heading = props.side === 'own' ? 'Tu equipo' : 'Equipo rival'

async function onSelect(suggestion: SearchSuggestion): Promise<void> {
  const result = await client.getSpecies(suggestion.name, props.generation)
  if (!result.ok) {
    reportError(result.error)
    return
  }
  store.addPokemon(props.side, result.value)
}
</script>

<template>
  <section class="team" :aria-label="heading">
    <h2 class="team__heading">{{ heading }}</h2>

    <SearchAutocomplete
      v-if="editable && (store.teamFor(side)?.pokemon.length ?? 0) < MAX_TEAM_SIZE"
      kind="pokemon"
      label="Añadir Pokémon"
      :input-id="`add-pokemon-${side}`"
      placeholder="nombre del Pokémon"
      @select="onSelect"
    />

    <div class="team__cards">
      <PokemonCard
        v-for="card in store.teamFor(side)?.pokemon ?? []"
        :key="card.cardId"
        :card="card"
        :side="side"
        :generation="generation"
        :editable="editable"
      />
    </div>
  </section>
</template>

<style scoped>
.team {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 0;
}
.team__heading {
  margin: 0;
  font-size: 1.15rem;
  color: #f4f6fb;
}
.team__cards {
  display: grid;
  gap: 0.75rem;
}
</style>
