# Building a VS Code Tree in Vue 3

This document serves as both a **Business Analysis (BA) Definition** and a **Technical Build Guide** for porting the File Tree component to Vue 3.

---

# Part 1: BA Definition (Requirements)

## 1.1 Core Concept

A high-performance file explorer capable of rendering 10,000+ items without UI lag. It must support complex interactions like multi-selection, keyboard navigation, and deep drag-and-drop operations.

## 1.2 User Stories & Acceptance Criteria

### US-01: Viewing Data

- **AC1:** User sees a hierarchical list of files and folders.
- **AC2:** Indentation reflects nesting depth (usually 20px per level).
- **AC3:** Icons differentiate Files vs Folders vs Open Folders.

### US-02: Expansion Management

- **AC1:** Clicking the "chevron" icon toggles folder expansion.
- **AC2:** Double-clicking a folder row toggles expansion.
- **AC3:** State must be preserved when scrolling items out of view.

### US-03: Selection Model

- **AC1:** **Single Select:** Click selects one, deselects others.
- **AC2:** **Multi-Select:** `Ctrl` (or `Cmd`) + Click toggles item selection.
- **AC3:** **Range Select:** `Shift` + Click selects all items between the last focused item and the current click.

### US-04: Drag and Drop (Complex)

- **AC1 (Reorder):** Dragging to the top/bottom edge of a row shows a line. Dropping places the item _next to_ the target (sibling).
- **AC2 (Nesting):** Dragging to the center of a folder highlights it. Dropping places the item _inside_ the folder.
- **AC3 (Auto-Expand):** **CRITICAL:** If user drags a file over a closed folder and hovers for > 500ms, the folder must automatically expand. This allows dragging a file into a sub-sub-folder in one go.

### US-05: Virtualization

- **AC1:** The DOM must only contain elements visible in the viewport (+ buffer).
- **AC2:** Scrolling must be smooth at 60fps even with 50,000 nodes.

### US-06: Persistence & Initialization

- **AC1 (Hydration):** On page load, the tree must display data fetched from an API/Prop, not hardcoded mocks.
- **AC2 (State Recovery):** The folders that were open in the last session must remain open on reload.
- **AC3 (Optimistic Updates):** Drag/Drop actions must update the UI instantly, then sync to server.

---

# Part 2: Technical Build Guide (Vue 3)

## 2.1 Technology Stack

- **Core:** Vue 3.x (Composition API, `<script setup>`)
- **Virtualization:** `@tanstack/vue-virtual` https://tanstack.com/virtual/latest/docs/introduction
- **Icons:** `lucide-vue-next`
- **Utils:** `@vueuse/core` (Recommended for keyboard/event handling), pragmatic-drag-and-drop
  Public for drag-and-drop logic if needed. https://github.com/atlassian/pragmatic-drag-and-drop

## 2.2 Data Architecture: "The Flat Map" pattern

Do **not** use recursive components. Recursive components kill performance at scale because Vue has to instantiate thousands of component instances.

**The State Model:**

```typescript
interface FileNode {
  id: string;
  parentId: string | null;
  name: string;
  type: 'file' | 'folder';
  depth: number;
}

// Store as a Map for O(1) lookup
const nodes = ref<Record<string, FileNode>>({});

// Store expansion state
const expandedIds = ref(new Set<string>());
```

## 2.3 The Flattening Logic (Computed)

We need a `computed` property that transforms the Tree into a List for the virtualizer.

```typescript
const visibleNodeIds = computed(() => {
  const result: string[] = [];

  // Recursive function that only pushes children if parent is expanded
  const traverse = (ids: string[]) => {
    for (const id of ids) {
      result.push(id);
      const node = nodes.value[id];
      if (node.children && expandedIds.value.has(id)) {
        traverse(node.children);
      }
    }
  };

  traverse(rootIds.value);
  return result;
});
```

## 2.4 Component Architecture

### `TreeRow.vue` (Dumb Component)

Renders a single row. It should not contain business logic.

- **Props:** `node`, `depth`, `isSelected`, `isExpanded`, `isDraggingOver`.
- **Emits:** `click`, `toggle`, `dragStart`, `dragOver`, `drop`.
- **Performance:** Use `v-memo="[node, isSelected, isExpanded]"` to prevent re-renders of static rows.

