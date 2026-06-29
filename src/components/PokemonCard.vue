<script setup lang="ts">
// The central Pokémon card (AC-4..AC-12, AC-16). Frame gradient bound from type(s); type-coloured
// moves; reveal slots; item/nature slots; fainted/active/notes controls. ALL PokéAPI text via {{ }}.
// `editable` (EDIT view) shows operator controls; STREAMER view hides them but shows the same data.
import { computed } from 'vue'
import type { Ability, Generation, Move, PokemonCard as Card, SideKey } from '@/types/battle'
import { frameGradient } from '@/data/type-colors'
import { useBattleStore } from '@/store/battle-store'
import TypeBadge from '@/components/TypeBadge.vue'
import AbilitySlot from '@/components/AbilitySlot.vue'
import MoveSlot from '@/components/MoveSlot.vue'
import ValueSlot from '@/components/ValueSlot.vue'
import WeaknessChart from '@/components/WeaknessChart.vue'

const props = defineProps<{
  card: Card
  side: SideKey
  generation: Generation
  editable: boolean
}>()

const store = useBattleStore()

const frameStyle = computed(() => ({ background: frameGradient(props.card.types) }))
const isOwn = computed(() => props.side === 'own')

function onAbilityReveal(ability: Ability): void {
  if (isOwn.value) store.setOwnAbility(props.card.cardId, ability)
  else store.revealOpponentAbility(props.card.cardId, ability)
}

function onMoveReveal(slotIndex: number, move: Move): void {
  if (isOwn.value) store.setOwnMove(props.card.cardId, slotIndex, move)
  else store.revealOpponentMove(props.card.cardId, slotIndex, move)
}

function onSetItem(value: string): void {
  store.setItem(props.side, props.card.cardId, { name: value })
}

function onSetNature(value: string): void {
  store.setNature(props.side, props.card.cardId, { name: value })
}

function onToggleActive(): void {
  store.setActive(props.side, props.card.cardId, !props.card.active)
}
</script>

<template>
  <article
    class="card"
    :class="{ 'card--fainted': card.fainted, 'card--active': card.active }"
    :aria-label="`${card.name}${card.fainted ? ', debilitado' : ''}${card.active ? ', activo' : ''}`"
  >
    <div class="card__frame" :style="frameStyle">
      <header class="card__header">
        <h3 class="card__name">{{ card.name }}</h3>
        <span class="card__types">
          <TypeBadge v-for="type in card.types" :key="type" :type="type" />
        </span>
      </header>

      <img
        v-if="card.sprite"
        :src="card.sprite"
        :alt="card.name"
        class="card__sprite"
        width="160"
        height="160"
        loading="lazy"
      />

      <dl class="card__stats">
        <div>
          <dt>PS</dt>
          <dd>{{ card.baseStats.hp }}</dd>
        </div>
        <div>
          <dt>Atq</dt>
          <dd>{{ card.baseStats.attack }}</dd>
        </div>
        <div>
          <dt>Def</dt>
          <dd>{{ card.baseStats.defense }}</dd>
        </div>
        <div>
          <dt>AtqEsp</dt>
          <dd>{{ card.baseStats.specialAttack }}</dd>
        </div>
        <div>
          <dt>DefEsp</dt>
          <dd>{{ card.baseStats.specialDefense }}</dd>
        </div>
        <div>
          <dt>Vel</dt>
          <dd>{{ card.baseStats.speed }}</dd>
        </div>
      </dl>

      <WeaknessChart :effectiveness="card.weaknessesResistances" />

      <AbilitySlot :reveal-slot="card.ability" :card-id="card.cardId" @reveal="onAbilityReveal" />

      <section class="card__moves" aria-label="Movimientos">
        <MoveSlot
          v-for="(moveSlot, index) in card.moves"
          :key="index"
          :reveal-slot="moveSlot"
          :generation="generation"
          :card-id="card.cardId"
          :slot-index="index"
          @reveal="(move) => onMoveReveal(index, move)"
        />
      </section>

      <section class="card__attrs" aria-label="Objeto y naturaleza">
        <ValueSlot
          label="Objeto"
          :value="card.item.value?.name ?? null"
          :state="card.item.state"
          :input-id="`item-${card.cardId}`"
          @set="onSetItem"
        />
        <ValueSlot
          label="Naturaleza"
          :value="card.nature.value?.name ?? null"
          :state="card.nature.state"
          :input-id="`nature-${card.cardId}`"
          @set="onSetNature"
        />
      </section>

      <section v-if="editable" class="card__controls" aria-label="Control de combate">
        <button
          type="button"
          class="ctrl"
          :aria-pressed="card.fainted"
          @click="store.toggleFainted(side, card.cardId)"
        >
          {{ card.fainted ? 'Reanimar' : 'Debilitar' }}
        </button>
        <button type="button" class="ctrl" :aria-pressed="card.active" @click="onToggleActive">
          {{ card.active ? 'Desactivar' : 'Activar' }}
        </button>
        <button
          type="button"
          class="ctrl ctrl--danger"
          @click="store.removePokemon(side, card.cardId)"
        >
          Quitar
        </button>
      </section>

      <section v-if="editable" class="card__notes">
        <label :for="`notes-${card.cardId}`" class="card__notes-label">Notas</label>
        <textarea
          :id="`notes-${card.cardId}`"
          class="card__notes-input"
          :value="card.notes"
          rows="2"
          @input="store.setNotes(side, card.cardId, ($event.target as HTMLTextAreaElement).value)"
        ></textarea>
      </section>
      <p v-else-if="card.notes" class="card__notes-readonly">{{ card.notes }}</p>
    </div>
  </article>
