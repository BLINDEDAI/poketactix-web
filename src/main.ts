import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { useBattleStore } from '@/store/battle-store'
import { setupBattlePersistence } from '@/store/setup-persistence'

const app = createApp(App)

// Pinia first — stores depend on it (the one developer-approved runtime dependency, ADR-001).
app.use(createPinia())

// Restore the current battle from localStorage (AC-14), then wire the persistence subscription so
// every subsequent mutation re-saves. Order matters: hydrate before subscribing avoids a redundant
// write of the just-restored state.
const battleStore = useBattleStore()
battleStore.hydrate()
setupBattlePersistence(battleStore)

app.mount('#app')
