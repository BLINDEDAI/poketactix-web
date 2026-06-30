<script setup lang="ts">
// App shell. Create-battle screen vs board switched by the reactive store flag `boardOpen` —
// no vue-router in v1 (ADR-001).
import { useBattleStore } from '@/store/battle-store'
import CreateBattleScreen from '@/components/CreateBattleScreen.vue'
import BattleBoard from '@/components/BattleBoard.vue'

const store = useBattleStore()

const DONATE_URL = 'https://ko-fi.com/blindedai'
</script>

<template>
  <BattleBoard v-if="store.boardOpen && store.battle" />
  <CreateBattleScreen v-else />

  <footer class="app-footer">
    <a class="app-footer__donate" :href="DONATE_URL" target="_blank" rel="noopener noreferrer">
      ☕ Invítame a un café
    </a>
    <a class="app-footer__contact" href="mailto:contacto@poketactix.com">
      ✉ contacto@poketactix.com
    </a>
    <p class="app-footer__legal">
      No afiliado a Nintendo / The Pokémon Company. Pokémon y los nombres relacionados son marcas de
      sus respectivos propietarios.
    </p>
  </footer>
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
  background: radial-gradient(circle at 50% -10%, #18203a, #0a0c14 60%);
  background-attachment: fixed;
  color: #f4f6fb;
  font-family:
    system-ui,
    -apple-system,
    'Segoe UI',
    Roboto,
    sans-serif;
}
.app-footer {
  text-align: center;
  padding: 1.5rem 1rem 2rem;
  border-top: 1px solid #1b2230;
}
.app-footer__donate {
  display: inline-block;
  margin-bottom: 0.6rem;
  padding: 0.45rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid #f4c430;
  color: #f4c430;
  font-weight: 700;
  font-size: 0.85rem;
  text-decoration: none;
}
.app-footer__donate:hover {
  background: rgba(244, 196, 48, 0.12);
}
.app-footer__contact {
  display: block;
  margin-bottom: 0.8rem;
  color: #9aa1b2;
  font-size: 0.8rem;
  text-decoration: none;
}
.app-footer__contact:hover {
  color: #f4c430;
  text-decoration: underline;
}
.app-footer__legal {
  max-width: 38rem;
  margin: 0 auto;
  color: #6b7382;
  font-size: 0.72rem;
  line-height: 1.5;
}
</style>
