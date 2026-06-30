<script setup lang="ts">
// Generic name autocomplete for pokemon / move / ability (English + Spanish, AC-13).
// Label-associated input (a11y), keyboard-operable list, accessible names. PokéAPI text via {{ }}.
import { ref, watch } from 'vue'
import { usePokemonSearch, type SearchKind } from '@/composables/use-pokemon-search'
import type { SearchSuggestion } from '@/types/search'

const props = defineProps<{
  kind: SearchKind
  label: string
  inputId: string
  placeholder?: string
  /** Keep the label in the DOM (a11y) but hide it visually — avoids it bloating tight card slots. */
  hideLabel?: boolean
}>()

const emit = defineEmits<{
  (event: 'select', suggestion: SearchSuggestion): void
}>()

const { query, results, loading, ensureLoaded } = usePokemonSearch(props.kind)
const open = ref(false)
const activeIndex = ref(-1)

function onFocus(): void {
  void ensureLoaded()
  open.value = true
}

watch(query, () => {
  open.value = true
  activeIndex.value = -1
})

function choose(suggestion: SearchSuggestion): void {
  emit('select', suggestion)
  query.value = ''
  open.value = false
  activeIndex.value = -1
}

function onKeydown(event: KeyboardEvent): void {
  if (results.value.length === 0) return
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % results.value.length
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    activeIndex.value = activeIndex.value <= 0 ? results.value.length - 1 : activeIndex.value - 1
  } else if (event.key === 'Enter') {
    const choice = results.value[activeIndex.value] ?? results.value[0]
    if (choice) {
      event.preventDefault()
      choose(choice)
    }
  } else if (event.key === 'Escape') {
    open.value = false
  }
}
</script>

<template>
  <div class="search">
    <label :for="inputId" :class="{ 'sr-only': hideLabel }">{{ label }}</label>
    <input
      :id="inputId"
      v-model="query"
      type="text"
      role="combobox"
      :aria-expanded="open && results.length > 0"
      aria-autocomplete="list"
      :aria-controls="`${inputId}-list`"
      :placeholder="placeholder ?? ''"
      autocomplete="off"
      @focus="onFocus"
      @keydown="onKeydown"
    />
    <p v-if="loading" class="search__status" role="status">Cargando…</p>
    <ul
      v-if="open && results.length > 0"
      :id="`${inputId}-list`"
      class="search__list"
      role="listbox"
    >
      <li
        v-for="(suggestion, index) in results"
        :key="suggestion.id"
        class="search__option"
        :class="{ 'search__option--active': index === activeIndex }"
        role="option"
        :aria-selected="index === activeIndex"
      >
        <button type="button" class="search__btn" @click="choose(suggestion)">
          {{ suggestion.displayName }}
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.search {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.search label {
  font-size: 0.85rem;
  color: #cfd3dc;
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
.search input {
  min-height: 2.25rem;
  padding: 0.4rem 0.6rem;
  border-radius: 0.4rem;
  border: 1px solid #5b6172;
  background: #1c1f29;
  color: #f4f6fb;
}
.search input:focus-visible {
  outline: 2px solid #f4c430;
  outline-offset: 1px;
}
.search__list {
  position: absolute;
  top: 100%;
  z-index: 10;
  width: 100%;
  max-height: 16rem;
  overflow-y: auto;
  margin: 0.15rem 0 0;
  padding: 0;
  list-style: none;
  background: #20242f;
  border: 1px solid #5b6172;
  border-radius: 0.4rem;
}
.search__btn {
  width: 100%;
  min-height: 2.25rem;
  text-align: left;
  padding: 0.4rem 0.6rem;
  background: transparent;
  border: none;
  color: #f4f6fb;
  cursor: pointer;
}
.search__option--active .search__btn,
.search__btn:hover,
.search__btn:focus-visible {
  background: #323848;
  outline: none;
}
.search__status {
  margin: 0;
  font-size: 0.8rem;
  color: #aeb4c2;
}
</style>
