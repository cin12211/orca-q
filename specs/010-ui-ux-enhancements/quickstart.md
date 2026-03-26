# Developer Quickstart: UI/UX Enhancements Batch

**Feature**: 010-ui-ux-enhancements  
**Date**: 2026-03-17

This guide tells an implementing developer exactly which file to open, what to change, and how to verify each change — ordered by priority.

---

## Prerequisites

```bash
# Ensure you are on the feature branch
git checkout 010-ui-ux-enhancements

# Install dependencies (if not already done)
bun install

# Run dev server
bun dev
```

---

## Change 1 — Connection Form: Show/Hide Password (P1)

**Files to edit**:

- `components/modules/connection/components/CreateConnectionModal.vue`
- `components/modules/connection/components/ConnectionSSHTunnel.vue`

**Pattern** (already used in `components/modules/settings/components/AgentConfig.vue`):

```vue
<script setup lang="ts">
const showPassword = ref(false);
</script>

<template>
  <!-- Wrap the input in a relative div -->
  <div class="relative">
    <Input
      :type="showPassword ? 'text' : 'password'"
      v-model="formData.password"
      placeholder="••••••••"
    />
    <button
      type="button"
      class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      @click="showPassword = !showPassword"
    >
      <Icon
        :name="showPassword ? 'hugeicons:eye-off' : 'hugeicons:eye'"
        class="size-4!"
      />
    </button>
  </div>
</template>
```

Apply to both `formData.password` (CreateConnectionModal) and `formData.sshPassword` (ConnectionSSHTunnel).

**Verify**: Open connection form → password field → click eye icon → text reveals/masks.

---

## Change 2 — SSL/SSH File-Input Hint Text (P2)

**Files to edit**:

- `components/modules/connection/components/ConnectionSSLConfig.vue`
- `components/modules/connection/components/ConnectionSSHTunnel.vue`

**Pattern**: Below each `<Textarea>`, add:

```vue
<p class="text-xs text-muted-foreground">
  Drop a .pem file here or paste the CA certificate content
</p>
```

Specific hint strings:

| Field                  | Hint                                                                    |
| ---------------------- | ----------------------------------------------------------------------- |
| SSL CA Certificate     | "Drop a .pem / .crt file here, or paste the CA certificate content"     |
| SSL Client Certificate | "Drop a .pem / .crt file here, or paste the client certificate content" |
| SSL Key                | "Drop a .pem / .key file here, or paste the private key content"        |
| SSH Private Key        | "Drop a .pem / .key file here, or paste the SSH private key content"    |

**Verify**: Open SSL Config accordion → field descriptions are visible below each textarea.

---

## Change 3 — Management Connections: host:databaseName Column (P7)

**File to edit**: `components/modules/connection/components/ConnectionsList.vue`

**Current** (around line 130):

```html
<div v-else class="text-muted-foreground">
  {{ connection.host }}:{{ connection.port }} {{ connection.database ?
  `/${connection.database}` : '' }}
</div>
```

**New** (cell display — port moved to tooltip only):

```html
<div v-else class="text-muted-foreground truncate">
  {{ connection.host }}{{ connection.database ? `:${connection.database}` : ''
  }}
</div>
```

The `<TooltipContent>` `<p>` element keeps the full `host:port/database` format.

**Verify**: Management Connections page → Connection Details column shows `localhost:mydb` format.

---

## Change 4 — Agent Screen: Suppress Panel Toggles (P4)

**File to edit**: `pages/[workspaceId]/[connectionId]/agent/[tabViewId].vue`

**Current**:

```typescript
definePageMeta({
  keepalive: {
    max: DEFAULT_MAX_KEEP_ALIVE,
  },
});
```

**New**:

```typescript
definePageMeta({
  keepalive: {
    max: DEFAULT_MAX_KEEP_ALIVE,
  },
  notAllowBottomPanel: true,
  notAllowRightPanel: true,
});
```

**Verify**: Navigate to an agent tab → bottom and right panel toggle buttons are not visible.

---

## Change 5 — Agent Thread Renaming (P4)

**Files to edit**:

1. `components/modules/agent/types/index.ts` — Add `customTitle?: string` to `AgentHistorySession`
2. `components/modules/agent/hooks/useDbAgentWorkspace.ts` — Add `renameThread` + `getDisplayTitle`
3. Thread list component (likely `AgentWorkspace.vue` or a sidebar list component) — Add inline rename UI

