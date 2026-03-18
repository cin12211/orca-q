# Tasks: UI/UX Enhancements Batch

**Input**: Design documents from `/specs/010-ui-ux-enhancements/`
**Feature Branch**: `010-ui-ux-enhancements` | **Date**: 2026-03-17
**Prerequisites**: plan.md ✅ · spec.md ✅ · research.md ✅ · data-model.md ✅ · quickstart.md ✅
**Tests**: US14 (Raw Query Automated Tests) is the only story requiring test tasks — included in Phase 16.
**Organization**: 14 user stories, all frontend-only, all within existing module boundaries. Stories are fully independent — no cross-story blocking dependencies.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2…)
- Exact file paths are included in every task description

---

## Phase 1: Setup

**Purpose**: Branch verification and dev environment readiness

- [x] T001 Verify feature branch `010-ui-ux-enhancements` is checked out and dev server starts cleanly (`bun dev`)

---

## Phase 2: Foundational — Data Model & Shared Helper

**Purpose**: The only cross-story dependency — `AgentHistorySession.customTitle` extension and the `getSpaceDisplayEditorFontSize` helper. Must complete before US6 (thread rename) and US3 (density). All other stories are independent and can start immediately after Phase 1.

**⚠️ CRITICAL**: US6 (Thread Renaming) depends on T003. US3 (Space Density) depends on T004.

- [x] T002 [P] Add optional `customTitle?: string` field to `AgentHistorySession` interface in `components/modules/agent/types/index.ts` (non-breaking — existing sessions omit it gracefully)
- [x] T003 [P] Add `getSpaceDisplayEditorFontSize(value: SpaceDisplay | string): string` helper function to `core/composables/useSpaceDisplay.ts` — maps `Compact → '12px'`, `Default → '14px'`, `Spacious → '16px'`

**Checkpoint**: Foundational types and helpers available — all user story phases can now begin.

---

## Phase 3: User Story 1 — Connection Form: Show/Hide Password (Priority: P1) 🎯 MVP

**Goal**: Users can reveal/mask their password while typing in the connection form and SSH tunnel form.

**Independent Test**: Open connection form → focus password field → click eye icon → field switches between masked and revealed modes. Repeat for SSH tunnel password field.

### Implementation

- [x] T004 [US1] Add `showPassword = ref(false)` + eye-icon toggle button inside a `relative` wrapper `<div>` to the password `<Input>` in `components/modules/connection/components/CreateConnectionModal.vue` — use `hugeicons:eye` / `hugeicons:eye-off` icons, bind `:type="showPassword ? 'text' : 'password'"`
- [x] T005 [US1] Add `showSshPassword = ref(false)` + eye-icon toggle button to the SSH password `<Input>` in `components/modules/connection/components/ConnectionSSHTunnel.vue` — same pattern as T004, applied to `formData.sshPassword`

**Checkpoint**: Password show/hide works on both connection form and SSH tunnel form fields.

---

## Phase 4: User Story 2 — Connection Form: SSL/SSH File-Input Descriptions (Priority: P2)

**Goal**: Each SSL/SSH file-content textarea shows a descriptive hint explaining the expected file type or content.

**Independent Test**: Open the SSL config accordion → verify a short description appears below each textarea. Open SSH tunnel → verify the private key textarea shows a hint.

### Implementation

- [x] T006 [P] [US2] Add inline `<p class="text-xs text-muted-foreground">` hint text below each of the three `<Textarea>` elements in `components/modules/connection/components/ConnectionSSLConfig.vue` — CA cert: "Drop a .pem / .crt file here, or paste the CA certificate content"; Client cert: "Drop a .pem / .crt file here, or paste the client certificate content"; Key: "Drop a .pem / .key file here, or paste the private key content"
- [x] T007 [P] [US2] Add inline `<p class="text-xs text-muted-foreground">` hint text below the SSH private key `<Textarea>` in `components/modules/connection/components/ConnectionSSHTunnel.vue` — "Drop a .pem / .key file here, or paste the SSH private key content"

**Checkpoint**: All SSL and SSH file-input fields display descriptive hints visible without interaction.

---

## Phase 5: User Story 3 — Raw Query: Space Density Applies to Code Editor (Priority: P3)

**Goal**: The SQL code editor in the raw query view reflects the selected space density setting (compact/default/spacious) immediately, without a page reload.

**Independent Test**: Settings → Density → switch to Compact → raw query code editor font shrinks. Switch to Spacious → font enlarges. Changing while raw query is open updates immediately.

**Depends on**: T003 (foundational helper)

### Implementation

