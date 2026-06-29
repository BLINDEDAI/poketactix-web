# PokeTactix — `web`

A **client-only Vue 3 + Vite + TypeScript single-page app**: a generation-aware Pokémon
**battle board** for following live randomizer battles. The operator sets up a battle (name,
generation Gen 3–9, singles/doubles, edit/streamer view), configures both teams, and progressively
reveals the opponent's randomized ability, moves, item and nature — with all data and weaknesses
correct for the chosen generation.

There is **no backend**: all state lives in the browser and is mirrored to `localStorage`. The only
network surface is outbound HTTPS to [PokéAPI](https://pokeapi.co) (REST + GraphQL beta), isolated
behind a data-access seam.

> Status: **scaffold only.** This repository currently contains the runnable, gate-passing skeleton
> (Phase 1, DevOps). The battle-board feature itself is implemented in Phase 2 by the Frontend
> Developer. See `poketactix-docs/specs/Battle/battle-board-specs.md`.

## Stack

| Layer           | Technology                                            |
| --------------- | ----------------------------------------------------- |
| Language        | TypeScript 5.x (`strict: true`)                       |
| Framework       | Vue 3.4 — Composition API, `<script setup>`           |
| Build           | Vite 5                                                |
| State           | Pinia (the one approved runtime dependency — ADR-001) |
| Tests           | Vitest + `@vue/test-utils` + jsdom                    |
| Package manager | npm 10+ (Node 20 LTS floor)                           |

No Docker — the app runs via the Vite dev server and ships as a static build.

## Project layout

```
web/
├── index.html            ← app shell + baseline Content-Security-Policy
├── src/
│   ├── data/             ← PokeApiClient (REST + GraphQL), cache, generation resolver, Spanish index
│   ├── domain/           ← pure I/O-free logic: type chart, weakness/resistance, reveal-slot rules
│   ├── store/            ← Pinia battle store + localStorage persistence
│   ├── components/       ← presentational Vue components
│   ├── composables/      ← reusable composition functions
│   ├── types/            ← shared TypeScript types
│   ├── App.vue           ← root component (placeholder until Phase 2)
│   └── main.ts           ← app entry (registers Pinia)
├── Makefile              ← task runner (up / build / test / quality)
├── vite.config.ts        ← Vite + Vitest config
└── tsconfig*.json        ← TypeScript project references (strict)
```

## How to run

```sh
npm install        # or: make install   (npm ci, from the committed lockfile)
npm run dev        # or: make up        → Vite dev server (http://localhost:5173)
```

Production static build:

```sh
npm run build      # or: make build     → vue-tsc type-check + vite build → dist/
npm run preview    # or: make preview   → serve the built bundle locally
```

## How to test

```sh
npm run test       # or: make test      → Vitest (run mode, single pass)
```

## Quality gates

The same gates CI enforces and that every change must pass (`project-standards.md` § Quality gates):

```sh
make quality       # runs all of the below in order
```

| Gate             | Command                                                |
| ---------------- | ------------------------------------------------------ |
| Format           | `npm run format:check` (Prettier, zero diffs)          |
| Lint             | `npm run lint` (ESLint, zero errors)                   |
| Type check       | `npm run type-check` (`vue-tsc --noEmit`, zero errors) |
| Tests            | `npm run test` (Vitest, all pass)                      |
| Dependency audit | `npm audit` (no known criticals)                       |

## Security notes

- **No secrets.** PokéAPI is keyless; `.gitignore` blocks `.env*` from the first commit (SC-001).
- **CSP.** `index.html` ships a baseline Content-Security-Policy (`default-src 'self'`;
  `connect-src` limited to the PokéAPI hosts; `img-src` limited to the sprite host
  `raw.githubusercontent.com`; no inline/eval script). When served behind a host/CDN, mirror it as a
  response header.
- **XSS.** All PokéAPI-sourced text is rendered via text interpolation — never `v-html`.
