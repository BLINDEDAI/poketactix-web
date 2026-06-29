// Unit tests: reveal-slot.ts — initial slot factories + reveal/isRevealed/isFaceDown/setSlot
// Covers AC-5 (own=SET, opp ability/move=HIDDEN, opp item/nature=UNKNOWN), AC-7/8/9 transitions.

import { describe, it, expect } from 'vitest'
import {
  initialAbilitySlot,
  initialMoveSlot,
  initialItemSlot,
  initialNatureSlot,
  setSlot,
  reveal,
  isRevealed,
  isFaceDown,
} from '@/domain/reveal-slot'
import type { Ability, Move, Item, Nature } from '@/types/battle'

const MOCK_ABILITY: Ability = {
  id: 1,
  name: 'overgrow',
  displayName: 'Espesura',
  effect: 'Powers up Grass-type moves.',
}
const MOCK_MOVE: Move = {
  id: 1,
  name: 'tackle',
  displayName: 'Placaje',
  type: 'normal',
  category: 'PHYSICAL',
  power: 50,
  accuracy: 100,
  pp: 35,
  effect: 'Charges at the target.',
}
const MOCK_ITEM: Item = { name: 'Oran Berry' }
const MOCK_NATURE: Nature = { name: 'Timid' }

describe('initialAbilitySlot', () => {
  it('own side starts SET', () => {
    const slot = initialAbilitySlot('own')
    expect(slot.state).toBe('SET')
    expect(slot.value).toBeNull()
  })

  it('opponent side starts HIDDEN', () => {
    const slot = initialAbilitySlot('opponent')
    expect(slot.state).toBe('HIDDEN')
    expect(slot.value).toBeNull()
  })
})

describe('initialMoveSlot', () => {
  it('own side starts SET', () => {
    const slot = initialMoveSlot('own')
    expect(slot.state).toBe('SET')
  })

  it('opponent side starts HIDDEN', () => {
    const slot = initialMoveSlot('opponent')
    expect(slot.state).toBe('HIDDEN')
  })
})

describe('initialItemSlot', () => {
  it('own side starts SET', () => {
    const slot = initialItemSlot('own')
    expect(slot.state).toBe('SET')
  })

  it('opponent side starts UNKNOWN', () => {
    const slot = initialItemSlot('opponent')
    expect(slot.state).toBe('UNKNOWN')
  })
})

describe('initialNatureSlot', () => {
  it('own side starts SET', () => {
    const slot = initialNatureSlot('own')
    expect(slot.state).toBe('SET')
  })

  it('opponent side starts UNKNOWN', () => {
    const slot = initialNatureSlot('opponent')
    expect(slot.state).toBe('UNKNOWN')
  })
})

describe('setSlot', () => {
  it('creates a SET slot with the given value', () => {
    const slot = setSlot(MOCK_ABILITY)
    expect(slot.state).toBe('SET')
    expect(slot.value).toBe(MOCK_ABILITY)
  })
})

describe('reveal', () => {
  it('transitions a HIDDEN slot to SET holding the value', () => {
    const hidden = initialAbilitySlot('opponent') // HIDDEN
    const revealed = reveal(hidden, MOCK_ABILITY)
    expect(revealed.state).toBe('SET')
    expect(revealed.value).toBe(MOCK_ABILITY)
  })

  it('transitions an UNKNOWN slot to SET', () => {
    const unknown = initialItemSlot('opponent') // UNKNOWN
    const revealed = reveal(unknown, MOCK_ITEM)
    expect(revealed.state).toBe('SET')
    expect(revealed.value).toBe(MOCK_ITEM)
  })

  it('transitions a SET slot to SET with the new value', () => {
    const set = setSlot(MOCK_MOVE)
    const updated = reveal(set, { ...MOCK_MOVE, name: 'flamethrower' })
    expect(updated.state).toBe('SET')
    expect(updated.value?.name).toBe('flamethrower')
  })

  it('does not mutate the original slot', () => {
    const original = initialAbilitySlot('opponent')
    reveal(original, MOCK_ABILITY)
    expect(original.state).toBe('HIDDEN') // unchanged
  })
})

describe('isRevealed', () => {
  it('returns false for a HIDDEN slot with no value', () => {
    expect(isRevealed(initialAbilitySlot('opponent'))).toBe(false)
  })

  it('returns false for an UNKNOWN slot with no value', () => {
    expect(isRevealed(initialItemSlot('opponent'))).toBe(false)
  })

  it('returns false for a SET slot with null value', () => {
    expect(isRevealed(initialAbilitySlot('own'))).toBe(false)
  })

  it('returns true for a SET slot with a value', () => {
    expect(isRevealed(setSlot(MOCK_ABILITY))).toBe(true)
  })
})

describe('isFaceDown', () => {
  it('returns true only for HIDDEN state', () => {
    expect(isFaceDown(initialAbilitySlot('opponent'))).toBe(true)
    expect(isFaceDown(initialMoveSlot('opponent'))).toBe(true)
  })

  it('returns false for UNKNOWN state', () => {
    expect(isFaceDown(initialItemSlot('opponent'))).toBe(false)
    expect(isFaceDown(initialNatureSlot('opponent'))).toBe(false)
  })

  it('returns false for SET state', () => {
    expect(isFaceDown(setSlot(MOCK_NATURE))).toBe(false)
  })
})
