import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import App from './App.vue'

describe('App (scaffold smoke test)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('mounts and renders the app name', () => {
    const wrapper = mount(App)
    expect(wrapper.text()).toContain('PokeTactix')
  })
})