- [x] T008 [US3] Add a CodeMirror 6 `Compartment` for font size in `components/modules/raw-query/hooks/useSqlEditorExtensions.ts` (or `components/base/code-editor/BaseCodeEditor.vue`): import `Compartment` from `@codemirror/state`, import `EditorView` from `@codemirror/view`, import `getSpaceDisplayEditorFontSize` from `~/core/composables/useSpaceDisplay`, create `fontSizeCompartment = new Compartment()`, add initial `fontSizeExtension` using `fontSizeCompartment.of(EditorView.theme({ '.cm-content': { fontSize: ... } }))`, and `watch(() => appConfigStore.spaceDisplay, ...)` to dispatch a `reconfigure` effect when density changes

**Checkpoint**: CodeMirror editor font size updates reactively when space density setting changes.

---

## Phase 6: User Story 4 — Raw Query: Consistent Footer Button Heights (Priority: P3)

**Goal**: The "Explain" and "Execute Current" buttons in the raw query footer are the same height and visually aligned.

**Independent Test**: Open raw query view → inspect footer — all action buttons appear at equal height with no visible offset.

### Implementation

- [x] T009 [US4] Audit and standardize all action button `size` props in `components/modules/raw-query/components/RawQueryEditorFooter.vue`: set Format, Explain, and Execute Current buttons to `size="xs"`; set all dropdown chevron triggers to `size="iconSm"`; remove any inline `class` padding overrides that create height discrepancies

**Checkpoint**: Footer buttons are visually aligned at uniform height.

---

## Phase 7: User Story 5 — Raw Query: Command+J to Toggle Result Panel (Priority: P3)

**Goal**: Pressing Command+J (Mac) or Ctrl+J (other) while the raw query view is focused toggles the result panel between visible and hidden.

**Independent Test**: Open raw query view → focus the code editor → press Cmd+J → result panel collapses → press again → panel opens. Tab away from raw query → Cmd+J does nothing.

### Implementation

- [x] T010 [US5] Create new composable `components/modules/raw-query/hooks/useRawQueryKeyboardShortcuts.ts` — accepts `{ containerRef: Ref<HTMLElement | null>; onToggleResultPanel: () => void }`, uses `useEventListener(document, 'keydown', ...)` from VueUse to listen for `(event.metaKey || event.ctrlKey) && (event.key === 'j' || event.key === 'J')`, guards that `containerRef.value.contains(document.activeElement)` before firing, calls `event.preventDefault()` and `onToggleResultPanel()`
- [x] T011 [US5] In `components/modules/raw-query/RawQuery.vue`: add `showResultPanel = ref(true)`, add a `containerRef = ref<HTMLElement | null>(null)` bound to the root element, call `useRawQueryKeyboardShortcuts({ containerRef, onToggleResultPanel: () => { showResultPanel.value = !showResultPanel.value } })`, and pass `showResultPanel` as a prop to `RawQueryLayout.vue`
- [x] T012 [US5] In `components/modules/raw-query/components/RawQueryLayout.vue`: accept `showResultPanel: boolean` prop and use `v-show="showResultPanel"` (or equivalent height-toggle) on the result panel section

**Checkpoint**: Cmd+J / Ctrl+J toggles the result panel. Guard prevents firing outside raw query context.

---

## Phase 8: User Story 6 — Agent: Thread Renaming (Priority: P4)

**Goal**: Users can rename any conversation thread via double-click inline input; the custom name persists across navigation and app restarts.

**Independent Test**: Double-click a thread name in the agent sidebar → input appears pre-filled → type new name → press Enter → sidebar shows the new name → navigate away and back → name still shows.

**Depends on**: T002 (AgentHistorySession.customTitle field in types)

### Implementation

- [x] T013 [US6] Add `renameThread(id: string, newTitle: string): void` function to `components/modules/agent/hooks/useDbAgentWorkspace.ts` — finds session by id in `histories.value`, trims the new title, returns early if empty, sets `histories.value[idx] = { ...histories.value[idx], customTitle: trimmed }` (persisted automatically via `useStorage`); also add `getDisplayTitle(session: AgentHistorySession): string` helper returning `session.customTitle?.trim() || session.title`
- [x] T014 [US6] In the thread list item component (`AgentWorkspace.vue` or the dedicated thread list sidebar component): add local `isRenaming = ref(false)`, `renameValue = ref('')`, `renameInputRef`; on `@dblclick` of the title element, set `isRenaming = true` and `renameValue` to `getDisplayTitle(session)`; render `<div v-if="!isRenaming" @dblclick="startRename">{{ getDisplayTitle(history) }}</div>` and `<Input v-else ref="renameInputRef" v-model="renameValue" class="h-6 text-xs" @keydown.enter="confirmRename" @keydown.escape="cancelRename" @blur="confirmRename" />`; `confirmRename` calls `renameThread(session.id, renameValue.value)` if non-empty then sets `isRenaming = false`; `cancelRename` resets `isRenaming = false`
- [x] T015 [US6] Update all remaining places that display the thread title (e.g., `ManagementAgentHistoryTree.vue`, page `<title>` or breadcrumb if applicable) to use `getDisplayTitle(session)` instead of `session.title` directly

