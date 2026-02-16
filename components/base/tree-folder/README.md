# High-Performance Tree Folder Component

A blazingly fast VS Code-style file tree component for Vue 3, capable of rendering 50,000+ nodes without lag.

## ✨ Features

- **🚀 Maximum Performance**: Virtualized rendering with `@tanstack/vue-virtual`
- **🎯 Smart Architecture**: Flat map pattern (no recursive components)
- **🎨 Fully Customizable**: CSS variable-based theming (Headless UI pattern)
- **🖱️ Rich Interactions**: Drag & drop with auto-expand, multi-select, keyboard navigation
- **⌨️ Keyboard Auto-Scroll**: Arrow key navigation automatically scrolls to keep focused item visible
- **🔍 Focus Feature**: Programmatically focus and jump to any item with `focusItem()` API
- **📦 NPM Ready**: Static CSS classes, framework-agnostic styling
- **🔄 Smart Auto-Expand**: Folders automatically expand when hovering during drag (500ms)
- **💾 State Persistence**: Automatic save/restore of expansion state
- **🧩 Pluggable Persistence**: Optional extension pattern for web, Electron, and API sync
- **♿ Accessible**: Keyboard navigation and ARIA support
- **🌓 Dark Mode**: Built-in dark mode support via CSS variables
- **⚡ Optimized**: `shallowRef`, `v-memo`, CSS containment

## 📦 Installation

Required dependencies:

```bash
npm install @tanstack/vue-virtual lucide-vue-next
```

## 🎨 Theming & Customization

The component uses **CSS variables** for complete theming control. See [CUSTOMIZATION.md](./docs/CUSTOMIZATION.md) for full documentation.

For persistence architecture and adapter usage, see [docs/PERSISTENCE_EXTENSION.md](./docs/PERSISTENCE_EXTENSION.md).

### Quick Theme Example

```vue
<template>
  <div class="custom-tree">
    <FileTree :initialData="treeData" />
  </div>
</template>

<style>
.custom-tree {
  /* Override CSS variables for custom theme */
  --v-tree-row-selected-bg: rgba(34, 197, 94, 0.2);
  --v-tree-indicator-color: #22c55e;
  --v-tree-drag-preview-bg: linear-gradient(to bottom right, #22c55e, #16a34a);
}
</style>
```

### Available CSS Variables

- `--v-tree-row-hover-bg` - Row hover background
- `--v-tree-row-selected-bg` - Selected row background
- `--v-tree-indicator-color` - Drag drop indicator color
- `--v-tree-drag-preview-bg` - Drag preview background
- And many more... see [CUSTOMIZATION.md](./docs/CUSTOMIZATION.md)

## 🎯 Quick Start

```vue
<script setup lang="ts">
import { FileTree } from '@/components/base/tree-folder';
import type { FileNode } from '@/components/base/tree-folder';

const treeData: Record<string, FileNode> = {
  root: {
    id: 'root',
    parentId: null,
    name: 'My Project',
    type: 'folder',
    depth: 0,
    children: ['file1', 'folder1'],
  },
  file1: {
    id: 'file1',
    parentId: 'root',
    name: 'README.md',
    type: 'file',
    depth: 1,
  },
  folder1: {
    id: 'folder1',
    parentId: 'root',
    name: 'src',
    type: 'folder',
    depth: 1,
    children: ['file2'],
  },
  file2: {
    id: 'file2',
    parentId: 'folder1',
    name: 'index.ts',
    type: 'file',
    depth: 2,
  },
};

const handleMove = (sourceId: string, targetId: string, position: string) => {
  console.log('Move:', { sourceId, targetId, position });
  // Implement your move logic here
};

const handleSelect = (nodeIds: string[]) => {
  console.log('Selected:', nodeIds);
};
</script>

<template>
  <FileTree
    :initial-data="treeData"
    storage-key="my_tree"
    @move="handleMove"
    @select="handleSelect"
  />
</template>
```

## 🧪 Testing Performance & Behavior

Use the included demo component to test performance with large datasets:

```vue
<script setup lang="ts">
import { TreeDemo } from '@/components/base/tree-folder';
</script>

<template>
  <TreeDemo />
</template>
```

### Demo Features

- **Dataset Sizes**: Test with 1K, 5K, 10K, or 50K nodes
- **Performance Metrics**: Real-time generation and render times
- **Live Statistics**: Node counts, selection info
- **Action Log**: Track drag & drop operations
- **Full Feature Testing**:
  - Single/multi/range selection
  - Keyboard navigation
  - Drag & drop with auto-expand
  - Expand/collapse operations

## 📖 API Reference

### FileTree Component

#### Props

| Prop                   | Type                       | Default               | Description                           |
| ---------------------- | -------------------------- | --------------------- | ------------------------------------- |
| `initialData`          | `Record<string, FileNode>` | `{}`                  | Tree node data in flat map format     |
| `storageKey`           | `string`                   | `'vscode_tree_state'` | LocalStorage key for persistence      |
| `persistenceExtension` | `TreePersistenceExtension` | `undefined`           | Custom persistence adapter strategy   |
| `allowSort`            | `boolean`                  | `false`               | Allow reordering items (siblings)     |
| `allowDragAndDrop`     | `boolean`                  | `true`                | Enable/Disable drag & drop entirely   |
| `itemHeight`           | `number`                   | `24`                  | Height of each row in pixels          |
| `indentSize`           | `number`                   | `20`                  | Indentation per depth level in pixels |
| `baseIndent`           | `number`                   | `8`                   | Base indentation in pixels            |
| `autoExpandDelay`      | `number`                   | `100`                 | MS to hover before folder expands     |
| `autoScrollThreshold`  | `number`                   | `50`                  | Distance from edge to trigger scroll  |
| `autoScrollSpeed`      | `number`                   | `10`                  | Pixels to scroll per frame            |
| `overscan`             | `number`                   | `10`                  | Extra items to render off-screen      |

