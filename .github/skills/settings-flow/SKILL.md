---
name: settings-flow
description: Complete guide for adding, updating, and removing settings in OrcaQ. Covers the full data flow — type → constant → store → component — for all settings panels (Appearance, Editor, Quick Query, Agent). Load this skill for any task involving user preferences, persistent configs, or the settings modal.
---

# Settings Flow — OrcaQ

## Architecture Overview

Settings in OrcaQ follow a strict 4-layer flow:

```
types/settings.types.ts          ← Define the shape / enum
constants/settings.constants.ts  ← Default values & UI option arrays
core/stores/appConfigStore.ts    ← Reactive state + reset actions (persisted)
components/modules/settings/     ← UI panels that read/write the store
```

All state is persisted automatically via `{ persist: true }` on the Pinia store — no manual localStorage calls needed.

---

## File Locations

| Purpose                   | File                                                               |
| ------------------------- | ------------------------------------------------------------------ |
| Types & enums             | `components/modules/settings/types/settings.types.ts`              |
| Constants & defaults      | `components/modules/settings/constants/settings.constants.ts`      |
| Pinia store               | `core/stores/appConfigStore.ts`                                    |
| Settings modal controller | `core/contexts/useSettingsModal.ts`                                |
| Container (modal shell)   | `components/modules/settings/containers/SettingsContainer.vue`     |
| Appearance panel          | `components/modules/settings/components/AppearanceConfig.vue`      |
| Editor panel              | `components/modules/settings/components/EditorConfig.vue`          |
| Quick Query panel         | `components/modules/settings/components/QuickQueryConfig.vue`      |
| Agent panel               | `components/modules/settings/components/AgentConfig.vue`           |
| Table Appearance panel    | `components/modules/settings/components/TableAppearanceConfig.vue` |
| Public module API         | `components/modules/settings/index.ts`                             |

---

## How to Add a New Setting

### Step 1 — Define the type

In `components/modules/settings/types/settings.types.ts`:

```ts
// For a simple value — add a field to an existing interface
export interface CodeEditorConfigs {
  theme: EditorTheme;
  fontSize: number;
  showMiniMap: boolean;
  indentation: boolean;
  wordWrap: boolean; // ← new field
}

// For an enum setting — add an enum
export enum WordWrapMode {
  Off = 'off',
  On = 'on',
  Bounded = 'bounded',
}
```

### Step 2 — Add default value and options constant

In `components/modules/settings/constants/settings.constants.ts`:

```ts
// Default value (used in store initialisation and reset)
export const DEFAULT_EDITOR_CONFIG = {
  ...existingDefaults,
  wordWrap: WordWrapMode.Off,
};

// Option array for UI dropdowns / toggles
export const WORD_WRAP_OPTIONS: Array<{ label: string; value: WordWrapMode }> =
  [
    { label: 'Off', value: WordWrapMode.Off },
    { label: 'On', value: WordWrapMode.On },
    { label: 'Bounded', value: WordWrapMode.Bounded },
  ];
```

### Step 3 — Add to the Pinia store

In `core/stores/appConfigStore.ts`:

```ts
// Inside the store factory function, add the reactive field
const codeEditorConfigs = reactive<CodeEditorConfigs>({
  ...
  wordWrap: DEFAULT_EDITOR_CONFIG.wordWrap,  // ← new field
});

// Update the reset action
const resetCodeEditorConfigs = () => {
  Object.assign(codeEditorConfigs, {
    ...
    wordWrap: DEFAULT_EDITOR_CONFIG.wordWrap,  // ← include in reset
  });
};

// Make sure it is included in the return object (it already is if using the reactive object)
```

### Step 4 — Add UI in the correct panel component

In the relevant `*Config.vue` under `components/modules/settings/components/`:

```vue
<script setup lang="ts">
import { WORD_WRAP_OPTIONS } from '../constants';

const appConfigStore = useAppConfigStore();
</script>

<template>
  <!-- Follow the standard settings row pattern -->
  <div class="flex items-center justify-between gap-4">
    <div class="flex flex-col gap-0.5">
      <p class="text-sm">Word wrap</p>
      <p class="text-xs text-muted-foreground">
        Control how long lines are handled in the editor
      </p>
    </div>
    <Select
      :modelValue="appConfigStore.codeEditorConfigs.wordWrap"
      @update:modelValue="appConfigStore.codeEditorConfigs.wordWrap = $event"
    >
      <SelectTrigger size="sm" class="h-6! cursor-pointer">
        <SelectValue placeholder="Select word wrap mode" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem
            class="cursor-pointer h-6!"
            v-for="opt in WORD_WRAP_OPTIONS"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  </div>
</template>
```

---

## How to Add a Brand New Settings Panel Tab

### Step 1 — Add the component key enum value