**Checkpoint**: Renaming a thread works inline, persists to localStorage, survives navigation. Empty-name save is rejected.

---

## Phase 9: User Story 7 — Agent: Disable Panel Toggles on Agent Screen (Priority: P4)

**Goal**: The bottom panel and right panel toggles are hidden when the user is on the agent screen.

**Independent Test**: Navigate to an agent tab → bottom and right panel toggle buttons are not visible. Navigate to another view → panel toggles are visible again.

### Implementation

- [x] T016 [US7] In `pages/[workspaceId]/[connectionId]/agent/[tabViewId].vue`, add `notAllowBottomPanel: true` and `notAllowRightPanel: true` to the existing `definePageMeta({ keepalive: { max: DEFAULT_MAX_KEEP_ALIVE } })` call

**Checkpoint**: Panel toggles are suppressed on the agent screen and restored on all other views.

---

## Phase 10: User Story 8 — Command Palette: Hugeicons for Session Commands (Priority: P5)

**Goal**: All session-related command entries in the command palette use Hugeicons icons (`hugeicons:*`) instead of any mixed `lucide:*` icons.

**Independent Test**: Open command palette → browse session-related commands → every entry displays a crisp Hugeicons icon.

### Implementation

- [x] T017 [US8] In `components/modules/command-palette/hooks/providers/useSystemCommands.ts`: audit all command item definitions and replace any `lucide:*` icon strings used on session-related commands with equivalent `hugeicons:*` icon strings (e.g., `lucide:terminal` → `hugeicons:terminal-browser`, `lucide:refresh-cw` → `hugeicons:refresh`, etc.)
- [x] T018 [P] [US8] Audit `components/modules/command-palette/hooks/providers/useTabCommands.ts` and any other provider files in that directory for remaining `lucide:*` icon references on session commands; replace with `hugeicons:*` equivalents

**Checkpoint**: No `lucide:*` icons appear on session-related command palette entries.

---

## Phase 11: User Story 9 — Command Palette: Instance Info Item (Priority: P5)

**Goal**: The command palette includes an "Instance Info" entry that opens the instance detail view when selected.

**Independent Test**: Open command palette → search "instance" → entry with `hugeicons:database-02` icon appears → select it → instance detail view opens. With no active connection → selecting it shows a clear "no active connection" message.

### Implementation

- [x] T019 [US9] In `components/modules/command-palette/hooks/providers/useSystemCommands.ts`, add a new command entry `{ id: 'cmd-show-instance-info', label: 'Show Instance Info', icon: 'hugeicons:database-02', group: 'Commands', action: () => { /* open instance detail view or show no-connection message */ } }` — wire the action to the appropriate store/composable that opens the instance info panel (inspect existing commands for the pattern used to open panels)

**Checkpoint**: Instance info entry appears in command palette; selecting it opens the instance detail view.

---

## Phase 12: User Story 10 — Command Palette: What's New Item (Priority: P5)

**Goal**: The command palette includes a "What's New" entry that opens the What's New panel when selected.

**Independent Test**: Open command palette → type "what's new" → matching entry appears → select it → What's New panel opens.

### Implementation

- [x] T020 [US10] In `components/modules/command-palette/hooks/providers/useSystemCommands.ts`, add a new command entry `{ id: 'cmd-open-whats-new', label: "What's New", icon: 'hugeicons:stars', group: 'Commands', action: () => { /* open changelog/what's new panel */ } }` — wire the action using the existing `useChangelogModal` composable (or equivalent) to open the panel

**Checkpoint**: "What's New" entry appears in command palette; selecting it opens the What's New / changelog panel.

---

## Phase 13: User Story 11 — What's New: Timeline UI (Priority: P6)

**Goal**: Release entries in the What's New panel are displayed in a vertical timeline layout with dates visible and newest first.

**Independent Test**: Open What's New panel with multiple release entries → entries are visually arranged in a top-to-bottom timeline with a vertical connecting line and a circular node per entry; dates are clearly visible; newest entry is at the top.

### Implementation

