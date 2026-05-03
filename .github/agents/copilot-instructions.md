# OrcaQ Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-15

## Active Technologies

- TypeScript 5.6, Vue 3.5, Nuxt 3.16, Node 18+, Electron 41 + Nuxt 3 SPA + Nitro server routes, Pinia, existing SQL stack (`knex`, `pg`, `mysql2`, `sqlite3`, `oracledb`), plus new runtime clients `@libsql/client` for Turso and `redis` for Redis; Cloudflare D1 uses server-side HTTP/fetch against the Cloudflare D1 query API (033-expand-db-support)
- Existing IndexedDB/Electron persistence for workspaces, connections, and tabs; SQL sessions through existing adapter/cache flow; managed SQLite provider state on saved connections; Redis session state through dedicated server clients and persisted UI filters (033-expand-db-support)

- TypeScript 5.6, Vue 3.5, Nuxt 3.16, Node 18+, Electron 41 + Nuxt 3, Vue 3, Pinia, Electron, AG Grid, existing SQL/parser utilities (`dt-sql-parser`, `pgsql-ast-parser`), database drivers (`pg`, `mysql2`, `sqlite3`, `oracledb`) (031-enhance-query-workbench)
- Persisted workspace, tab, and app-config state through Electron/IndexedDB APIs; metadata and execution sourced from existing PostgreSQL/MySQL/MariaDB/SQLite/Oracle adapters (031-enhance-query-workbench)

- TypeScript ~5.6, Node >=18, Vue 3.5, Nuxt 3.16, Electron 41 + Nuxt 3 SPA + Nitro server routes, Pinia 3, Knex 3.1, `pg`, `sqlite3`, `better-sqlite3`, plus new runtime drivers `mysql2` and `oracledb` (030-add-multi-db-support)
- IndexedDB via `localforage` for browser persistence, Electron SQLite (`better-sqlite3`) for app persistence, external DB sessions via Knex driver adapters, local filesystem path access for desktop SQLite files (030-add-multi-db-support)

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
- Icon library: Hugeicons via `nuxt-icon`/`@iconify` (already integrated) (prefer use hugeicons icons set)

## Recent Changes

- 033-expand-db-support: Added TypeScript 5.6, Vue 3.5, Nuxt 3.16, Node 18+, Electron 41 + Nuxt 3 SPA + Nitro server routes, Pinia, existing SQL stack (`knex`, `pg`, `mysql2`, `sqlite3`, `oracledb`), plus new runtime clients `@libsql/client` for Turso and `redis` for Redis; Cloudflare D1 uses server-side HTTP/fetch against the Cloudflare D1 query API

- 031-enhance-query-workbench: Added TypeScript 5.6, Vue 3.5, Nuxt 3.16, Node 18+, Electron 41 + Nuxt 3, Vue 3, Pinia, Electron, AG Grid, existing SQL/parser utilities (`dt-sql-parser`, `pgsql-ast-parser`), database drivers (`pg`, `mysql2`, `sqlite3`, `oracledb`)

- 030-add-multi-db-support: Added TypeScript ~5.6, Node >=18, Vue 3.5, Nuxt 3.16, Electron 41 + Nuxt 3 SPA + Nitro server routes, Pinia 3, Knex 3.1, `pg`, `sqlite3`, `better-sqlite3`, plus new runtime drivers `mysql2` and `oracledb`

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