### `FileTree.vue` (Smart Container)

Handles all logic and the virtualizer.

#### Setup Virtualizer

```typescript
import { useVirtualizer } from '@tanstack/vue-virtual';

const parentRef = ref(null);

const rowVirtualizer = useVirtualizer({
  count: visibleNodeIds.value.length,
  getScrollElement: () => parentRef.value,
  estimateSize: () => 24, // VS Code row height
  overscan: 5,
});
```

#### Implementing Auto-Expand (The "BA" Requirement)

You need a `ref` to hold the timer because `dragOver` fires continuously.

```typescript
const autoExpandTimer = ref<any>(null);
const lastHoverId = ref<string | null>(null);

const onDragOver = (e: DragEvent, nodeId: string) => {
  e.preventDefault(); // Allow dropping

  if (nodeId !== lastHoverId.value) {
    // Target changed, reset timer
    clearTimeout(autoExpandTimer.value);
    lastHoverId.value = nodeId;

    // If it's a closed folder, schedule expansion
    const node = nodes.value[nodeId];
    if (node.type === 'folder' && !expandedIds.value.has(nodeId)) {
      autoExpandTimer.value = setTimeout(() => {
        expandedIds.value.add(nodeId); // Reactivity updates UI
      }, 600);
    }
  }
};
```

## 2.5 Keyboard Accessibility Implementation

Vue's `@keydown` handler on the container `div` (with `tabindex="0"`) is the best place for this.

```typescript
const onKeyDown = (e: KeyboardEvent) => {
  const currentId = focusedId.value;
  if (!currentId) return;

  switch (e.key) {
    case 'ArrowDown':
      // Calculate next index in visibleNodeIds
      break;
    case 'ArrowRight':
      if (isFolder(currentId) && !isOpen(currentId)) {
        expand(currentId);
      } else {
        focusNext(currentId);
      }
      break;
    // ... implement full spec
  }
};
```

## 2.6 Critical Performance Checklist

1.  **Use `shallowRef` for `nodes`**: If you have 50k nodes, `ref()` will make every property reactive (slow). `shallowRef()` only tracks reference changes.
2.  **`v-memo`**: Essential for rows.
3.  **CSS Containment**: Add `contain: strict` or `content-visibility: auto` to the scrolling container for browser-level optimizations.

## 2.7 Data Persistence & Hydration (Implementation)

To make this production-ready, implement initialization and state saving.

### 1. Hydration (Loading Data)

Do not populate data in `setup()`. Use `onMounted` or a prop watcher.

```typescript
// Define props for initial data
const props = defineProps<{
  initialData?: Record<string, FileNode>;
}>();

onMounted(async () => {
  // 1. Load Nodes
  if (props.initialData) {
    nodes.value = props.initialData;
  } else {
    // Or fetch from API
    nodes.value = await fetch('/api/filesystem').then(r => r.json());
  }

  // 2. Load Expansion State from LocalStorage
  const savedState = localStorage.getItem('vscode_tree_expanded');
  if (savedState) {
    try {
      const ids = JSON.parse(savedState);
      expandedIds.value = new Set(ids);
    } catch (e) {
      console.error('Failed to load state', e);
    }
  }
});
```

### 2. Persisting Expansion State

Use `watch` to automatically save whenever the set changes.

```typescript
// Deep watch is not needed if we replace the Set, but if we mutate it, we need deep.
// Better practice: create a computed for serialization to avoid deep watching a Set.
watch(
  () => [...expandedIds.value],
  newVal => {
    localStorage.setItem('vscode_tree_expanded', JSON.stringify(newVal));
  }
);
```

### 3. Persisting Structure Changes

For structural changes (Drag & Drop), call your API inside the event handler.

```typescript
const handleDrop = async (e: DragEvent, targetId: string) => {
  // 1. Optimistic Update (Update local `nodes.value` immediately)
  moveNodeLocally(draggedId, targetId);

  // 2. Sync to Backend
  try {
    await api.moveFile({ id: draggedId, parentId: targetId });
  } catch (err) {
    // 3. Rollback on failure
    undoMoveNodeLocally(draggedId, oldParentId);
    showError('Failed to move file');
  }
};
```
