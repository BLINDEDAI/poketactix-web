// Pure reveal-slot transition rules. I/O-free and unit-testable.
//
// Slot lifecycle by side:
//  - own side: ability/move/item/nature all start SET (operator knows their own team).
//  - opponent side: ability + each move start HIDDEN (face-down card → flip on reveal).
//  - opponent side: item + nature start UNKNOWN (no card flip; filled when discovered).

import type { Ability, Item, Move, Nature, RevealSlot, SideKey, SlotState } from '@/types/battle'

/** A fresh slot in a given state with no value yet. */
function emptySlot<T>(state: SlotState): RevealSlot<T> {
  return { state, value: null }
}

/** A slot holding a known value (always SET). */
export function setSlot<T>(value: T): RevealSlot<T> {
  return { state: 'SET', value }
}

export function initialAbilitySlot(side: SideKey): RevealSlot<Ability> {
  return side === 'own' ? emptySlot<Ability>('SET') : emptySlot<Ability>('HIDDEN')
}

export function initialMoveSlot(side: SideKey): RevealSlot<Move> {
  return side === 'own' ? emptySlot<Move>('SET') : emptySlot<Move>('HIDDEN')
}

export function initialItemSlot(side: SideKey): RevealSlot<Item> {
  return side === 'own' ? emptySlot<Item>('SET') : emptySlot<Item>('UNKNOWN')
}

export function initialNatureSlot(side: SideKey): RevealSlot<Nature> {
  return side === 'own' ? emptySlot<Nature>('SET') : emptySlot<Nature>('UNKNOWN')
}

/** A slot is revealed (no longer face-down / undiscovered) when it holds a value in the SET state. */
export function isRevealed<T>(slot: RevealSlot<T>): boolean {
  return slot.state === 'SET' && slot.value !== null
}

/** True while an opponent ability/move slot is still face-down (drives the flip transition). */
export function isFaceDown<T>(slot: RevealSlot<T>): boolean {
  return slot.state === 'HIDDEN'
}

/**
 * Reveal an opponent slot: any HIDDEN/UNKNOWN/SET slot transitions to SET holding the chosen value.
 * Randomizer reveal is unconstrained — the caller may pass ANY existing ability/move/item/nature.
 */
export function reveal<T>(_slot: RevealSlot<T>, value: T): RevealSlot<T> {
  return setSlot(value)
}
