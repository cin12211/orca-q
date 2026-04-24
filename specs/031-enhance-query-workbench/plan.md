# Implementation Plan: Query Workbench Reliability

**Branch**: `031-enhance-query-workbench` | **Date**: 2026-04-23 | **Spec**: `/specs/031-enhance-query-workbench/spec.md`
**Input**: Feature specification from `/specs/031-enhance-query-workbench/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Stabilize the query workbench by aligning quick-query and raw-query SQL handling, moving short type aliasing into shared adapter-side rules across supported databases, and extending the existing workspace UI and app-config stores for change preview, long schema-load feedback, tab shortcuts, and persisted null-order preferences.

## Technical Context

**Language/Version**: TypeScript 5.6, Vue 3.5, Nuxt 3.16, Node 18+, Electron 41  
**Primary Dependencies**: Nuxt 3, Vue 3, Pinia, Electron, AG Grid, existing SQL/parser utilities (`dt-sql-parser`, `pgsql-ast-parser`), database drivers (`pg`, `mysql2`, `sqlite3`, `oracledb`)  
**Storage**: Persisted workspace, tab, and app-config state through Electron/IndexedDB APIs; metadata and execution sourced from existing PostgreSQL/MySQL/MariaDB/SQLite/Oracle adapters  
**Testing**: Vitest (`unit`, `nuxt`, `e2e` projects), existing Nuxt component tests, targeted server unit tests, optional Playwright regression if tab UX needs end-to-end confirmation  
**Target Platform**: Electron desktop app with Nuxt SPA web fallback  
**Project Type**: Single-repo desktop/web application with Nuxt UI, Pinia stores, and server routes/adapters  
**Performance Goals**: Show schema-load feedback within 5 seconds, complete accepted multi-schema loads within 60 seconds in test fixtures, keep tab-entry flows within 2 interactions, and preserve parity between raw-query and quick-query success for valid statements  
**Constraints**: Preserve current workspace persistence behavior, keep multi-database support aligned across adapters, avoid introducing a new backend progress API, and fix parser/update issues without rerouting unrelated query flows  
**Scale/Scope**: Changes span existing raw-query, quick-query, management/schemas, settings, and app-shell modules plus `core/stores`, `core/types`, and server metadata/query utilities

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- The constitution file is currently an uninitialized template with placeholder principles, so there are no enforceable project-specific gates to fail against.
- Temporary planning gates applied for this feature:
  - Reuse the existing Nuxt/Vue/Pinia/Electron architecture and module boundaries.
  - Limit scope to the currently supported database families and existing metadata/query adapters.
  - Validate touched slices with the existing Vitest project split instead of broad mixed-project runs.
- Phase 0 gate status: PASS
- Post-design gate status: PASS

## Project Structure

### Documentation (this feature)

```text
specs/031-enhance-query-workbench/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── null-order-preference.md
│   └── query-workbench-ui.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
components/modules/
├── app-shell/
├── management/
│   └── schemas/
├── quick-query/
├── raw-query/
└── settings/

core/
├── stores/
└── types/

server/
└── infrastructure/
    ├── agent/
    │   └── core/
    └── database/
        └── adapters/
            └── metadata/

test/
├── nuxt/
│   └── components/modules/
│       ├── management/
│       │   └── schemas/
│       ├── quick-query/
│       └── raw-query/
└── unit/
    └── server/
        └── infrastructure/
            └── agent/
```

**Structure Decision**: Use the existing single-application Nuxt/Electron structure. Implement UI and orchestration changes inside the current module folders, persist defaults through existing Pinia stores, and centralize type alias normalization inside the existing server metadata adapter layer rather than introducing new packages or services.

## Complexity Tracking

No constitution violations or exceptional complexity justifications are required for this plan.
