# Drag & Drop Analysis: Current vs Pragmatic Drag and Drop

## Current Implementation Issues

### 1. **`allowSort` Logic Bug**

The `allowSort` property is not working correctly due to flawed logic in the drop handling:

**Problem in `calculateDropPosition()` (lines 201-218):**

```typescript
if (!props.allowSort) {
  if (node.type === 'folder') {
    return 'inside';
  } else {
    // Files cannot be dropped on other files when sort is disabled
    // Return 'after' but the drop will be prevented in handleDrop
    return 'after';
  }
}
```

**Problem in `handleDrop()` (lines 277-297):**

```typescript
if (!props.allowSort) {
  if (position !== 'inside' || targetNode.type !== 'folder') {
    console.warn('Sorting disabled: Can only move items inside folders');
    handleDragEnd();
    return;
  }
}
```

**Issues:**

1. **Files as drop targets**: When `allowSort=false`, you can't drop on files at all, even to move into the file's parent folder
2. **Visual feedback misleading**: Shows 'after' indicator on files, but then rejects the drop
3. **Inconsistent UX**: Users see a drop indicator but the drop is rejected
4. **Limited functionality**: Can only drop directly on folders, not between items to reorder within a folder

**What SHOULD happen when `allowSort=false`:**

- ✅ Allow: Moving items **into** folders
- ❌ Prevent: Reordering items (before/after positions)
- ✅ Allow: Dropping on files to move into their parent folder
- ❌ Current behavior: Only allows dropping directly on folders

---

## Current Native DnD Implementation

### Architecture

- Uses native HTML5 Drag and Drop API
- Manual event handling: `dragstart`, `dragover`, `drop`, `dragend`
- Custom drop position calculation based on mouse Y coordinate
- Manual auto-expand with `setTimeout` (500ms)
- Manual auto-scroll with `setInterval` (60fps)
- Manual state management for drag indicators

### Pros

✅ No external dependencies (except @tanstack/vue-virtual)  
✅ Full control over behavior  
✅ Works with virtualization  
✅ Currently functional (mostly)

### Cons

❌ Complex manual state management  
❌ Browser quirks and inconsistencies  
❌ Bug-prone (e.g., `allowSort` logic issue)  
❌ Extensive manual testing needed for edge cases  
❌ More maintenance burden  
❌ Accessibility requires manual implementation  
❌ Drop zone calculation is brittle (hardcoded 20/60/20 percentages)  
❌ Event handler complexity (100+ lines just for drag/drop)

### Code Complexity Metrics

- **Drag/Drop Logic**: ~220 lines (lines 130-350)
- **State Variables**: 7 refs for drag state
- **Event Handlers**: 7 handlers
- **Manual Timers**: 2 (auto-expand, auto-scroll)

---

## Pragmatic Drag and Drop

### What is it?

- **Official**: Created by Atlassian, powers Trello, Jira, Confluence
- **Size**: ~4.7KB core package
- **Framework**: Agnostic (works with React, Vue, Svelte, Angular, vanilla JS)
- **Purpose**: Safe, performant wrapper over native browser drag & drop

### Key Features

1. **Low-level toolchain**: Provides building blocks, not opinionated components
2. **Adapters**: Element adapter, external adapter (files, cross-iframe)
3. **Headless**: You control all rendering and styling
4. **Virtual support**: Works with @tanstack/virtual (like your current setup)
5. **Tree/Hierarchy support**: Has tree examples with before/after/inside logic
6. **Cross-platform**: Works in Firefox, Chrome, Safari, iOS, Android
7. **Battle-tested**: Used by millions of users in Atlassian products

### Tree Example

They provide a tree example showing:

- Hierarchical drag-drop
- Before/after/inside positions
- Proper drop indicators
- Visual feedback

### Installation

```bash
npm install @atlaskit/pragmatic-drag-and-drop
```

### Core Concepts

```typescript
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';

// Make element draggable
draggable({
  element: myElement,
  getInitialData: () => ({ nodeId: 'foo', type: 'file' }),
});

// Make element a drop target
dropTargetForElements({
  element: myElement,
  onDragEnter: args => {
    /* ... */
  },
  onDrop: args => {
    /* ... */
  },
  getData: () => ({ nodeId: 'bar' }),
});
```

### Benefits Over Current Implementation

