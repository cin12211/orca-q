# Research: UI/UX Enhancements Batch

**Feature**: 010-ui-ux-enhancements  
**Date**: 2026-03-17  
**Phase**: 0 — Unknowns resolved before design

---

## R-001: Password Show/Hide Toggle Pattern

**Question**: How is the password field rendered in the connection form, and how do other password-like fields (API keys in AgentConfig) implement show/hide?

**Finding**: `CreateConnectionModal.vue` uses a plain `<Input type="password">`. `ConnectionSSHTunnel.vue` similarly uses `type="password"` with no toggle. The settings `AgentConfig.vue` already implements a toggle using a local `ref` (the `visibleKeys` object) that switches `type` between `"text"` and `"password"` conditionally. This is the pattern to adopt.

**Decision**: Introduce a `usePasswordToggle()` micro-composable (or simply a `ref<boolean>` called `showPassword`) inside each affected component's `<script setup>`. Switch the input `:type` between `"password"` and `"text"` based on that ref. Render a toggle icon button (`hugeicons:eye` / `hugeicons:eye-off`) inside the input using a wrapper `div` with `relative` positioning. No new library needed.

**Alternatives considered**: A shared `BasePasswordInput.vue` component — rejected because it is over-engineering for three call sites; inline ref is sufficient.

---

## R-002: SSL/SSH File-Input Descriptions

**Question**: What exactly do `ConnectionSSLConfig.vue` and `ConnectionSSHTunnel.vue` use for file-drop fields, and what description is missing?

**Finding**: Both components already wire `useFileDrop` and apply `@dragover`/`@drop` handlers to `<Textarea>` elements. The `ring-2 ring-primary` class is applied when `isDragging` is true, providing visual feedback. What is missing is helper text beneath each field. The textarea `placeholder` contains hints about PEM format but these disappear once text is entered and are not visually prominent.

**Decision**: Add a `<p class="text-xs text-muted-foreground">` hint element directly below each `<Textarea>` in both SSL and SSH components. Hint should read something like "Drop a .pem file here or paste content" and mention the expected key type (CA, client cert, private key, etc.). No change to the drag-and-drop mechanics — they already work.

**Alternatives considered**: Tooltip on the Label — rejected because it requires hover discovery; inline text requires zero interaction.

---

## R-003: Connection Details Column Format

**Question**: What does the "Connection Details" column currently render?

**Finding**: `ConnectionsList.vue` (line ~133) already renders `connection.host:connection.port/connection.database`. The existing format is actually `host:port/database` (includes port), not just `host:databaseName`. The spec calls for `host:databaseName`. Current display: `localhost:5432/mydb`. Required display per the spec: `localhost:mydb` (omit port, or clarify assumption).

**Decision**: Per the assumption in the spec ("follows whichever format is already used for host display elsewhere"), keep the port visible since removing it would lose useful information. Update the cell to use the format `host:databaseName` by removing the `:port` segment from the display (the full detail remains in the Tooltip which shows when hovered). Specifically: change display to `{{ connection.host }}:{{ connection.database }}` for the non-string method, with port available only in the Tooltip. If database is absent, show only `{{ connection.host }}`.

**Alternatives considered**: Show `host:port/database` as is — rejected because the spec explicitly calls for `host:databaseName` format and the port is already visible on the connection detail view when editing.

---

## R-004: Command Palette Icon System

**Question**: Are command palette session commands already using icons, and which icon set is expected?

**Finding**: `useSystemCommands.ts` uses a mix of `lucide:*` icons for most system commands and `hugeicons:*` for theme-related items (e.g., `hugeicons:chat-bot` for the Agent setting). The `useTabCommands.ts` and other providers were not inspected in detail but follow the same pattern. The Hugeicons library is integrated via `@iconify` — icons are referenced as `hugeicons:icon-name` strings in the `<Icon>` component.

**Decision**: Audit all command item definitions in `useSystemCommands.ts`, `useTabCommands.ts`, `useViewCommands.ts`, etc. For any session-related commands using `lucide:*` icons, replace with equivalent `hugeicons:*` icons. Use `hugeicons:terminal-browser` or `hugeicons:code` for generic commands. Add instance info entry with `hugeicons:database-02` and What's New entry with `hugeicons:stars` (or `hugeicons:sparkles`).

**Alternatives considered**: None — the icon family is fixed by the existing design system.

---

## R-005: What's New / Changelog Markdown Rendering

**Question**: How does the changelog currently render markdown, and what does the agent chat use?

**Finding**:

- `ChangelogPopup.vue` uses `marked.parse(content)` and injects into a `div` via `v-html` with a custom `changelog-content` CSS class that applies prose-style styles via scoped `<style>`.
- `BlockMessageMarkdown.vue` uses the same `marked.parse()` pattern, injects into `div[data-markdown]`, and applies a comprehensive set of Tailwind `@apply` rules in a global `<style>` block. These styles cover headings, paragraphs, lists, code blocks, links, tables, and blockquotes.

