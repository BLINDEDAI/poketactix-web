<script setup lang="ts">
// A small type-coloured badge (AC-16). Colour bound from reference data, never inline.
import { computed } from 'vue'
import type { TypeName } from '@/types/battle'
import { typeColor } from '@/data/type-colors'

const props = defineProps<{ type: TypeName }>()

const style = computed(() => ({ backgroundColor: typeColor(props.type) }))
</script>

<template>
  <span class="type-badge" :style="style">{{ type }}</span>
</template>

<style scoped>
.type-badge {
  display: inline-block;
  padding: 0.1rem 0.5rem;
  border-radius: 0.75rem;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
}
</style>