#### Events

| Event    | Payload                                                                         | Description                    |
| -------- | ------------------------------------------------------------------------------- | ------------------------------ |
| `move`   | `(nodeId: string, targetId: string, position: 'before' \| 'after' \| 'inside')` | Emitted when a node is dropped |
| `select` | `(nodeIds: string[])`                                                           | Emitted when selection changes |

#### Exposed Methods

| Method                      | Description                               |
| --------------------------- | ----------------------------------------- |
| `expandAll()`               | Expand all folder nodes                   |
| `collapseAll()`             | Collapse all folder nodes                 |
| `focusItem(nodeId: string)` | Focus and scroll to a specific item by ID |

### FileNode Type

```typescript
interface FileNode {
  id: string; // Unique identifier
  parentId: string | null; // Parent node ID (null for root)
  name: string; // Display name
  type: 'file' | 'folder'; // Node type
  depth: number; // Nesting level (0 = root)
  children?: string[]; // Child node IDs (for folders)
}
```

## ⌨️ Keyboard Shortcuts

| Key                | Action                                                       |
| ------------------ | ------------------------------------------------------------ |
| `↑` / `↓`          | Navigate up/down (auto-scrolls to keep focused item visible) |
| `→`                | Expand folder or move to first child                         |
| `←`                | Collapse folder or move to parent                            |
| `Enter` / `Space`  | Toggle folder expansion                                      |
| `Ctrl/Cmd + Click` | Toggle multi-select                                          |
| `Shift + Click`    | Range select                                                 |

## 🎨 Drag & Drop Behavior

### Drop Positions

- **Top 20%**: Drop **before** target (sibling)
- **Middle 60%**: Drop **inside** folder
- **Bottom 20%**: Drop **after** target (sibling)

### Auto-Expand

Hover over **any part** of a closed folder while dragging for **500ms** to auto-expand it. This enables deep nesting in a single drag operation.

**Note**: Folders expand on hover regardless of where you're hovering (top, middle, or bottom of the row), making it easy to navigate through nested folders during drag operations.

### Auto-Scroll

When dragging items, the tree automatically scrolls when you move near the top or bottom edges:

- **Scroll Zone**: 50px from top/bottom edges
- **Scroll Speed**: Smooth 60fps scrolling
- **Smart Detection**: Only scrolls when actively dragging

This makes it easy to navigate through long folder hierarchies while dragging items.

## 🚀 Performance Tips

1. **Data Structure**: Always use the flat map pattern (seen above). Never nest node objects.
2. **Large Datasets**: For 50K+ nodes, ensure your backend paginates data fetching if possible.
3. **State Persistence**: The component auto-saves expansion state. For large trees, consider server-side persistence.
4. **Memory**: The component uses `shallowRef` for optimal memory usage with large datasets.

## 📊 Performance Benchmarks

Tested on M1 MacBook Pro:

| Nodes  | Generation | Render | Smooth Scrolling |
| ------ | ---------- | ------ | ---------------- |
| 1,000  | ~5ms       | ~15ms  | ✅ Yes           |
| 5,000  | ~20ms      | ~30ms  | ✅ Yes           |
| 10,000 | ~40ms      | ~50ms  | ✅ Yes           |
| 50,000 | ~200ms     | ~150ms | ✅ Yes           |

## 🏗️ Architecture

### Why Flat Map Instead of Recursive?

Recursive components (`<TreeNode>` calling `<TreeNode>`) create thousands of Vue component instances at scale, killing performance.

**Our approach:**

1. Store nodes in a flat `Record<id, node>` structure
2. Use a `computed` property to flatten the tree based on expansion state
3. Virtualize the flattened list
4. Result: Only ~10-20 DOM elements rendered at any time, regardless of tree size

### Components

- **FileTree.vue**: Smart container with all business logic
- **TreeRow.vue**: Dumb presentational component (optimized with `v-memo`)
- **types.ts**: TypeScript interfaces
- **TreeDemo.vue**: Performance test harness

## 🐛 Troubleshooting

### Scrolling is laggy

- Ensure you're using `shallowRef` for the nodes data
- Check that `v-memo` is working (inspect with Vue DevTools)
- Verify CSS containment is applied

### Drag & drop not working

- Ensure parent container doesn't have `pointer-events: none`
- Check browser console for errors
- Verify node IDs are unique

### State not persisting

- Check if `localStorage` is available
- Verify `storageKey` prop is set correctly
- Check browser console for JSON parse errors

## 📝 License

MIT

## Additional Documentation

- **[Documentation Index](./docs/README.md)** - All tree-folder docs in one place
- **[V2 Summary](./docs/V2_SUMMARY.md)** - Latest features: keyboard auto-scroll and focus
- **[Visual Guide](./docs/VISUAL_GUIDE.md)** - Visual examples of drag and drop behaviors
- **[Enhancements](./docs/ENHANCEMENTS.md)** - Detailed technical documentation of improvements
- **[Examples](./docs/EXAMPLES.md)** - Real-world usage examples and patterns
- **[Test Guide](./docs/TEST_GUIDE.md)** - Comprehensive testing instructions

## Credits

Built following the specifications in [guild.md](./docs/guild.md), based on VS Code's file explorer architecture.