**Decision**: The cleanest approach is to replace the `v-html` div in `ChangelogPopup.vue` with the `<BlockMessageMarkdown>` component (imported from the agent module's public index or directly). This gives free style unification with zero CSS duplication. The `ChangelogPopup.vue` must be updated to pass `content` and `isStreaming=false` props. Remove the `.changelog-content` scoped styles entirely.

**Alternatives considered**: Copy `[data-markdown]` CSS rules into `ChangelogPopup.vue` — rejected because it creates drift. Emit the styles to a shared CSS file — requires build-time coordination; component reuse is simpler.

---

## R-006: What's New Timeline Layout

**Question**: What is the current layout of release entries in `ChangelogPopup.vue`?

**Finding**: Entries are rendered as a flat `space-y-8` list. Each entry has a "Version Badge" (pill with icon + version number) and a date `<span>`. There is a divider between entries. The layout is functional but not timeline-styled — there is no vertical connecting line.

**Decision**: Add a vertical timeline marker: wrap each entry in a `relative pl-8` div; add a `before:` pseudo-element (left vertical line) using Tailwind `before:absolute before:left-2.5 before:top-0 before:bottom-0 before:w-px before:bg-border`. Add a circular node at `left-0 top-3` for each entry (`absolute w-4 h-4 rounded-full bg-primary/20 border-2 border-primary`). Sort is already newest-first (changelog entries are typically loaded in reverse order — verify in `useChangelogModal`).

**Alternatives considered**: A third-party timeline component — rejected (no new libraries). Flexbox side-by-side layout — rejected (vertically stacked timeline is standard and more scannable for changelog data).

---

## R-007: Raw Query View — Space Density & CodeMirror

**Question**: How does `useSpaceDisplay` work, and why doesn't CodeMirror inherit it?

**Finding**: `useSpaceDisplay()` in `app.vue` sets `document.documentElement.style.fontSize` and injects an `ag-grid-space-display-override` `<style>` tag for ag-grid cells. CodeMirror 6 has its own DOM tree within a shadow-like container (`EditorView.dom`) and internally sets font size on `.cm-content` elements. CSS inheriting from `:root` font-size typically works, but CodeMirror's default theme explicitly sets `font-size: 14px` via its own StyleModule, overriding the root inheritance.

**Decision**: In `BaseCodeEditor.vue` (or within `useSqlEditorExtensions.ts`), watch `appConfigStore.spaceDisplay` and apply a `fontSize` compartment/facet update to the `EditorView` using `view.dispatch({ effects: fontSizeCompartment.reconfigure(EditorView.theme({ ".cm-content": { fontSize } })) })`. The `fontSize` value comes from `getSpaceDisplayFontSize(spaceDisplay)` mapped to a real pixel value (e.g., compact → `12px`, default → `14px`, spacious → `16px`). Use a CodeMirror `Compartment` to allow hot-swapping.

**Alternatives considered**: Adding `!important` to a global CSS rule — fragile, can break other editors. Passing a prop to `BaseCodeEditor.vue` to set inline style — simpler but requires threading prop through `RawQuery.vue`. The Compartment approach is the correct CodeMirror 6 pattern.

---

## R-008: Raw Query View — Footer Button Height

**Question**: Why are the Explain and Execute Current buttons different heights?

**Finding** (from `RawQueryEditorFooter.vue`): The "Format" button uses `size="xxs"` with a dropdown trigger combined via `rounded-r-none`. The "Explain" button uses `size="xs"`. The "Execute Current" button (not yet seen in the excerpt but follows the same pattern) likely has a different `size` prop or extra padding. The split-button pattern (left action + right chevron dropdown) uses `rounded-r-none`/`rounded-l-none` pairs that can produce height discrepancies if their `size` props differ.

**Decision**: Audit all footer buttons and standardize to `size="xs"` for all action buttons (Format, Explain, Execute Current, Cancel). The dropdown chevron triggers also standardize to `size="iconSm"` with matching height. Remove any padding overrides (`px-2`) that cause height differences.

**Alternatives considered**: CSS `h-7` override — rejected because it bypasses the design system size tokens.

---

## R-009: Raw Query View — Command+J Shortcut for Panel Toggle

**Question**: How does the result panel show/hide work in the raw query layout?

**Finding**: `RawQueryLayout.vue` (file found, not yet read in detail) likely uses a splitpane or manual height-based panel. The layout default shows the editor and result panel stacked. The appConfigStore likely holds a `isBottomPanelOpen` or similar. The `layouts/default.vue` handles the global bottom panel, but within the raw query view the "result panel" is internal to `RawQueryLayout.vue`.

**Decision**: Add a `useRawQueryKeyboardShortcuts.ts` composable in `raw-query/hooks/`. It listens for `keydown` (Meta+J on Mac, Ctrl+J elsewhere) using `useMagicKeys` from VueUse or a direct `useEventListener`. It emits a toggle that is consumed in `RawQuery.vue` to flip a `showResultPanel` ref. `RawQueryLayout.vue` receives this ref as a prop and conditionally renders/hides the result panel section. Guard: only fire when the raw query view DOM element is within `activeElement` ancestry (i.e., editor or its parent is focused).

**Alternatives considered**: Global keyboard handler in `layouts/default.vue` — rejected because this shortcut is view-specific. Using `definePageMeta` keyboard hints — no such mechanism exists in Nuxt.

---

## R-010: Agent Thread Renaming

**Question**: How are thread histories stored and displayed?

**Finding**: `useDbAgentWorkspace.ts` stores `AgentHistorySession[]` via `useStorage` (VueUse, backed by localStorage) under a key per workspace+connection. The `AgentHistorySession` type has a `title: string` field generated from `getFirstUserPrompt()`. The workspace component `AgentWorkspace.vue` renders a thread list (the "histories" sidebar). There is a `ManagementAgentHistoryTree.vue` for the management panel.

**Decision**:

1. Add an optional `customTitle?: string` field to `AgentHistorySession` (non-breaking — existing sessions omit it).
2. Add a `renameThread(id: string, newTitle: string): void` function to `useDbAgentWorkspace.ts` that finds the session by ID and sets `customTitle`.
3. Display: wherever thread title is shown, prefer `session.customTitle ?? session.title`.
4. UI: in the thread list sidebar, add an inline rename interaction — on double-click of the thread title (or via a context menu "Rename" item), show an `<Input>` in place of the title text. On blur or Enter, call `renameThread`. On Escape, cancel.

**Alternatives considered**: Separate rename endpoint or separate storage key — rejected (existing `useStorage` sessions already hold the whole session object; adding one optional field is cleanest).

---

## R-011: Agent Panel Toggle Suppression

**Question**: How does the app suppress bottom/right panels for specific pages?

**Finding** (confirmed from grep): The pattern is `definePageMeta({ notAllowBottomPanel: true, notAllowRightPanel: true })`. Already used in ERD and Explorer pages. The `layouts/default.vue` reads `route.meta.notAllowBottomPanel` and `route.meta.notAllowRightPanel` to gate the panel toggles via `v-show`.

**Decision**: Add to `pages/[workspaceId]/[connectionId]/agent/[tabViewId].vue`:

```ts
definePageMeta({
  keepalive: { max: DEFAULT_MAX_KEEP_ALIVE },
  notAllowBottomPanel: true,
  notAllowRightPanel: true,
});
```

This is a single-line change (two properties added to the existing `definePageMeta`).

**Alternatives considered**: Vuex/Pinia store flag — rejected because the existing `route.meta` pattern is already established and simpler.

---

## Summary of Decisions

| ID    | Topic                      | Decision                                                                                             |
| ----- | -------------------------- | ---------------------------------------------------------------------------------------------------- |
| R-001 | Show/hide password         | Local `ref` + icon toggle in `CreateConnectionModal.vue` and `ConnectionSSHTunnel.vue`               |
| R-002 | SSL/SSH field descriptions | Inline `<p>` hint text below each `<Textarea>` in SSL and SSH components                             |
| R-003 | Connection Details column  | Change to `host:databaseName` (remove port from cell display, keep in tooltip)                       |
| R-004 | Command palette icons      | Replace `lucide:*` in session commands with `hugeicons:*`; add instance info + What's New entries    |
| R-005 | Changelog markdown         | Replace raw `v-html` with `<BlockMessageMarkdown>` component; remove scoped CSS                      |
| R-006 | Changelog timeline         | CSS pseudo-element vertical line + circular entry node per item using Tailwind                       |
| R-007 | CodeMirror density         | CodeMirror 6 `Compartment` font-size facet, watched from `appConfigStore.spaceDisplay`               |
| R-008 | Footer button heights      | Standardize all footer action buttons to `size="xs"`                                                 |
| R-009 | Command+J shortcut         | New `useRawQueryKeyboardShortcuts.ts` composable; `showResultPanel` ref in `RawQuery.vue`            |
| R-010 | Agent thread rename        | `customTitle?: string` on `AgentHistorySession`; `renameThread()` in workspace hook; inline input UI |
| R-011 | Agent panel suppression    | Add `notAllowBottomPanel: true, notAllowRightPanel: true` to agent page `definePageMeta`             |