- [x] T021 [US11] In `components/modules/changelog/ChangelogPopup.vue`, update the release-entry list markup to a `relative` container with timeline styling per entry: wrap each entry in `<div class="relative pl-8">`, add an `<div class="absolute left-0 top-3 w-4 h-4 rounded-full bg-primary/20 border-2 border-primary">` circular node, and add a `before:` pseudo-element line using Tailwind classes (`before:absolute before:left-2.5 before:top-0 before:bottom-0 before:w-px before:bg-border`) on the wrapper; verify entries are sorted newest-first (check `useChangelogModal` sort order)

**Checkpoint**: What's New panel renders a vertical timeline. Date is visible per entry. Newest is first.

---

## Phase 14: User Story 12 — What's New: Reuse Agent Markdown Rendering Style (Priority: P6)

**Goal**: The What's New panel renders markdown using the same component as the agent chat, achieving visual consistency.

**Independent Test**: Compare rendered markdown (headings, lists, code blocks, links) in the What's New panel and in the agent chat panel — they should be visually identical.

### Implementation

- [x] T022 [US12] In `components/modules/changelog/ChangelogPopup.vue`: import `BlockMessageMarkdown` from the agent module (via `components/modules/agent/index.ts` or its direct path if not yet exported publicly); replace the existing `<div v-html="marked.parse(content)" class="changelog-content">` with `<BlockMessageMarkdown :content="content" :isStreaming="false" />`; remove the `.changelog-content` scoped `<style>` block

**Checkpoint**: What's New markdown renders identically to agent chat markdown. Scoped custom styles removed.

---

## Phase 15: User Story 13 — Management Connections: host:databaseName Column (Priority: P7)

**Goal**: The "Connection Details" column in the management connections table displays `host:databaseName` (no port in the cell). Full `host:port/database` remains in the tooltip.

**Independent Test**: Management connections page → "Connection Details" column shows `localhost:mydb`. Hover over cell → tooltip shows full `localhost:5432/mydb`. Connection with no database → shows only `localhost`.

### Implementation

- [x] T023 [US13] In `components/modules/connection/components/ConnectionsList.vue`, update the Connection Details cell template (around line 130): change the display `<div>` from `{{ connection.host }}:{{ connection.port }}{{ connection.database ? '/' + connection.database : '' }}` to `{{ connection.host }}{{ connection.database ? ':' + connection.database : '' }}`; add `class="truncate"` to the display `<div>`; ensure the existing `<TooltipContent>` retains the full `host:port/database` format

**Checkpoint**: Connection Details cell shows `host:databaseName` format. Tooltip retains full detail.

---

## Phase 16: User Story 14 — Raw Query View: Automated Test Coverage (Priority: P8)

**Goal**: Six automated Vitest scenarios cover the primary raw query view behaviors so regressions from the other raw query changes (US3, US4, US5) are caught.

**Independent Test**: Run `bun vitest run test/nuxt/components/modules/raw-query/` — all six test cases pass.

### Implementation

- [x] T024 [US14] Create test file `test/nuxt/components/modules/raw-query/rawQuery.spec.ts` with the following six test cases:
  1. **Normal query**: given a valid SELECT query, when executed, the result grid is rendered with rows
  2. **Error query**: given an invalid query, when the server returns an error, the error message is displayed to the user
  3. **Empty/mutation result**: given a DML query (INSERT/UPDATE/DELETE) or empty SELECT, when execution completes, a success/info message is shown without a data grid
  4. **EXPLAIN query**: given an EXPLAIN query, when executed, the explain plan output is rendered
  5. **Named variable query**: given a query containing named parameters/variables, when executed, the variable prompt or substitution UI appears before execution proceeds
  6. **Inline variable query**: given a query with inline variable declarations, when executed, the query runs with inline values resolved

**Checkpoint**: `bun vitest run test/nuxt/components/modules/raw-query/rawQuery.spec.ts` — 6/6 passing.

---

## Phase 17: Polish & Cross-Cutting Concerns

**Purpose**: Final verification sweep across all changes.

