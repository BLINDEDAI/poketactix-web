// Unit tests: MoveChip — AC-8 effectiveness label/class mapping.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import type { Move } from '@/types/battle'
import MoveChip from '@/components/MoveChip.vue'

const BASE_MOVE: Move = {
  id: 1,
  name: 'tackle',
  displayName: 'Tackle',
  type: 'normal',
  category: 'PHYSICAL',
  power: 40,
  accuracy: 100,
  pp: 35,
  effect: 'Charges at the target.',
}

describe('MoveChip — AC-8 effectiveness label/class mapping', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('×2 → label "x2", class eff--super', () => {
    const wrapper = mount(MoveChip, { props: { move: BASE_MOVE, effectiveness: 2 } })
    const eff = wrapper.find('.eff')
    expect(eff.exists()).toBe(true)
    expect(eff.text()).toBe('x2')
    expect(eff.classes()).toContain('eff--super')
  })

  it('×4 → label "x4", class eff--super', () => {
    const wrapper = mount(MoveChip, { props: { move: BASE_MOVE, effectiveness: 4 } })
    const eff = wrapper.find('.eff')
    expect(eff.exists()).toBe(true)
    expect(eff.text()).toBe('x4')
    expect(eff.classes()).toContain('eff--super')
  })

  it('×0.5 → label "x0.5", class eff--weak', () => {
    const wrapper = mount(MoveChip, { props: { move: BASE_MOVE, effectiveness: 0.5 } })
    const eff = wrapper.find('.eff')
    expect(eff.exists()).toBe(true)
    expect(eff.text()).toBe('x0.5')
    expect(eff.classes()).toContain('eff--weak')
  })

  it('×0.25 → label "x0.25", class eff--weak', () => {
    const wrapper = mount(MoveChip, { props: { move: BASE_MOVE, effectiveness: 0.25 } })
    const eff = wrapper.find('.eff')
    expect(eff.exists()).toBe(true)
    expect(eff.text()).toBe('x0.25')
    expect(eff.classes()).toContain('eff--weak')
  })

  it('×0 → label "Inmune", class eff--immune', () => {
    const wrapper = mount(MoveChip, { props: { move: BASE_MOVE, effectiveness: 0 } })
    const eff = wrapper.find('.eff')
    expect(eff.exists()).toBe(true)
    expect(eff.text()).toBe('Inmune')
    expect(eff.classes()).toContain('eff--immune')
  })

  it('×1 → NO .eff element', () => {
    const wrapper = mount(MoveChip, { props: { move: BASE_MOVE, effectiveness: 1 } })
    expect(wrapper.find('.eff').exists()).toBe(false)
  })

  it('effectiveness=undefined (prop omitted) → NO .eff element', () => {
    const wrapper = mount(MoveChip, { props: { move: BASE_MOVE } })
    expect(wrapper.find('.eff').exists()).toBe(false)
  })

  it('effectiveness=null → NO .eff element', () => {
    const wrapper = mount(MoveChip, { props: { move: BASE_MOVE, effectiveness: null } })
    expect(wrapper.find('.eff').exists()).toBe(false)
  })
})
