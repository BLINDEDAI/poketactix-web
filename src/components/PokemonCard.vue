<script setup lang="ts">
// The central Pokémon card (AC-4..AC-12, AC-16). Frame gradient bound from type(s); type-coloured
// moves; reveal slots; item/nature slots; fainted/active/notes controls. ALL PokéAPI text via {{ }}.
// `editable` (EDIT view) shows operator controls; STREAMER view hides them but shows the same data.
// Collapsed by default → a compact "glance" summary so all six fit; click to expand the full detail.
import { computed, ref } from 'vue'
import type {
  Ability,
  Generation,
  Move,
  PokemonCard as Card,
  RevealSlot,
  SideKey,
  TypeName,
} from '@/types/battle'
import { frameGradient } from '@/data/type-colors'
import { combinedMultiplier } from '@/domain/type-effectiveness'
import { useBattleStore } from '@/store/battle-store'
import TypeBadge from '@/components/TypeBadge.vue'
import AbilitySlot from '@/components/AbilitySlot.vue'
import MoveSlot from '@/components/MoveSlot.vue'
import MoveChip from '@/components/MoveChip.vue'
import ValueSlot from '@/components/ValueSlot.vue'
import WeaknessChart from '@/components/WeaknessChart.vue'

const props = defineProps<{
  card: Card
  side: SideKey
  generation: Generation
  editable: boolean
}>()

const store = useBattleStore()

const expanded = ref(false)
const frameStyle = computed(() => ({ background: frameGradient(props.card.types) }))
const isOwn = computed(() => props.side === 'own')
const abilityKnown = computed(() => props.card.ability.state === 'SET')
const abilityName = computed(() =>
  props.card.ability.state === 'SET' ? (props.card.ability.value?.displayName ?? '') : '',
)

// AC-11+ — singles-only damage hint: this card's moves vs the opposing active Pokémon. Only when
// the mode is singles, this card is active, and the other side has a (non-fainted) active.
const opposingActiveTypes = computed<readonly TypeName[] | null>(() => {
  if (store.mode !== 'SINGLES' || !props.card.active) return null
  const opponent = store.teamFor(props.side === 'own' ? 'opponent' : 'own')
  // Full scan (filter, not find) so the computed tracks EVERY card's active flag — otherwise an
  // early-returning find stops tracking cards below the match, and activating one further down
  // (a different row) would not re-trigger this hint.
  const actives = (opponent?.pokemon ?? []).filter((card) => card.active && !card.fainted)
  return actives.length > 0 ? actives[0]!.types : null
})

function moveEffectiveness(slot: RevealSlot<Move>): number | null {
  const defenders = opposingActiveTypes.value
  if (defenders === null || slot.state !== 'SET' || !slot.value) return null
  return combinedMultiplier(slot.value.type, defenders, props.generation)
}

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
    :class="{
      'card--fainted': card.fainted,
      'card--active': card.active,
      'card--expanded': expanded,
    }"
    :aria-label="`${card.name}${card.fainted ? ', debilitado' : ''}${card.active ? ', activo' : ''}`"
  >
    <div class="card__frame" :style="frameStyle">
      <!-- Compact glance summary — always visible; toggles the detail below. -->
      <button
        type="button"
        class="card__summary"
        :aria-expanded="expanded"
        @click="expanded = !expanded"
      >
        <img
          v-if="card.sprite"
          :src="card.sprite"
          :alt="card.name"
          class="card__sprite"
          width="37"
          height="37"
          loading="lazy"
        />
        <span class="card__summary-body">
          <span class="card__summary-top">
            <span class="card__name">{{ card.name }}</span>
            <span class="card__types">
              <TypeBadge v-for="type in card.types" :key="type" :type="type" />
            </span>
            <span class="card__chevron" aria-hidden="true">{{ expanded ? '▲' : '▼' }}</span>
          </span>
          <span v-if="!expanded" class="card__summary-ability">
            <span class="card__summary-lbl">Hab</span>
            <span :class="{ 'card__summary-unknown': !abilityKnown }">
              {{ abilityKnown ? abilityName : '???' }}
            </span>
          </span>
          <span class="card__ministats" aria-label="Estadísticas base">
            <span class="ministat"><span>PS</span>{{ card.baseStats.hp }}</span>
            <span class="ministat"><span>Atq</span>{{ card.baseStats.attack }}</span>
            <span class="ministat"><span>Def</span>{{ card.baseStats.defense }}</span>
            <span class="ministat"><span>AtqE</span>{{ card.baseStats.specialAttack }}</span>
            <span class="ministat"><span>DefE</span>{{ card.baseStats.specialDefense }}</span>
            <span class="ministat"><span>Vel</span>{{ card.baseStats.speed }}</span>
          </span>
          <span v-if="!expanded" class="card__minimoves" aria-label="Movimientos revelados">
            <template v-for="(slot, i) in card.moves" :key="i">
              <MoveChip
                v-if="slot.state === 'SET' && slot.value"
                :move="slot.value"
                :effectiveness="moveEffectiveness(slot)"
              />
              <span v-else class="minimove-empty">—</span>
            </template>
          </span>
        </span>
      </button>

      <!-- Full detail — collapsed (kept in the DOM) until the card is expanded. -->
      <div class="card__detail" :class="{ 'card__detail--collapsed': !expanded }">
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
            :effectiveness="moveEffectiveness(moveSlot)"
            @reveal="(move) => onMoveReveal(index, move)"
          />
        </section>

        <section class="card__attrs" aria-label="Objeto y naturaleza">
          <ValueSlot
            label="Objeto"
            kind="item"
            :value="card.item.value?.name ?? null"
            :state="card.item.state"
            :input-id="`item-${card.cardId}`"
            @set="onSetItem"
          />
          <ValueSlot
            label="Naturaleza"
            kind="nature"
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
    </div>
  </article>
