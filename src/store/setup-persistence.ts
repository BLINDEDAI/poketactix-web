// Wire the battle store to localStorage via a Pinia subscription (AC-14).
// Any mutation to the battle re-persists the single current battle. Called once at boot, after hydrate.

import type { Store } from 'pinia'
import { saveBattle } from '@/store/persistence'
import type { useBattleStore } from '@/store/battle-store'

type BattleStore = ReturnType<typeof useBattleStore>

export function setupBattlePersistence(store: BattleStore): void {
  // `$subscribe` fires on every state mutation; persist the current battle when present.
  ;(store as unknown as Store).$subscribe(() => {
    if (store.battle !== null) saveBattle(store.battle)
  })
}
