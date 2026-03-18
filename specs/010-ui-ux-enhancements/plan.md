# Implementation Plan: UI/UX Enhancements Batch

**Branch**: `010-ui-ux-enhancements` | **Date**: 2026-03-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-ui-ux-enhancements/spec.md`

## Summary

14 independent UI/UX improvements across six app areas: connection form (show/hide password, SSL/SSH file-input descriptions), management connections table (`host:databaseName` column), command palette (Hugeicons icons, instance info item, What's New item), What's New panel (timeline layout, markdown style unification with agent), raw query view (space-density propagation to CodeMirror, footer button height consistency, Command+J shortcut, test coverage), and agent screen (thread renaming, bottom/right panel suppression).

Technical approach: targeted surgical edits to existing Vue 3 SFC components and composables. No new backend APIs, no new libraries (Hugeicons and `marked` are already integrated). Three areas require a new composable or a type extension (`usePasswordToggle`, `AgentHistorySession.title` rename hook, `useRawQueryKeyboardShortcuts`). All persistence uses existing `useStorage` patterns.

## Technical Context

**Language/Version**: TypeScript 5.x · Vue 3.5.13 · Nuxt 3.16.2  
**Primary Dependencies**: CodeMirror 6 (`@codemirror/view`, `@codemirror/state`), VueUse (useStorage, useKeyModifier), Hugeicons (already integrated via `nuxt-icon`/`@iconify`), `marked` (markdown rendering), Tailwind CSS v4, shadcn-vue component library (`components/ui/`), Pinia (stores)  
**Storage**: localStorage via VueUse `useStorage` for agent thread history and app config (spaceDisplay). No server-side storage changes.  
**Testing**: Vitest 4.x (unit/integration), Playwright 1.58 (e2e)  
**Target Platform**: Nuxt SSR/SPA (primary browser target), Electron desktop wrapper  
**Project Type**: Full-stack web application (Nuxt)  
**Performance Goals**: No regressions to existing render performance; keyboard shortcut handler must debounce/guard against double-fire  
**Constraints**: No new third-party libraries; all icon changes must use the existing Hugeicons icon set; password toggle must never log or expose the password value client-side  
**Scale/Scope**: 14 discrete changes — all frontend-only, all within existing module boundaries

## Constitution Check

_GATE: Must pass before Phase 0 research. Constitution is populated with placeholder template — no ratified rules to gate against. Proceeding without violations._

| Check                                                 | Status  | Notes                                                                        |
| ----------------------------------------------------- | ------- | ---------------------------------------------------------------------------- |
| No new external libraries introduced                  | ✅ PASS | All dependencies already in package.json                                     |
| Changes stay within existing module boundaries        | ✅ PASS | Each change edits files in their correct layer per module-architecture rules |
| No direct service calls from containers or components | ✅ PASS | All new state logic goes into hooks                                          |
| Password toggle does not expose secrets               | ✅ PASS | Toggle is pure input `type` attribute switch; no logging                     |

## Project Structure

### Documentation (this feature)

```text
specs/010-ui-ux-enhancements/
├── plan.md              ← This file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
└── tasks.md             ← Phase 2 output (speckit.tasks)
```

### Source Code – Affected Files

```text
# Connection Form
components/modules/connection/
├── components/
│   ├── CreateConnectionModal.vue        ← Add show/hide toggle to password field
│   ├── ConnectionSSLConfig.vue          ← Add per-field description hints
│   └── ConnectionSSHTunnel.vue          ← Add per-field description hints + show/hide SSH password

# Management Connections
components/modules/connection/
└── components/
    └── ConnectionsList.vue              ← Update Connection Details cell to host:databaseName format

# Command Palette
components/modules/command-palette/
├── hooks/providers/
│   ├── useSystemCommands.ts             ← Add instance info + What's New commands; update icons
│   └── [existing session provider]     ← Convert icons to Hugeicons

# What's New (Changelog)
components/modules/changelog/
└── ChangelogPopup.vue                   ← Timeline layout + reuse BlockMessageMarkdown styles

# Raw Query View
components/modules/raw-query/
├── RawQuery.vue                         ← Wire Command+J shortcut; pass spaceDisplay to editor
├── components/
│   ├── RawQueryEditorFooter.vue         ← Fix button height alignment
│   └── RawQueryLayout.vue              ← Panel toggle keyboard shortcut integration
├── hooks/
│   └── useRawQueryKeyboardShortcuts.ts  ← NEW: keyboard shortcut composable

# Agent Screen
pages/[workspaceId]/[connectionId]/agent/[tabViewId].vue  ← Add definePageMeta notAllowBottomPanel/notAllowRightPanel
components/modules/agent/
├── types/index.ts                       ← Add optional customTitle field to AgentHistorySession
├── hooks/
│   └── useDbAgentWorkspace.ts           ← Add renameThread action
└── [AgentThreadList component]          ← Inline rename UI (new or extended component)

# Tests
test/nuxt/components/modules/raw-query/  ← NEW: raw query view test scenarios (6 cases)
```

**Structure Decision**: Flat module structure. No sub-module promotion needed. All changes are leaf-level edits within existing modules. The only new file is `useRawQueryKeyboardShortcuts.ts` in `raw-query/hooks/` and the raw-query test file.

## Complexity Tracking

_No constitution violations — section not required._
