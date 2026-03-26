# Implementation Plan: E2E Test Coverage — Workspace & Connection Full Flow

**Branch**: `001-e2e-workspace-connection` | **Date**: 2026-03-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-e2e-workspace-connection/spec.md`

## Summary

Add comprehensive Vitest test coverage for the `workspace` and `connection` frontend modules, covering hook logic, form validation, connection health-check API, and the end-to-end workspace→connection→open user journey. Tests run in the existing multiproject vitest setup (unit / nuxt / e2e) with Bun as the runtime.

## Technical Context

**Language/Version**: TypeScript 5.6, Vue 3.5  
**Primary Dependencies**: Vitest 4, @nuxt/test-utils 4, vee-validate 4, vueuse/core, Pinia 3, Zod 4  
**Storage**: N/A (tests mock Electron IPC stores — `window.workspaceApi`, `window.connectionApi`)  
**Testing**: Vitest multiproject — `unit` (node), `nuxt` (happy-dom), `e2e` (@nuxt/test-utils/e2e)  
**Target Platform**: Node.js / happy-dom (CI) + macOS dev  
**Project Type**: Test suite for an existing Nuxt 3 + Electron application  
**Performance Goals**: Full test suite completes in < 60s  
**Constraints**: No real database or Electron APIs in unit/nuxt tests. E2E API tests skip gracefully without `PG_CONNECTION`.  
**Scale/Scope**: ~40 test cases across 5 new test files

## Constitution Check

No new production code added — this is a purely additive test suite. No architectural violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-e2e-workspace-connection/
├── spec.md
├── plan.md              ← This file
├── tasks.md             ← Task breakdown
└── checklists/
    └── requirements.md
```

### Source Code (test files only)

```text
test/
├── unit/
│   └── components/
│       └── modules/
│           └── workspace/
│               └── schemas/
│                   └── workspace.schema.spec.ts    ← Zod schema validation (pure)
├── nuxt/
│   └── components/
│       └── modules/
│           ├── workspace/
│           │   └── hooks/
│           │       ├── useWorkspaces.test.ts        ← List/search/open logic
│           │       ├── useWorkspaceForm.test.ts     ← Create/update/validate
│           │       └── useWorkspaceCard.test.ts     ← Card actions (delete/connect)
│           └── connection/
│               └── hooks/
│                   └── useConnectionForm.test.ts   ← Step nav, test conn, reset
└── e2e/
    └── connection.test.ts                           ← Already exists; health-check API
```

## Mocking Strategy

| Concern                                        | Strategy                                                                                     |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `window.workspaceApi` / `window.connectionApi` | Mock via `vi.mock('~/core/contexts/useAppContext')` — stores are never instantiated directly |
| `useAppContext`                                | `vi.mock` returning a controlled reactive store object per test suite                        |
| `connectionService.healthCheck`                | `vi.mock('~/components/modules/connection/services/connection.service')`                     |
| `vue-sonner` toast                             | `vi.mock('vue-sonner')`                                                                      |
| `vee-validate` component context               | `withSetup` helper using `createApp` to provide component lifecycle context                  |
| Debounce (`refDebounced`)                      | `vi.useFakeTimers()` + `vi.advanceTimersByTime(300)`                                         |

## Complexity Tracking

No violations. Tests are additive and follow existing patterns.
