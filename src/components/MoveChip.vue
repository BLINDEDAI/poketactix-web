<script setup lang="ts">
// A revealed move shown as a type-coloured chip with full data (AC-8, AC-16).
// ALL PokéAPI text (name, effect) is rendered via interpolation — never v-html (US-043 / XSS).
import { computed } from 'vue'
import type { Move } from '@/types/battle'
import { typeColor } from '@/data/type-colors'
import TypeBadge from '@/components/TypeBadge.vue'

const props = defineProps<{ move: Move }>()

const style = computed(() => ({
  borderColor: typeColor(props.move.type),
  boxShadow: `inset 4px 0 0 ${typeColor(props.move.type)}`,
}))

const categoryLabel = computed(() => {
  switch (props.move.category) {
    case 'PHYSICAL':
      return 'Físico'
    case 'SPECIAL':
      return 'Especial'
    case 'STATUS':
      return 'Estado'
  }
  return ''
})
</script>

<template>
  <article class="move-chip" :style="style">
    <header class="move-chip__head">
      <span class="move-chip__name">{{ move.displayName }}</span>
      <TypeBadge :type="move.type" />
    </header>
    <dl class="move-chip__stats">
      <div>
        <dt>Cat.</dt>
        <dd>{{ categoryLabel }}</dd>
      </div>
      <div>
        <dt>Pot.</dt>
        <dd>{{ move.power ?? '—' }}</dd>
      </div>
      <div>
        <dt>Prec.</dt>
        <dd>{{ move.accuracy ?? '—' }}</dd>
      </div>
      <div>
        <dt>PP</dt>
        <dd>{{ move.pp ?? '—' }}</dd>
      </div>
    </dl>
    <p v-if="move.effect" class="move-chip__effect">{{ move.effect }}</p>
  </article>
</template>

<style scoped>
.move-chip {
  border: 1px solid;
  border-radius: 0.4rem;
  padding: 0.4rem 0.55rem;
  background: #21252f;
}
.move-chip__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.move-chip__name {
  font-weight: 700;
  color: #f4f6fb;
}
.move-chip__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 0.9rem;
  margin: 0.35rem 0 0;
}
.move-chip__stats div {
  display: flex;
  gap: 0.25rem;
  font-size: 0.78rem;
  color: #cfd3dc;
}
.move-chip__stats dt {
  font-weight: 600;
  color: #9aa1b2;
}
.move-chip__stats dd {
  margin: 0;
}
.move-chip__effect {
  margin: 0.4rem 0 0;
  font-size: 0.78rem;
  color: #b9bfcc;
}
</style>