**Type change** (`types/index.ts`):

```typescript
export interface AgentHistorySession {
  // ... existing fields ...
  customTitle?: string; // User-defined display name
}
```

**Hook change** (`useDbAgentWorkspace.ts`):

```typescript
// Add alongside existing history mutations
const renameThread = (id: string, newTitle: string) => {
  const trimmed = newTitle.trim();
  if (!trimmed) return;
  const idx = histories.value.findIndex(h => h.id === id);
  if (idx === -1) return;
  histories.value[idx] = { ...histories.value[idx], customTitle: trimmed };
};

// Utility to get display title
const getDisplayTitle = (session: AgentHistorySession) =>
  session.customTitle?.trim() || session.title;
```

**UI pattern** (in the thread list item):

```vue
<template>
  <div
    v-if="!isRenaming"
    @dblclick="startRename"
    class="truncate cursor-pointer"
  >
    {{ getDisplayTitle(history) }}
  </div>
  <Input
    v-else
    ref="renameInputRef"
    v-model="renameValue"
    class="h-6 text-xs"
    @keydown.enter="confirmRename"
    @keydown.escape="cancelRename"
    @blur="confirmRename"
  />
</template>
```

**Verify**: Double-click a thread name in the sidebar → input appears → type new name → Enter → sidebar shows new name → navigate away and back → name persists.

---

## Change 6 — Raw Query: Space Density → CodeMirror (P3)

**Files to edit**:

- `components/base/code-editor/BaseCodeEditor.vue` — or `components/modules/raw-query/hooks/useSqlEditorExtensions.ts`
- `core/composables/useSpaceDisplay.ts` — Add `getSpaceDisplayEditorFontSize` helper

**New helper in `useSpaceDisplay.ts`**:

```typescript
export function getSpaceDisplayEditorFontSize(
  value: SpaceDisplay | string
): string {
  const safe = VALID_VALUES.has(value) ? value : SpaceDisplay.Default;
  if (safe === SpaceDisplay.Compact) return '12px';
  if (safe === SpaceDisplay.Spacious) return '16px';
  return '14px';
}
```

**In `useSqlEditorExtensions.ts`** (or `BaseCodeEditor.vue`):

```typescript
import { Compartment } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { getSpaceDisplayEditorFontSize } from '~/core/composables/useSpaceDisplay';
import { useAppConfigStore } from '~/core/stores/appConfigStore';

const fontSizeCompartment = new Compartment();
const appConfigStore = useAppConfigStore();

// Initial extension
const fontSizeExtension = fontSizeCompartment.of(
  EditorView.theme({
    '.cm-content': {
      fontSize: getSpaceDisplayEditorFontSize(appConfigStore.spaceDisplay),
    },
  })
);

// Watch and reconfigure
watch(
  () => appConfigStore.spaceDisplay,
  val => {
    editorView?.dispatch({
      effects: fontSizeCompartment.reconfigure(
        EditorView.theme({
          '.cm-content': { fontSize: getSpaceDisplayEditorFontSize(val) },
        })
      ),
    });
  }
);
```

**Verify**: Settings → Density → switch to Compact → Raw Query editor font shrinks. Switch back → normal size.

---

## Change 7 — Raw Query: Footer Button Height (P3)

**File to edit**: `components/modules/raw-query/components/RawQueryEditorFooter.vue`

Ensure all bottom-row action buttons use the same `size` prop:

- "Format" button → `size="xs"`
- "Explain" button → `size="xs"` (already `size="xs"`)
- "Execute Current" button → `size="xs"`
- All dropdown chevron triggers → `size="iconSm"`

Remove any inline `class` padding overrides that change the height for individual buttons.

**Verify**: Open raw query view → footer bar → all buttons align visually at the same height.

---

## Change 8 — Raw Query: Command+J Result Panel Toggle (P3)

**New file**: `components/modules/raw-query/hooks/useRawQueryKeyboardShortcuts.ts`

