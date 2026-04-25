# Implementation Plan: Expanded Database Type Support

**Branch**: `030-add-multi-db-support` | **Date**: 2026-04-22 | **Spec**: [spec.md](./spec.md)  
**Research**: [research.md](./research.md) | **Data Model**: [data-model.md](./data-model.md) | **Contracts**: [contracts/connection-runtime-contract.md](./contracts/connection-runtime-contract.md), [contracts/sqlite-file-picker-contract.md](./contracts/sqlite-file-picker-contract.md) | **Quickstart**: [quickstart.md](./quickstart.md)

## Summary

Add real product support for MySQL, MariaDB, Oracle, and desktop-only SQLite file connections by expanding the connection model, parser, and connection picker; implementing missing low-level Knex-backed adapters and dependencies; adding a desktop file-picker bridge for SQLite; and wiring database type through health-check, raw-query, and basic structure-browsing paths. The rollout remains capability-based: connection creation, reopening, raw query, and minimum metadata browsing must work for the new types, while deeper secondary features continue to return explicit unsupported states until dedicated adapters exist.

## Technical Context

**Language/Version**: TypeScript ~5.6, Node >=18, Vue 3.5, Nuxt 3.16, Electron 41  
**Primary Dependencies**: Nuxt 3 SPA + Nitro server routes, Pinia 3, Knex 3.1, `pg`, `sqlite3`, `better-sqlite3`, plus new runtime drivers `mysql2` and `oracledb`  
**Storage**: IndexedDB via `localforage` for browser persistence, Electron SQLite (`better-sqlite3`) for app persistence, external DB sessions via Knex driver adapters, local filesystem path access for desktop SQLite files  
**Testing**: Vitest 4 (`unit`, `nuxt`, `e2e`) plus Playwright for user flows  
**Target Platform**: Web browser + Electron desktop (macOS/Windows/Linux); SQLite file connections are Electron-only  
**Project Type**: Hybrid SPA + desktop database editor with Nitro BFF/server adapters  
**Performance Goals**: Keep connection test/save flows interactive within the existing modal UX, preserve adapter-cache reuse for repeat connections, and avoid regressions in raw-query streaming for supported drivers  
**Constraints**: Existing Postgres saved connections must remain backward-compatible; SQLite file access must never appear usable in non-Electron runtimes; runtime-specific code must stay behind Electron/server boundaries; unsupported secondary features must fail explicitly instead of silently falling back to Postgres  
**Scale/Scope**: 4 user-selectable non-Postgres database options (MySQL, MariaDB, Oracle, SQLite desktop), 1 connection model expansion, 1 new Electron IPC contract, 3 low-level driver adapters, and targeted updates across connection UI, health-check, raw-query, metadata/tables adapters, persistence, and tests

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

The project constitution file is still a placeholder template, so there are no enforceable project-specific gates to apply yet.

**Standard gates (applied anyway):**

- [x] Connection UI changes stay inside the connection module; storage/model changes stay in `core/`; runtime-specific file access stays in `electron/` and server adapters
- [x] No Electron-only API leaks into web runtime code paths
- [x] Existing saved Postgres connections remain readable without migration loss
- [x] Unsupported secondary database features continue to return explicit disabled/501 states instead of silent fallback
- [x] Browser-safe and Electron-safe boundaries stay intact: no direct filesystem access from renderer code outside the preload bridge

**Post-design re-check:**

- [x] Data model keeps backward compatibility while adding only the fields needed for SQLite file and Oracle structured inputs
- [x] Contracts define explicit runtime behavior for desktop SQLite file picking and connection validation
- [x] Design keeps the rollout capability-based instead of implying full parity across roles, metrics, import/export, and other Postgres-only features

## Project Structure

### Documentation (this feature)

```text
specs/030-add-multi-db-support/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── connection-runtime-contract.md
│   └── sqlite-file-picker-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
components/modules/connection/
├── components/
│   ├── ConnectionStepType.vue
│   ├── ConnectionsList.vue
│   ├── CreateConnectionModal.vue
│   └── DatabaseTypeCard.vue
├── constants/index.ts
├── hooks/useConnectionForm.ts
├── services/connection.service.ts
└── types/

core/
├── constants/database-client-type.ts
├── helpers/parser-connection-string.ts
├── storage/entities/ConnectionStorage.ts
├── stores/managementConnectionStore.ts
└── types/entities/connection.entity.ts

electron/
├── ipc/window.ts
├── preload.ts
├── types/
└── persist/
    ├── entities/ConnectionSQLiteStorage.ts
    └── schema/connections.ts

server/
├── api/managment-connection/health-check.ts
├── api/query/
│   ├── execute.post.ts
│   ├── raw-execute.post.ts
│   └── raw-execute-stream.post.ts
├── infrastructure/driver/
│   ├── db-connection.ts
│   ├── factory.ts
│   ├── mysql.adapter.ts
│   ├── oracle.adapter.ts           # new
│   └── sqlite.adapter.ts           # new
└── infrastructure/database/adapters/
    ├── metadata/
    ├── query/
    ├── shared/
    └── tables/

test/
├── e2e/connection.test.ts
├── nuxt/components/modules/connection/hooks/useConnectionForm.test.ts
└── playwright/
    ├── connection.spec.ts
    └── pages/ConnectionModalPage.ts
```

**Structure Decision**: Single Nuxt/Electron application. This feature reuses the existing layered split: user-facing flow in `components/modules/connection/`, shared persisted model in `core/`, desktop-only filesystem bridge in `electron/`, and database connectivity plus query/meta adapters in `server/`.

## Complexity Tracking

> No constitution violations to justify. The design extends existing layers instead of introducing new top-level subsystems.