</template>

<style scoped>
.card {
  border-radius: 0.7rem;
  padding: 3px;
  /* Collapsed cards stay their natural mini size at the top of the row (no stretch). */
  align-self: start;
}
.card--expanded {
  /* Only an expanded card fills the row, so a pair of open cards matches height. */
  align-self: stretch;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.card--expanded .card__frame {
  flex: 1;
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
  padding: 0.28rem 0.4rem;
}

/* ---- compact glance summary ---- */
.card__summary {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.card__summary:focus-visible {
  outline: 2px solid #f4c430;
  outline-offset: 2px;
  border-radius: 0.4rem;
}
.card__sprite {
  display: block;
  flex: none;
  width: 37px;
  height: 37px;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
}
.card__summary-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
}
.card__summary-top {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.card__name {
  font-size: 0.98rem;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
  text-transform: capitalize;
}
.card__types {
  display: flex;
  gap: 0.25rem;
}
.card__chevron {
  margin-left: auto;
  font-size: 0.65rem;
  color: #c4cad6;
}
.card__summary-ability {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  font-size: 0.74rem;
  font-weight: 700;
  color: #eef1f6;
}
.card__summary-lbl {
  font-weight: 800;
  color: #eef1f6;
}
.card__summary-unknown {
  color: #c4cad6;
  font-style: italic;
}
.card__ministats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.25rem;
}
.ministat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-self: center;
  min-width: 3.3rem;
  gap: 0.02rem;
  padding: 0.16rem 0.4rem;
  border-radius: 0.35rem;
  background: rgba(8, 10, 16, 0.55);
  font-size: 0.74rem;
  font-weight: 800;
  color: #ffffff;
  font-variant-numeric: tabular-nums;
}
.ministat span {
  font-size: 0.54rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: #e3e7ee;
}
.card__minimoves {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.3rem;
}
/* Fixed, identical height for a revealed chip and an empty slot → every card lines up exactly. */
.card__minimoves > * {
  height: 1.5rem;
  box-sizing: border-box;
}
.minimove-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
  border: 1px solid #3a4150;
  border-radius: 0.35rem;
  background: #1c2029;
  color: #7c8597;
  font-size: 0.78rem;
}

/* ---- collapsible detail ---- */
.card__detail--collapsed {
  display: none;
}
.card__detail:not(.card__detail--collapsed) {
  margin-top: 0.5rem;
}
.card__detail > * + * {
  margin-top: 0.4rem;
}
.card__moves {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.35rem;
  padding: 0.35rem;
  border-radius: 0.4rem;
  background: rgba(20, 22, 30, 0.78);
}
.card__attrs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.4rem;
  padding: 0.35rem;
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