✅ **Simpler API**: No manual dragstart/dragover/drop event wiring  
✅ **Safer**: Handles browser quirks and edge cases  
✅ **Tested**: Battle-tested in production at massive scale  
✅ **Maintainable**: Less code to maintain  
✅ **Consistent**: Same API patterns across different use cases  
✅ **Documented**: Extensive docs and examples  
✅ **Accessibility**: Guidelines and helpers provided  
✅ **Cross-iframe**: Built-in support for dragging across iframes  
✅ **File drops**: External adapter for OS file drops

### Potential Cons

❌ Additional dependency (~4.7KB)  
❌ Refactoring effort required  
❌ Learning curve for new API  
❌ Published under @atlaskit namespace (Atlassian's ecosystem)

---

## Comparison Table

| Feature               | Current (Native DnD)  | Pragmatic DnD            |
| --------------------- | --------------------- | ------------------------ |
| **Bundle Size**       | 0 KB (native)         | ~4.7 KB                  |
| **Browser Quirks**    | Manual handling       | Abstracted               |
| **Tree Support**      | Custom implementation | Official example         |
| **Virtual Scrolling** | ✅ Works              | ✅ Works                 |
| **Auto-expand**       | Manual timer          | Can use same pattern     |
| **Auto-scroll**       | Manual interval       | Can use same pattern     |
| **Drop Position**     | Manual calculation    | Helper utilities         |
| **Cross-iframe**      | Need custom impl      | Built-in                 |
| **File drops**        | Need custom impl      | External adapter         |
| **Accessibility**     | Manual impl needed    | Guidelines provided      |
| **Production Usage**  | Your app              | Trello, Jira, Confluence |
| **Maintenance**       | You maintain          | Atlassian maintains      |
| **Bug Fixes**         | You fix               | Community fixes          |

---

## Recommendations

### Option 1: Fix Current Implementation (Quick Fix)

**Time**: 1-2 hours  
**Effort**: Low  
**Risk**: Low

**Fix `allowSort` logic:**

```typescript
const calculateDropPosition = (
  event: DragEvent,
  nodeId: string
): 'before' | 'after' | 'inside' => {
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const y = event.clientY - rect.top;
  const height = rect.height;
  const node = nodes.value[nodeId];

  // If sorting is disabled
  if (!props.allowSort) {
    // Only allow 'inside' position, and only for folders
    // Files will be handled by dropping into their parent folder
    return 'inside';
  }

  // If sorting is enabled, calculate position based on mouse
  // If it's a folder and mouse is in middle 60%, drop inside
  if (node.type === 'folder' && y > height * 0.2 && y < height * 0.8) {
    return 'inside';
  }

  // Otherwise, drop before/after
  return y < height / 2 ? 'before' : 'after';
};

const handleDrop = (event: DragEvent, targetId: string) => {
  event.preventDefault();
  clearTimeout(autoExpandTimer.value);

  if (!draggedId.value || !dropIndicator.value) {
    handleDragEnd();
    return;
  }

  const sourceId = draggedId.value;
  const position = dropIndicator.value.position;
  const targetNode = nodes.value[targetId];

  // When sorting is disabled
  if (!props.allowSort) {
    // Only allow 'inside' drops
    if (position !== 'inside') {
      console.warn('Sorting disabled: Can only move items inside folders');
      handleDragEnd();
      return;
    }

    // If target is a file, move into the parent folder instead
    if (targetNode.type === 'file') {
      if (targetNode.parentId) {
        emit('move', sourceId, targetNode.parentId, 'inside');
      } else {
        console.warn('Cannot drop: target file has no parent');
      }
      handleDragEnd();
      return;
    }

    // Target is a folder, allow drop inside
    emit('move', sourceId, targetId, 'inside');
  } else {
    // Sorting enabled - allow all positions
    emit('move', sourceId, targetId, position);
  }

  handleDragEnd();
};
```

**Pros:**

- Quick fix
- Minimal code changes
- No new dependencies
- Low risk

**Cons:**

- Still maintains complex manual implementation
- Future bugs may occur
- No improvement in maintainability

---

### Option 2: Migrate to Pragmatic Drag and Drop (Recommended)

**Time**: 1-2 days  
**Effort**: Medium  
**Risk**: Medium  
**Long-term Value**: High

**Why Migrate:**

1. **Better Maintainability**: Less code, clearer abstractions
2. **Proven Solution**: Battle-tested at Atlassian scale
3. **Future-proof**: Community-maintained, regular updates
4. **Cleaner Code**: Simpler, more declarative API
5. **Better DX**: Easier to reason about and debug

**Migration Steps:**

1. **Install Dependencies**

```bash
npm install @atlaskit/pragmatic-drag-and-drop
```

2. **Adapt FileTree.vue**

- Replace native drag event handlers with pragmatic-dnd adapters
- Use `draggable()` for tree rows
- Use `dropTargetForElements()` for drop zones
- Keep virtualization setup intact
- Keep auto-expand/scroll logic (can be improved later)

3. **Adapt TreeRow.vue**

- Remove native `draggable` attribute
- Use `draggable()` adapter in script setup
- Use `dropTargetForElements()` adapter
- Keep visual indicators

4. **Testing**

- Test with 1K, 5K, 10K, 50K nodes
- Test `allowSort` true/false modes
- Test keyboard navigation (unchanged)
- Test auto-expand (unchanged)
- Test auto-scroll (unchanged)

**Example Refactor (TreeRow.vue):**

```vue
<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import {
  draggable,
  dropTargetForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';

const rowRef = ref<HTMLElement | null>(null);

onMounted(() => {
  if (!rowRef.value) return;

  // Make row draggable
  const cleanup1 = draggable({
    element: rowRef.value,
    getInitialData: () => ({
      type: 'tree-node',
      nodeId: props.node.id,
      node: props.node,
    }),
  });

  // Make row a drop target
  const cleanup2 = dropTargetForElements({
    element: rowRef.value,
    getData: () => ({ nodeId: props.node.id }),
    onDragEnter: () => emit('dragover', event),
    onDrop: args => {
      // Calculate position based on args.location
      emit('drop', event);
    },
  });

  // Cleanup on unmount
  onUnmounted(() => {
    cleanup1();
    cleanup2();
  });
});
</script>

<template>
  <div ref="rowRef" ...>
    <!-- content -->
  </div>
</template>
```

**Pros:**

- Cleaner, more maintainable code
- Proven, battle-tested solution
- Community support and updates
- Better long-term investment
- Easier to add new features (e.g., cross-iframe drag)

**Cons:**

- Refactoring effort (1-2 days)
- New dependency (4.7KB)
- Team learning curve
- Need thorough testing

---

## Final Recommendation

### For Immediate Fix (Today)

→ **Option 1**: Fix the `allowSort` bug with the code changes above

### For Long-term Health (This Sprint/Month)

→ **Option 2**: Migrate to Pragmatic Drag and Drop

**Reasoning:**

1. The current implementation has bugs and is complex
2. Pragmatic DnD is used by Trello/Jira (proof of scalability)
3. 4.7KB is negligible for the benefits gained
4. Future features (file drops, cross-iframe) would be easier
5. Less maintenance burden on your team
6. Better developer experience

**Suggested Approach:**

1. **Week 1**: Fix `allowSort` bug (Option 1) for immediate stability
2. **Week 2-3**: Create a spike/POC with Pragmatic DnD on a feature branch
3. **Week 4**: Compare implementations, make decision
4. **Week 5+**: Gradual rollout with feature flag if migrating

---

## Additional Resources

- **Pragmatic DnD Docs**: https://atlassian.design/components/pragmatic-drag-and-drop
- **Tree Example**: https://atlassian.design/components/pragmatic-drag-and-drop/examples#tree
- **GitHub Repo**: https://github.com/atlassian/pragmatic-drag-and-drop
- **Tutorial**: https://atlassian.design/components/pragmatic-drag-and-drop/tutorial
- **Virtual Scrolling Example**: https://atlassian.design/components/pragmatic-drag-and-drop/examples#virtual

---

## Decision Matrix

| Criteria             | Current (Fixed) | Pragmatic DnD | Winner            |
| -------------------- | --------------- | ------------- | ----------------- |
| Time to Implement    | 2 hours         | 2 days        | Current           |
| Code Maintainability | Low             | High          | Pragmatic         |
| Bug Risk             | Medium          | Low           | Pragmatic         |
| Future Features      | Hard            | Easy          | Pragmatic         |
| Performance          | Good            | Excellent     | Pragmatic         |
| Team Learning        | None            | Some          | Current           |
| Long-term Cost       | High            | Low           | Pragmatic         |
| Bundle Size          | 0kb             | 4.7kb         | Current           |
| **Overall**          | -               | -             | **Pragmatic DnD** |

**Verdict**: Pragmatic Drag and Drop is the better long-term choice. Use Option 1 as a stopgap if you need an immediate fix.