</template>

<style scoped>
.card {
  border-radius: 0.7rem;
  padding: 3px;
}
.card--fainted {
  filter: grayscale(0.85);
  opacity: 0.6;
}
.card--active {
  box-shadow: 0 0 0 3px #f4c430;
}
.card__frame {
  border-radius: 0.6rem;
  padding: 0.6rem;
}
.card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.card__name {
  margin: 0;
  font-size: 1.1rem;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
  text-transform: capitalize;
}
.card__types {
  display: flex;
  gap: 0.25rem;
}
.card__sprite {
  display: block;
  margin: 0.3rem auto;
  width: 160px;
  height: 160px;
  object-fit: contain;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.5));
}
.card__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.2rem 0.5rem;
  margin: 0 0 0.5rem;
  padding: 0.4rem;
  border-radius: 0.4rem;
  background: rgba(20, 22, 30, 0.78);
}
.card__stats div {
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
  color: #e6e9f0;
}
.card__stats dt {
  color: #aeb4c2;
}
.card__stats dd {
  margin: 0;
  font-weight: 700;
}
.card__frame > * + * {
  margin-top: 0.5rem;
}
.card__moves {
  display: grid;
  gap: 0.4rem;
  padding: 0.4rem;
  border-radius: 0.4rem;
  background: rgba(20, 22, 30, 0.78);
}
.card__attrs {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.4rem;
  border-radius: 0.4rem;
  background: rgba(20, 22, 30, 0.78);
}
.card__controls {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.ctrl {
  min-height: 2rem;
  padding: 0.25rem 0.7rem;
  border-radius: 0.35rem;
  border: 1px solid #5b6172;
  background: #262b37;
  color: #f4f6fb;
  cursor: pointer;
}
.ctrl[aria-pressed='true'] {
  background: #f4c430;
  color: #1c1f29;
  font-weight: 700;
}
.ctrl--danger {
  border-color: #a23b3b;
}
.ctrl:focus-visible {
  outline: 2px solid #f4c430;
  outline-offset: 1px;
}
.card__notes-label {
  display: block;
  font-size: 0.78rem;
  color: #9aa1b2;
  margin-bottom: 0.2rem;
}
.card__notes-input {
  width: 100%;
  padding: 0.35rem 0.5rem;
  border-radius: 0.35rem;
  border: 1px solid #5b6172;
  background: rgba(20, 22, 30, 0.78);
  color: #f4f6fb;
  resize: vertical;
}
.card__notes-input:focus-visible {
  outline: 2px solid #f4c430;
  outline-offset: 1px;
}
.card__notes-readonly {
  margin: 0;
  padding: 0.4rem;
  border-radius: 0.4rem;
  background: rgba(20, 22, 30, 0.78);
  font-size: 0.82rem;
  color: #d6dae3;
}
</style>