```ts
// settings.types.ts
export enum SettingsComponentKey {
  EditorConfig = 'EditorConfig',
  QuickQueryConfig = 'QuickQueryConfig',
  AgentConfig = 'AgentConfig',
  AppearanceConfig = 'AppearanceConfig',
  TableAppearanceConfig = 'TableAppearanceConfig',
  MyNewConfig = 'MyNewConfig', // ← new
}
```

### Step 2 — Add to the nav items constant

```ts
// settings.constants.ts
export const SETTINGS_NAV_ITEMS: SettingsNavItem[] = [
  ...existingItems,
  {
    name: 'My New Section',
    icon: 'hugeicons:some-icon',
    componentKey: SettingsComponentKey.MyNewConfig,
  },
];
```

### Step 3 — Create the panel component

Create `components/modules/settings/components/MyNewConfig.vue` following the standard visual pattern (see Standard UI Pattern below).

### Step 4 — Register in the container

In `components/modules/settings/containers/SettingsContainer.vue`:

```ts
import MyNewConfig from '../components/MyNewConfig.vue';

const SETTINGS_COMPONENTS: Record<SettingsComponentKey, Component> = {
  ...existing,
  MyNewConfig,
};
```

### Step 5 — Export from index

```ts
// components/modules/settings/components/index.ts
export { default as MyNewConfig } from './MyNewConfig.vue';
```

---

## How to Update an Existing Setting

1. **Change the type** in `settings.types.ts` if the shape changes.
2. **Update the default** in `settings.constants.ts` — this affects both first run and the reset action.
3. **Update the reset action** in `appConfigStore.ts` to include the new default.
4. **Update the UI** in the relevant `*Config.vue`.

> The store uses `{ persist: true }` (Pinia plugin). Changing a field name requires a migration or the old persisted value will be ignored and the new default will apply automatically on next load.

---

## How to Open Settings Programmatically

Use the `useSettingsModal` composable from `core/contexts/useSettingsModal.ts`:

```ts
const { openSettings, closeSettings, isSettingsOpen } = useSettingsModal();

// Open on a specific tab
openSettings('Appearance');

// Open on default tab
openSettings();

// Keyboard shortcut (already registered globally)
// Cmd+, / Ctrl+, toggles the modal
```

Tab names must match the `name` field in `SETTINGS_NAV_ITEMS`.

---

## Standard UI Pattern for Settings Rows

All panels use these exact CSS patterns for visual consistency:

### Section header

```vue
<h4
  class="text-sm font-medium leading-7 text-primary flex items-center gap-1 mb-2"
>
  <Icon name="hugeicons:some-icon" class="size-5!" /> Section Title
</h4>
```

### Setting row (label + control)

```vue
<div class="flex items-center justify-between gap-4">
  <div class="flex flex-col gap-0.5">
    <p class="text-sm">Setting Label</p>
    <p class="text-xs text-muted-foreground">
      Short description of what this setting does
    </p>
  </div>
  <!-- Control: Select, Switch, Button group, ColorPicker, etc. -->
</div>
```

### Reset button (when a group of settings has a reset)

```vue
<Button
  size="xxs"
  variant="link"
  @click="appConfigStore.resetSomeConfigs"
  class="cursor-pointer"
>
  <Icon name="hugeicons:reload" class="size-3.5! mr-1" />
  Reset to Defaults
</Button>
```

### Vertical gap between rows

```vue
<div class="flex flex-col space-y-4">
  <!-- rows here -->
</div>
```

### Section divider

```vue
<hr class="border-border" />
```

---

## Key Constraints

- **Never call localStorage directly** — Pinia `persist: true` handles storage.
- **Never import the store in `components/`** — only `containers/` and `hooks/` may import the store; settings panels are exceptions because they ARE the settings UI (they act as containers).
- **Defaults must live in `constants/`** — not inlined in the store or component.
- **Reset actions must use `Object.assign`** on the reactive object — not reassigning the ref.
- **Disabled nav items** use `disable: true` in `SETTINGS_NAV_ITEMS` — no `componentKey` needed.
- **Nav tab names** in `useSettingsModal().openSettings(tab)` are matched by string equality to `SettingsNavItem.name`.

---

## Consuming Settings Outside the Settings Module

Read config values from `useAppConfigStore()` anywhere in the app:

```ts
import { useAppConfigStore } from '~/core/stores/appConfigStore';

const appConfigStore = useAppConfigStore();

// Read
const fontSize = appConfigStore.codeEditorConfigs.fontSize;

// Write (reactive — UI updates immediately, persisted automatically)
appConfigStore.codeEditorConfigs.fontSize = 14;
```

For global appearance settings like `spaceDisplay` or `tableAppearanceConfigs`, the store is the single source of truth — components read from it directly via `storeToRefs` or direct property access.
