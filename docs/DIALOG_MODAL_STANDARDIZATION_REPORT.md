# Dialog / Modal Standardization Report

## Scope

Audit scope focused on `Dialog`, `DialogContent`, `AlertDialogContent`, and `DialogScrollContent` usage under `components/modules`.

## Current Baseline

- `components/ui/dialog/DialogContent.vue` is the main dialog shell, but it only exposes `class`, `showCloseButton`, and `restoreFocus`.
- `components/ui/alert-dialog/AlertDialogContent.vue` also only exposes `class`, so every larger alert-style modal is forced into custom width and spacing overrides.
- `components/ui/dialog/DialogScrollContent.vue` already exists, but there are no active module-level usages of it in the current codebase.
- Because there is no shared `size`, `padding`, or `scroll` API, many consumers re-implement modal layout with viewport width hacks, custom padding, and internal scroll containers.

## What Is Acceptable

- Small confirmation dialogs using simple overrides such as `max-w-sm`, `max-w-md`, or `max-w-lg` are still acceptable.
- Local class overrides are not the problem by themselves. The problem starts when width, height, padding, and scroll behavior are repeatedly rebuilt per feature.

## Findings

### 1. Preview flows are using `AlertDialog` as a large content modal

These files render large SQL/code previews inside `AlertDialogContent` with the same hard-coded width pattern:

- `components/modules/management/schemas/dialogs/SqlPreviewDialog.vue`
- `components/modules/raw-query/components/result-tab/RawQueryUpdatePreviewDialog.vue`
- `components/modules/quick-query/SafeModeConfirmDialog.vue`
- `components/modules/quick-query/FunctionDetail.vue`

Observed pattern:

```vue
<AlertDialogContent class="border w-[55vw]! max-w-[55vw]!"></AlertDialogContent>
```

Why this is not ideal:

- `AlertDialog` is intended for short, decision-focused interruption flows. Several of these screens behave more like preview modals with rich body content.
- The exact same `55vw` width hack is duplicated across multiple features.
- The shell contract is implicit. Every new preview modal has to remember the same width and content structure again.

Recommended refactor:

- Keep `AlertDialog` only for true confirm/cancel flows.
- For preview-first flows, move to `Dialog` with a standard preview shell.
- If some flows must remain `AlertDialog`, add a shared size API to `AlertDialogContent`, for example `size="xl"` or `size="preview"`, so width is standardized instead of copied.
- Create one reusable wrapper for code/SQL confirmation previews, for example `ConfirmPreviewDialog`, and migrate all four files to it.

### 2. Large feature dialogs are rebuilding shell layout inline

The following files manually control viewport width, height, padding, and scrolling inside `DialogContent`:

- `components/modules/connection/containers/ManagementConnectionModal.vue`
- `components/modules/connection/components/CreateConnectionModal.vue`
- `components/modules/settings/containers/SettingsContainer.vue`
- `components/modules/agent/components/AgentAttachmentPanel.vue`
- `components/modules/settings/components/layout-builder/LayoutBuilderDialog.vue`
- `components/modules/raw-query/components/AddVariableModal.vue`
- `components/modules/raw-query/components/RawQueryConfigModal.vue`
- `components/modules/management/role-permission/components/GrantRevokeDialog.vue`
- `components/modules/quick-query/QuickQueryErrorPopup.vue`

Representative patterns:

```vue
<DialogContent class="w-[95vw]! max-w-[55vw]!"></DialogContent>
```

Why this is not ideal:

- Width logic is encoded as ad-hoc viewport values instead of a small shared size scale.
- Height and scrolling are handled differently in each feature, so behavior is inconsistent.
- `p-0`, custom internal `DialogHeader` spacing, and `overflow-hidden` are repeated because the shell does not expose the right primitives.
- Large content dialogs are carrying their own layout system instead of using a reusable modal body pattern.

Recommended refactor:

- Add a shared `size` prop to `DialogContent`, for example `sm`, `md`, `lg`, `xl`, `2xl`, `panel`, `full`.
- Add a shared `scroll` mode, for example `scroll="content" | "viewport" | "none"`.
- Add a shared `padding` mode, for example `padding="default" | "compact" | "none"`.
- Move long-content flows to `DialogScrollContent` or replace it with a standardized scroll-shell that is actually used.
- Introduce one reusable shell for complex dialogs:

```vue
<DialogContent size="xl" padding="none" scroll="content">
  <DialogHeader class="px-6 pt-6 pb-3" />
  <DialogBody class="px-6 pb-4" />
  <DialogFooter class="px-6 pb-6 pt-3" />
</DialogContent>
```

