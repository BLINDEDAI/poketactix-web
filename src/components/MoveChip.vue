<script setup lang="ts">
// A revealed move shown as a type-coloured chip with full data (AC-8, AC-16).
// ALL PokéAPI text (name, effect) is rendered via interpolation — never v-html (US-043 / XSS).
import { computed } from 'vue'
import type { Move } from '@/types/battle'
import { typeColor } from '@/data/type-colors'
import TypeBadge from '@/components/TypeBadge.vue'

const props = defineProps<{ move: Move; effectiveness?: number | null }>()

const effLabel = computed(() => {
  const e = props.effectiveness
  if (e === undefined || e === null || e === 1) return null
  return e === 0 ? 'Inmune' : `x${e}`
})
const effClass = computed(() => {
  const e = props.effectiveness
  if (e === 0) return 'eff--immune'
  return e !== undefined && e !== null && e > 1 ? 'eff--super' : 'eff--weak'
})

const style = computed(() => ({
  borderLeftColor: typeColor(props.move.type),
  background: `linear-gradient(90deg, ${typeColor(props.move.type)}73, ${typeColor(props.move.type)}1f 48%, #1f232d)`,
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
    <TypeBadge :type="move.type" />
    <span class="move-chip__name">{{ move.displayName }}</span>
    <span class="move-chip__cat" :title="categoryLabel" aria-hidden="true">
      <svg v-if="move.category === 'PHYSICAL'" class="cat-ico" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="11" fill="#e0673a" />
        <path
          d="M12 4 C12.7 9 15 11.3 20 12 C15 12.7 12.7 15 12 20 C11.3 15 9 12.7 4 12 C9 11.3 11.3 9 12 4 Z"
          fill="#fff"
        />
      </svg>
      <svg v-else-if="move.category === 'SPECIAL'" class="cat-ico" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="11" fill="#5a8fe0" />
        <ellipse cx="12" cy="12" rx="7.5" ry="4.2" fill="none" stroke="#fff" stroke-width="2.3" />
      </svg>
      <svg v-else class="cat-ico" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="11" fill="#8b93a0" />
        <circle cx="12" cy="12" r="5.5" fill="none" stroke="#fff" stroke-width="2.3" />
      </svg>
    </span>
    <span class="num num--pow"
      >Pot <span class="num__v">{{ move.power ?? '—' }}</span></span
    >
    <span class="num num--acc"
      >Prec <span class="num__v">{{ move.accuracy ?? '—' }}</span></span
    >
    <span class="num num--pp"
      >PP <span class="num__v">{{ move.pp ?? '—' }}</span></span
    >
    <span v-if="effLabel" class="eff" :class="effClass">{{ effLabel }}</span>
    <!-- Full category label + effect kept in the DOM for screen readers and safe-render checks. -->
    <span class="sr-only">{{ categoryLabel }}</span>
    <span v-if="move.effect" class="sr-only">{{ move.effect }}</span>
  </article>
</template>

<style scoped>
.move-chip {
  display: flex;
  align-items: center;
  gap: 0.32rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-left-width: 3px;
  border-radius: 0.4rem;
  padding: 0.1rem 0.42rem;
  min-width: 0;
}
.move-chip__name {
  flex: 1;
  min-width: 0;
  font-weight: 700;
  font-size: 0.78rem;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.move-chip__cat {
  flex: none;
  display: inline-flex;
  align-items: center;
}
.cat-ico {
  width: 16px;
  height: 16px;
  display: block;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.4));
}
.num {
  flex: none;
  font-size: 0.6rem;
  font-weight: 600;
  color: #c9cfdb;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  padding: 0.06rem 0.36rem;
  border-radius: 0.3rem;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
.num__v {
  font-size: 0.78rem;
  font-weight: 800;
  color: #fff;
}
.num--pow {
  background: rgba(232, 120, 72, 0.26);
}
.num--acc {
  background: rgba(108, 196, 120, 0.26);
}
.num--pp {
  background: rgba(86, 148, 230, 0.26);
}
.eff {
  flex: none;
  font-size: 0.66rem;
  font-weight: 800;
  padding: 0.06rem 0.4rem;
  border-radius: 0.3rem;
  white-space: nowrap;
}
.eff--super {
  background: #2ea043;
  color: #06210f;
}
.eff--weak {
  background: #454c59;
  color: #c7ccd8;
}
.eff--immune {
  background: #2a2f38;
  color: #8b93a4;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