- [x] T025 [P] Run `bun typecheck` — verify no new TypeScript errors introduced by `customTitle?: string` addition or `getSpaceDisplayEditorFontSize` export
- [x] T026 [P] Run `bun lint` — verify no new linting violations across all modified files
- [x] T027 Run quickstart.md validation: manually execute each "Verify" step from quickstart.md Changes 1–10 to confirm all 10 changes behave as documented
- [x] T028 [P] Cross-check that `BlockMessageMarkdown` is properly exported from `components/modules/agent/index.ts` (or add the export if missing) so `ChangelogPopup.vue` can import it cleanly

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)          → No dependencies
Phase 2 (Foundational)   → Depends on Phase 1 (T002, T003 are parallelizable with each other)
Phases 3–16 (Stories)    → US3 depends on T003 · US6 depends on T002 · All others: start after Phase 1
Phase 17 (Polish)        → Depends on all story phases complete
```

### User Story Dependencies

| Story                      | Priority | Blocked By             | Can Parallelize With         |
| -------------------------- | -------- | ---------------------- | ---------------------------- |
| US1 — Password toggle      | P1       | Phase 1 only           | US2, US4, US7, US8–US13      |
| US2 — SSL/SSH hints        | P2       | Phase 1 only           | US1, US4, US7, US8–US13      |
| US3 — Density → CodeMirror | P3       | T003 (Phase 2)         | US1, US2, US4–US5 after T003 |
| US4 — Footer button height | P3       | Phase 1 only           | All others                   |
| US5 — Cmd+J shortcut       | P3       | Phase 1 only           | All others                   |
| US6 — Thread renaming      | P4       | T002 (Phase 2)         | All others after T002        |
| US7 — Panel suppression    | P4       | Phase 1 only           | All others                   |
| US8 — CMD palette icons    | P5       | Phase 1 only           | US9, US10                    |
| US9 — Instance info cmd    | P5       | Phase 1 only           | US8, US10                    |
| US10 — What's New cmd      | P5       | Phase 1 only           | US8, US9                     |
| US11 — Changelog timeline  | P6       | Phase 1 only           | US12                         |
| US12 — Changelog markdown  | P6       | Phase 1 only           | US11                         |
| US13 — host:db column      | P7       | Phase 1 only           | All others                   |
| US14 — Automated tests     | P8       | US3, US4, US5 complete | None (quality gate)          |

### Parallel Execution Groups (After Phase 2)

**Group A** — Highest priority, fully independent:

- T004, T005 (US1) + T006, T007 (US2) + T009 (US4) + T016 (US7) + T023 (US13)

**Group B** — Can run in parallel with Group A:

- T010–T012 (US5) + T017–T018 (US8) + T019 (US9) + T020 (US10)

**Group C** — After T002/T003 resolve:

- T008 (US3, needs T003) + T013–T015 (US6, needs T002)

**Group D** — Visual/changelog (no blockers beyond Phase 1):

- T021 (US11) + T022 (US12)

**Group E** — Quality gate (after Raw Query changes):

- T024 (US14)

---

## Implementation Strategy

**MVP Scope** (fastest path to highest value): Complete US1 (T004–T005) — unblocks connection form users immediately. Then US7 (T016) — single-line change, no risk.

**Recommended Delivery Order**:

1. Phase 2 (foundational, ~5 min) — unblocks US3 and US6
2. US1 → US2 → US7 → US13 (fast wins, independent)
3. US4 → US5 (raw query polish + shortcut)
4. US3 (density compartment, slightly more complex)
5. US6 (thread rename, multi-file)
6. US8 → US9 → US10 (command palette, grouped)
7. US11 → US12 (changelog, grouped)
8. US14 (tests, last — validates the raw query changes)
9. Phase 17 (polish sweep)

**Total Task Count**: 28 tasks
**Tasks per User Story**:

- US1: 2 · US2: 2 · US3: 1 · US4: 1 · US5: 3 · US6: 3 · US7: 1 · US8: 2 · US9: 1 · US10: 1 · US11: 1 · US12: 1 · US13: 1 · US14: 1
- Setup: 1 · Foundational: 2 · Polish: 4

**Parallel Opportunities**: 16 tasks marked `[P]` — the majority of the batch can be implemented simultaneously across two or more developers.

**Independent Test Criteria per Story**:

- US1: Eye-icon toggle switches password field type on both connection form and SSH tunnel
- US2: Description text visible below each SSL/SSH textarea without interaction
- US3: CodeMirror font size changes live when density setting changes
- US4: Footer buttons render at equal height in raw query view
- US5: Cmd+J toggles result panel; no firing outside raw query context
- US6: Double-click rename → persists to localStorage → survives navigation
- US7: Panel toggles absent on agent screen; restored on all other views
- US8: No `lucide:*` icons on session commands in command palette
- US9: Instance info entry in palette; opens instance detail view
- US10: "What's New" entry in palette; opens changelog panel
- US11: Timeline layout with vertical line, nodes, and dates — newest first
- US12: What's New markdown visually matches agent chat markdown
- US13: Connection Details cell displays `host:databaseName` format
- US14: 6/6 Vitest raw query scenarios pass
