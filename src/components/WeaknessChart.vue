<script setup lang="ts">
// Weakness / resistance display for a Pokémon (AC-4). Generation-correct buckets, type-coloured badges.
import { computed } from 'vue'
import type { TypeEffectiveness } from '@/types/battle'
import { useTypeEffectiveness } from '@/composables/use-type-effectiveness'
import TypeBadge from '@/components/TypeBadge.vue'

const props = defineProps<{ effectiveness: TypeEffectiveness }>()

const { toRows } = useTypeEffectiveness()
const rows = computed(() => toRows(props.effectiveness))
</script>

<template>
  <div class="weakness">
    <h4 class="weakness__title">Debilidades y resistencias</h4>
    <ul v-if="rows.length > 0" class="weakness__rows">
      <li v-for="row in rows" :key="row.label" class="weakness__row">
        <span class="weakness__mult">{{ row.multiplier }}</span>
        <span class="weakness__badges">
          <TypeBadge v-for="type in row.types" :key="type" :type="type" />
        </span>
      </li>
    </ul>
    <p v-else class="weakness__none">Sin debilidades ni resistencias notables.</p>
  </div>
</template>

<style scoped>
.weakness__title {
  margin: 0 0 0.3rem;
  font-size: 0.8rem;
  color: #9aa1b2;
}
.weakness__rows {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.weakness__row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.weakness__mult {
  min-width: 2rem;
  font-weight: 700;
  color: #f4f6fb;
}
.weakness__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}
.weakness__none {
  margin: 0;
  font-size: 0.78rem;
  color: #b9bfcc;
}
</style>