The exact API can vary, but the important part is that these layout decisions stop living in every feature.

### 3. Connection flow duplicates dialog shell spacing across components

Relevant files:

- `components/modules/connection/components/CreateConnectionModal.vue`
- `components/modules/connection/components/ConnectionStepType.vue`

Observed pattern:

- `CreateConnectionModal.vue` defines a large, custom `DialogContent` shell.
- `ConnectionStepType.vue` then redefines header/footer spacing with `p-6 pb-3`, `px-6 pb-6 pt-3`, and its own scroll body.

Why this is not ideal:

- One flow is split across multiple components, but the shell contract is not centralized.
- Step one and step two can drift in spacing and scroll behavior.

Recommended refactor:

- Keep size, scroll, and outer padding decisions in the modal shell component.
- Keep step components responsible only for content.
- If the flow needs a wizard layout, create a dedicated `WizardDialogShell` and compose step screens inside it.

### 4. Header and footer padding is being manually patched at call sites

Relevant files:

- `components/modules/agent/components/AgentAttachmentPanel.vue`
- `components/modules/connection/components/CreateConnectionModal.vue`
- `components/modules/connection/components/ConnectionStepType.vue`

Observed pattern:

```vue
<DialogHeader class="p-4 pb-2 text-left"></DialogHeader>
```

Why this is not ideal:

- Header/footer spacing becomes a per-screen concern instead of a modal-system concern.
- It is difficult to keep consistent rhythm across the app when each dialog chooses its own shell spacing.

Recommended refactor:

- Standardize spacing inside the dialog primitives.
- If multiple spacing presets are needed, express them as variants rather than raw utility bundles at every call site.
- Prefer `DialogBody` or equivalent to prevent content padding from leaking into headers and footers.

### 5. There are small but clear API-smell cases that should be cleaned up immediately

Relevant files:

- `components/modules/raw-query/components/AddVariableModal.vue`
- `components/modules/raw-query/components/RawQueryConfigModal.vue`
- `components/modules/connection/containers/ManagementConnectionModal.vue`

Observed issues:

- Empty wrapper props: `<Dialog class="">`
- Commented modal-header code left inside the template
- Width and shell overrides without an explicit modal variant

Why this matters:

- These are not architectural failures by themselves, but they indicate the modal API is hard enough to use that consumers start leaving noise behind.

Recommended refactor:

- Remove empty `class` props and dead comments now.
- After shared variants exist, migrate these files first because they are easy wins.

## Proposed Standard

### Dialog type rules

- Use `AlertDialog` only for short, blocking confirmation flows.
- Use `Dialog` for editors, previews, settings, and any content-heavy interaction.
- Use a dedicated scroll-shell for dialogs with tall bodies instead of custom `max-h` plus manual internal scroll wrappers.

### Primitive API to add

Recommended minimum API on `DialogContent`:

- `size`: `sm | md | lg | xl | 2xl | panel | full`
- `padding`: `default | compact | none`
- `scroll`: `none | content | viewport`
- `showCloseButton`: keep existing prop
- `restoreFocus`: keep existing prop

Recommended minimum API on `AlertDialogContent`:

- `size`: `sm | md | lg | xl`

Recommended optional structural helpers:

- `DialogBody`
- `DialogStickyFooter`
- `ConfirmPreviewDialog`
- `WizardDialogShell`

## Suggested Migration Order

1. Add size and scroll variants to `DialogContent` and `AlertDialogContent`.
2. Choose whether `DialogScrollContent` should become the standard scroll-shell or be replaced by a cleaner primitive.
3. Migrate the duplicated `55vw` preview dialogs into one shared preview shell.
4. Migrate the largest custom shells next: settings, connection, agent attachment, layout builder.
5. Clean up low-risk API smells such as empty `class` props and dead comments.

## Highest-Value First Targets

- `components/modules/management/schemas/dialogs/SqlPreviewDialog.vue`
- `components/modules/raw-query/components/result-tab/RawQueryUpdatePreviewDialog.vue`
- `components/modules/quick-query/FunctionDetail.vue`
- `components/modules/connection/components/CreateConnectionModal.vue`
- `components/modules/settings/containers/SettingsContainer.vue`
- `components/modules/agent/components/AgentAttachmentPanel.vue`

These files have the highest payoff because they either duplicate the same preview shell or currently carry large amounts of custom modal layout code.
