# Data Model: UI/UX Enhancements Batch

**Feature**: 010-ui-ux-enhancements  
**Date**: 2026-03-17  
**Phase**: 1 — Design

---

## Overview

This feature is predominantly UI behaviour changes. The only data model change is extending the `AgentHistorySession` entity to support user-defined thread names. All other changes affect rendering logic and component behaviour, not stored data structures.

---

## Entity: AgentHistorySession

**Location**: `components/modules/agent/types/index.ts`

### Current Shape

```typescript
export interface AgentHistorySession {
  id: string;
  title: string; // Auto-generated from first user message
  preview: string;
  createdAt: string;
  updatedAt: string;
  provider: string;
  model: string;
  showReasoning: boolean;
  messages: DbAgentMessage[];
  workspaceId?: string;
}
```

### Updated Shape

```typescript
export interface AgentHistorySession {
  id: string;
  title: string; // Auto-generated from first user message (unchanged)
  customTitle?: string; // NEW: User-defined thread name; takes display priority over title
  preview: string;
  createdAt: string;
  updatedAt: string;
  provider: string;
  model: string;
  showReasoning: boolean;
  messages: DbAgentMessage[];
  workspaceId?: string;
}
```

### Field Rules

| Field         | Source                          | Display Priority               |
| ------------- | ------------------------------- | ------------------------------ |
| `customTitle` | User input via rename action    | 1st (if present and non-empty) |
| `title`       | `getFirstUserPrompt()` auto-gen | 2nd (fallback)                 |
| `preview`     | `getLastPreview()` auto-gen     | Always; shown as subtitle      |

**Resolution helper** (to be added in `useDbAgentWorkspace.ts` or a utility):

```typescript
export function getDisplayTitle(session: AgentHistorySession): string {
  return session.customTitle?.trim() || session.title;
}
```

### Validation Rules

- `customTitle` must not be empty string after trim (UI rejects blank saves; storage never writes `""`)
- `customTitle` max display truncation: 60 characters (enforced by CSS `truncate`, not by validation)
- No change to how `title` is generated; `customTitle` is additive

### Migration

No migration needed. Existing sessions in localStorage simply lack the `customTitle` field. TypeScript optional field `?` handles this gracefully — `session.customTitle` will be `undefined` and the fallback to `title` applies automatically.

---

## Computed Display Values (No Stored State)

The following are computed/derived values used in the UI. They are not stored entities but are documented here to clarify data flow for each enhancement.

### Connection Details Display (ConnectionsList)

**Current computation**: `{{ connection.host }}:{{ connection.port }}/{{ connection.database }}`  
**New computation**: `{{ connection.host }}:{{ connection.database || '' }}`  
**Source fields**: `Connection.host`, `Connection.database` (existing stored in managementConnectionStore)  
**Tooltip**: Retains full `host:port/database` format for completeness

### Thread Display Title (AgentWorkspace / ManagementAgentHistoryTree)

**Current computation**: `history.title` (direct field)  
**New computation**: `getDisplayTitle(history)` → `history.customTitle?.trim() || history.title`

### SpaceDisplay → CodeMirror Font Size Mapping

**Source**: `appConfigStore.spaceDisplay` (existing `SpaceDisplay` enum: `Compact | Default | Spacious`)  
**Mapping** (new — additive to `useSpaceDisplay.ts`):

```typescript
export function getSpaceDisplayEditorFontSize(value: SpaceDisplay): string {
  if (value === SpaceDisplay.Compact) return '12px';
  if (value === SpaceDisplay.Spacious) return '16px';
  return '14px'; // Default
}
```

This is a new exported helper alongside the existing `getSpaceDisplayFontSize`.

---

## State Transitions: Thread Rename

```
Thread in list (shows title or customTitle)
        │
        ▼ user triggers rename (double-click or context menu)
Editing state (inline <Input> pre-filled with current display title)
        │
        ├──► [user types + confirms (Enter or blur)]
        │         │
        │         ├─ value.trim() !== '' → renameThread(id, value.trim())
        │         │                        → session.customTitle = value.trim()
        │         │                        → saved to localStorage via useStorage
        │         │                        → display reverts to read mode
        │         │
        │         └─ value.trim() === '' → discard change, stay in read mode with old title
        │
        └──► [user cancels (Escape)]
                  └─ discard change, revert to read mode, no write
```

---

## State Transitions: Result Panel Toggle (Command+J)

```
RawQuery.vue: showResultPanel = ref(true)  ← initial state: panel visible

[Command+J fires in raw query view context]
        │
        ▼
showResultPanel.value = !showResultPanel.value
        │
        ├─ true  → RawQueryLayout renders editor + result panel
        └─ false → RawQueryLayout renders editor only (result panel: v-show="false" or height=0)

[Panel re-opens] when:
  - Command+J pressed again
  - A query finishes executing (auto-expand option — out of scope for this feature)
```

---

## No New Server-Side Entities

All data in this feature batch is:

- **Client local only** (`AgentHistorySession` in `useStorage` → localStorage)
- **Derived from existing server data** (connection fields from managementConnectionStore)
- **Ephemeral UI state** (showResultPanel, showPassword, isRenaming)

No new API endpoints, database tables, or server-side models are introduced.
