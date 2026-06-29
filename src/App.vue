<script setup lang="ts">
// App shell. Create-battle screen vs board switched by the reactive store flag `boardOpen` —
// no vue-router in v1 (ADR-001). EDIT⇄STREAMER is a further store flag handled inside the board.
import { useBattleStore } from '@/store/battle-store'
import CreateBattleScreen from '@/components/CreateBattleScreen.vue'
import BattleBoard from '@/components/BattleBoard.vue'

const store = useBattleStore()
</script>

<template>
  <BattleBoard v-if="store.boardOpen && store.battle" />
  <CreateBattleScreen v-else />
</template>

<style>
:root {
  color-scheme: dark;
}
* {
  box-sizing: border-box;
}
html,
body,
#app {
  margin: 0;
  min-height: 100vh;
  background: #0c0e16;
  color: #f4f6fb;
  font-family:
    system-ui,
    -apple-system,
    'Segoe UI',
    Roboto,
    sans-serif;
}
</style>
