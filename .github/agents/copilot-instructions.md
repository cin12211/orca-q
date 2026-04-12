# OrcaQ Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-15

## Active Technologies

- TypeScript 5.x (Electron main process + Nuxt 3 / Vue 3 renderer) + Electron 30+, electron-updater 6.x, Vue 3 Composition API, Pinia, shadcn-vue component library, vue-sonner (toast) (014-enhance-electron-updater)
- electron-store (Electron main process) accessed from renderer via existing contextBridge IPC persist layer (`appConfig` collection) (014-enhance-electron-updater)

- TypeScript 5.x + Nuxt 3 (SPA), Vue 3 Composition API, Pinia, VeeValidate v4 + Zod, shadcn-vue, Tailwind CSS 4, localforage, Electron IPC (013-connection-env-tags)
- Dual-platform: localforage → IndexedDB (web) | Electron IPC → native store (desktop). New collection `environment-tags` added to both. (013-connection-env-tags)

- TypeScript 5.x · Vue 3.5.13 · Nuxt 3.16.2 + CodeMirror 6 (`@codemirror/view`, `@codemirror/state`), VueUse (useStorage, useKeyModifier), Hugeicons (already integrated via `nuxt-icon`/`@iconify`), `marked` (markdown rendering), Tailwind CSS v4, shadcn-vue component library (`components/ui/`), Pinia (stores) (010-ui-ux-enhancements)
- localStorage via VueUse `useStorage` for agent thread history and app config (spaceDisplay). No server-side storage changes. (010-ui-ux-enhancements)

- **Framework**: Nuxt 3 (SPA, `ssr: false`), Vue 3.5, TypeScript 5
- **Tables**: AG Grid v33 (`ag-grid-community`, `ag-grid-vue3`) with `themeBalham` and `withParams()` runtime theme API
- **State**: Pinia + `pinia-plugin-persistedstate` (`persist: true` on `appLayoutStore`)
- **Color mode**: `@nuxtjs/color-mode` → `useColorMode()` auto-imported
- **UI components**: shadcn-vue (Button, Slider, Dialog, Sidebar, Switch)
- **Utilities**: VueUse (`onClickOutside`, etc.)
- **Testing**: Vitest (unit), Vue Test Utils, Playwright (E2E)
- **Styling**: Tailwind CSS v4 with `@custom-variant dark (&:is(.dark *))`

## Project Structure

```text
core/stores/              ← Pinia stores (appLayoutStore, erdStore, etc.)
components/base/          ← Shared base components (DynamicTable, CodeEditor, etc.)
components/modules/       ← Feature modules (settings, quick-query, raw-query, etc.)
components/ui/            ← Generic UI primitives
pages/                    ← Nuxt file-based routing
test/unit/                ← Vitest unit tests
test/e2e/                 ← Playwright E2E tests
specs/                    ← Feature specs and implementation plans
```

## Commands

```bash
bun nuxt:dev       # Start development server
bun vitest run     # Run unit tests
bun nuxt:build     # Production build
```

## Code Style

- Module architecture: `.github/instructions/module-architecture.instructions.md`
- Composition API with `<script setup lang="ts">` in all Vue SFCs
- Pinia stores use setup-function style (`defineStore('id', () => { ... }, { persist: true })`)
- All theme updates via `useTableTheme()` composable — never import `baseTableTheme` directly in components
- AG Grid theme changes: `themeBalham.withPart(...).withParams(...)` — no grid destruction needed

## Recent Changes

- 014-enhance-electron-updater: Added TypeScript 5.x (Electron main process + Nuxt 3 / Vue 3 renderer) + Electron 30+, electron-updater 6.x, Vue 3 Composition API, Pinia, shadcn-vue component library, vue-sonner (toast)

- 013-connection-env-tags: Added TypeScript 5.x + Nuxt 3 (SPA), Vue 3 Composition API, Pinia, VeeValidate v4 + Zod, shadcn-vue, Tailwind CSS 4, localforage, Electron IPC

- 010-ui-ux-enhancements: Added TypeScript 5.x · Vue 3.5.13 · Nuxt 3.16.2 + CodeMirror 6 (`@codemirror/view`, `@codemirror/state`), VueUse (useStorage, useKeyModifier), Hugeicons (already integrated via `nuxt-icon`/`@iconify`), `marked` (markdown rendering), Tailwind CSS v4, shadcn-vue component library (`components/ui/`), Pinia (stores)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