```typescript
import { useEventListener } from '@vueuse/core';

export function useRawQueryKeyboardShortcuts(options: {
  containerRef: Ref<HTMLElement | null>;
  onToggleResultPanel: () => void;
}) {
  useEventListener(document, 'keydown', (event: KeyboardEvent) => {
    const isJ = event.key === 'j' || event.key === 'J';
    const isModifier = event.metaKey || event.ctrlKey;
    if (!isJ || !isModifier) return;

    // Only fire if focus is within the raw query container
    const container = options.containerRef.value;
    if (!container || !container.contains(document.activeElement)) return;

    event.preventDefault();
    options.onToggleResultPanel();
  });
}
```

**In `RawQuery.vue`**: Add `showResultPanel = ref(true)`, call `useRawQueryKeyboardShortcuts`, pass `showResultPanel` to `RawQueryLayout.vue`.

**Verify**: Focus the code editor → press Cmd+J → result panel hides → press again → panel returns.

---

## Change 9 — Command Palette: Hugeicons + New Items (P5)

**File to edit**: `components/modules/command-palette/hooks/providers/useSystemCommands.ts`

1. Replace any `lucide:*` icons in session-related commands with `hugeicons:*` equivalents
2. Add instance info command:

```typescript
{
  id: 'cmd-show-instance-info',
  label: 'Instance Insights',
  icon: 'hugeicons:database-02',
  group: 'Commands',
}
// executor: open instance detail view (check existing navigation helpers)
```

3. Add What's New command:

```typescript
{
  id: 'cmd-show-whats-new',
  label: "What's New",
  icon: 'hugeicons:stars',
  group: 'Commands',
}
// executor: useChangelogModal().openChangelog()
```

**Verify**: Open command palette → type "instance" → entry visible with hugeicons icon → select → instance detail opens.

---

## Change 10 — What's New: Timeline Layout (P6)

**File to edit**: `components/modules/changelog/ChangelogPopup.vue`

Replace the flat `space-y-8` list with a timeline layout. Per-entry wrapper:

```html
<div
  v-for="entry in changelogEntries"
  :key="entry.version"
  class="relative pl-8"
>
  <!-- Timeline spine -->
  <div class="bg-border absolute top-6 bottom-0 left-2.5 w-px" />
  <!-- Timeline node -->
  <div
    class="bg-primary/10 border-primary absolute top-3.5 left-0 flex h-5 w-5 items-center justify-center rounded-full border-2"
  />

  <!-- Version Badge and content (existing markup) -->
  ...
</div>
```

Remove the manual `<div class="border-t ...">` divider — the timeline spine replaces it.

**Verify**: Open What's New panel → releases appear as a vertical timeline with connecting line.

---

## Change 11 — What's New: Unified Markdown Rendering (P6)

**File to edit**: `components/modules/changelog/ChangelogPopup.vue`

1. Import `BlockMessageMarkdown`:

```typescript
import BlockMessageMarkdown from '~/components/modules/agent/components/block-message/BlockMessageMarkdown.vue';
```

2. Replace the markdown rendering div:

```html
<!-- Before -->
<div
  class="changelog-content prose prose-sm dark:prose-invert max-w-none"
  v-html="renderMarkdown(entry.content)"
/>

<!-- After -->
<BlockMessageMarkdown :content="entry.content" :is-streaming="false" />
```

3. Remove the `renderMarkdown` function and the `.changelog-content` scoped CSS block.

**Verify**: Open What's New → markdown content (headings, lists, code blocks) renders with the same visual style as agent chat messages.

---

## Running Tests

```bash
# Unit/integration tests
bun vitest run

# Specific module tests
bun vitest run test/nuxt/components/modules/raw-query

# e2e tests (connection form)
bun playwright test test/playwright/connection-form.spec.ts
```

---

## Test Cases to Write (AC from spec)

Create `test/nuxt/components/modules/raw-query/RawQueryView.test.ts`:

| Test                  | Scenario                                                   |
| --------------------- | ---------------------------------------------------------- |
| Normal query          | Execute valid SQL → result rows visible                    |
| Error query           | Execute invalid SQL → error message displayed              |
| Empty/mutation result | Execute DML/empty SELECT → success msg, no grid            |
| Explain query         | Execute EXPLAIN → explain plan output rendered             |
| Named variable query  | Query with `:variable` → prompt/substitution UI shown      |
| Inline variable query | Query with `-- @variable = value` → inline values resolved |
