// Component tests: CreateBattleScreen → BattleBoard flow (AC-1). Streamer view removed.
// Mocks usePokeApi — no real network calls.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

// Mock usePokeApi before importing components that use it.
vi.mock('@/composables/use-poke-api', () => ({
  usePokeApi: () => ({
    client: {},
    apiError: null,
    reportError: vi.fn(),
    clearError: vi.fn(),
  }),
}))

// Mock usePokemonSearch to avoid network calls from SearchAutocomplete.
vi.mock('@/composables/use-pokemon-search', () => ({
  usePokemonSearch: () => ({
    query: { value: '' },
    results: { value: [] },
    loading: { value: false },
    loaded: { value: false },
    ensureLoaded: vi.fn().mockResolvedValue(undefined),
  }),
}))

import { useBattleStore } from '@/store/battle-store'
import CreateBattleScreen from '@/components/CreateBattleScreen.vue'
import BattleBoard from '@/components/BattleBoard.vue'

describe('CreateBattleScreen — AC-1', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('calls createBattle with the correct generation, mode, and view on submit', async () => {
    const store = useBattleStore()
    const spy = vi.spyOn(store, 'createBattle')

    const wrapper = mount(CreateBattleScreen)

    // Fill name
    await wrapper.find('input#battle-name').setValue('Test Battle')
    // Select generation GEN_6
    await wrapper.find('select#battle-generation').setValue('GEN_6')
    // Mode defaults to SINGLES, view to EDIT — verify submit with defaults
    await wrapper.find('form').trigger('submit')
    await nextTick()

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test Battle',
        generation: 'GEN_6',
        mode: 'SINGLES',
        view: 'EDIT',
      }),
    )
  })

  it('sets boardOpen = true after submit (board opens)', async () => {
    const store = useBattleStore()
    const wrapper = mount(CreateBattleScreen)

    await wrapper.find('input#battle-name').setValue('Another Battle')
    await wrapper.find('select#battle-generation').setValue('GEN_5')
    await wrapper.find('form').trigger('submit')
    await nextTick()

    expect(store.boardOpen).toBe(true)
  })

  it('does NOT call createBattle when name is empty', async () => {
    const store = useBattleStore()
    const spy = vi.spyOn(store, 'createBattle')
    const wrapper = mount(CreateBattleScreen)

    // Select generation but no name
    await wrapper.find('select#battle-generation').setValue('GEN_6')
    await wrapper.find('form').trigger('submit')
    await nextTick()

    expect(spy).not.toHaveBeenCalled()
  })

  it('does NOT call createBattle when generation is not selected', async () => {
    const store = useBattleStore()
    const spy = vi.spyOn(store, 'createBattle')
    const wrapper = mount(CreateBattleScreen)

    await wrapper.find('input#battle-name').setValue('Battle')
    // generation left empty
    await wrapper.find('form').trigger('submit')
    await nextTick()

    expect(spy).not.toHaveBeenCalled()
  })

  it('passes DOUBLES mode when selected', async () => {
    const store = useBattleStore()
    const spy = vi.spyOn(store, 'createBattle')
    const wrapper = mount(CreateBattleScreen)

    await wrapper.find('input#battle-name').setValue('Doubles Battle')
    await wrapper.find('select#battle-generation').setValue('GEN_8')
    const doublesRadio = wrapper
      .findAll('input[type="radio"]')
      .find((r) => (r.element as HTMLInputElement).value === 'DOUBLES')
    await doublesRadio!.setValue(true)
    await wrapper.find('form').trigger('submit')
    await nextTick()

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ mode: 'DOUBLES' }))
  })
})

describe('BattleBoard — rendering', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  function createActiveBattle() {
    const store = useBattleStore()
    store.createBattle({ name: 'Test', generation: 'GEN_6', mode: 'SINGLES', view: 'EDIT' })
    return store
  }

  it('renders the board when a battle exists', () => {
    createActiveBattle()
    const wrapper = mount(BattleBoard)
    expect(wrapper.find('main.board').exists()).toBe(true)
  })

  it('shows the battle name and generation in the header', () => {
    createActiveBattle()
    const wrapper = mount(BattleBoard)
    expect(wrapper.text()).toContain('Test')
    expect(wrapper.text()).toContain('6') // generation number
  })
})
