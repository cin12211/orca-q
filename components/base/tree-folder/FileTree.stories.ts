import { ref, computed } from 'vue';
import type { Meta, StoryObj } from '@storybook/vue3';
import {
  Edit2,
  Trash2,
  Share2,
  Copy,
  FolderPlus,
  FilePlus,
} from 'lucide-vue-next';
import FileTree from './FileTree.vue';
import type { FileNode } from './types';

// ============================================================================
// Helper: Generate Test Data
// ============================================================================
const generateTestData = (nodeCount: number): Record<string, FileNode> => {
  const nodes: Record<string, FileNode> = {};
  let currentId = 1;

  // Create root folder
  nodes['root'] = {
    id: 'root',
    parentId: null,
    name: 'Project Root',
    type: 'folder',
    depth: 0,
    children: [],
  };

  // Helper to generate a folder with children
  const generateFolder = (
    parentId: string,
    depth: number,
    remainingNodes: number,
    name: string
  ): number => {
    if (remainingNodes <= 0) return 0;

    const folderId = `folder-${currentId++}`;
    const parent = nodes[parentId];

    nodes[folderId] = {
      id: folderId,
      parentId,
      name,
      type: 'folder',
      depth,
      children: [],
    };

    if (parent?.children) {
      parent.children.push(folderId);
    }

    let consumed = 1;
    remainingNodes--;

    const childCount = Math.min(
      Math.floor(Math.random() * 3) + 2,
      remainingNodes
    );

    for (let i = 0; i < childCount && remainingNodes > 0; i++) {
      if (Math.random() > 0.3 && depth < 4) {
        const fileId = `file-${currentId++}`;
        nodes[fileId] = {
          id: fileId,
          parentId: folderId,
          name: `file-${i}.ts`,
          type: 'file',
          depth: depth + 1,
        };
        if (nodes[folderId].children) {
          nodes[folderId].children.push(fileId);
        }
        consumed++;
        remainingNodes--;
      } else if (depth < 4) {
        const nestedConsumed = generateFolder(
          folderId,
          depth + 1,
          Math.min(remainingNodes, 5),
          `nested-${i}`
        );
        consumed += nestedConsumed;
        remainingNodes -= nestedConsumed;
      }
    }
    return consumed;
  };

  let remaining = nodeCount - 1;
  let folderIdx = 0;

  while (remaining > 0) {
    const consumed = generateFolder(
      'root',
      1,
      Math.min(remaining, 10),
      `Module-${folderIdx++}`
    );
    remaining -= consumed;
  }

  return nodes;
};

// Default test data
const defaultData = generateTestData(50);

// ============================================================================
// Meta Configuration
// ============================================================================
const meta = {
  title: 'Base/TreeFolder/FileTree',
  component: FileTree,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
# FileTree Component

A **high-performance VS Code-style file tree** for Vue 3, capable of rendering **50,000+ nodes** without lag.

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🚀 **Virtualized Rendering** | Uses \`@tanstack/vue-virtual\` for smooth 60fps scrolling |
| 🎯 **Flat Map Architecture** | No recursive components = maximum performance |
| 🎨 **CSS Variable Theming** | Fully customizable via CSS variables |
| 🖱️ **Rich Interactions** | Drag & drop, multi-select, keyboard navigation |
| 💾 **State Persistence** | Auto-saves expansion state to localStorage |
| ♿ **Accessible** | Full keyboard support and ARIA compliance |

## 📦 Quick Start

\`\`\`vue
<script setup>
import { FileTree } from '@/components/base/tree-folder';

const treeData = {
  root: { id: 'root', parentId: null, name: 'Root', type: 'folder', depth: 0, children: ['file1'] },
  file1: { id: 'file1', parentId: 'root', name: 'index.ts', type: 'file', depth: 1 }
};
</script>

<template>
  <FileTree :initial-data="treeData" @select="handleSelect" />
</template>
\`\`\`

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| \`↑\` / \`↓\` | Navigate up/down (auto-scrolls) |
| \`→\` | Expand folder or move to first child |
| \`←\` | Collapse folder or move to parent |
| \`Enter\` / \`Space\` | Toggle folder expansion |
| \`Ctrl/Cmd + Click\` | Multi-select toggle |
| \`Shift + Click\` | Range select |

## 🎨 CSS Variables Reference

### 1. Colors

| Variable | Description |
|---|---|
| \`--v-tree-bg\` | Tree container background |
| \`--v-tree-text\` | Default text color |
| \`--v-tree-scrollbar-thumb\` | Scrollbar thumb color |
| \`--v-tree-scrollbar-thumb-hover\` | Scrollbar thumb hover color |
| \`--v-tree-scrollbar-track\` | Scrollbar track color |
| \`--v-tree-row-hover-bg\` | Row background on hover |
| \`--v-tree-row-selected-bg\` | Selected row background |
| \`--v-tree-row-selected-hover-bg\` | Selected row hover background |
| \`--v-tree-row-focus-ring\` | Focus ring color |
| \`--v-tree-row-text-color\` | Row text color |
| \`--v-tree-indicator-color\` | Drop indicator line color |
| \`--v-tree-drop-inside-bg\` | Background when dropping inside folder |
| \`--v-tree-chevron-hover-bg\` | Chevron button hover background |
| \`--v-tree-input-bg\` | Input background |
| \`--v-tree-input-border\` | Input border color |
| \`--v-tree-input-text-color\` | Input text color |
| \`--v-tree-input-focus-bg\` | Input background when focused |
| \`--v-tree-input-focus-border\` | Input border when focused |
| \`--v-tree-drag-preview-bg\` | Drag preview background gradient |
| \`--v-tree-drag-preview-text\` | Drag preview text color |
| \`--v-tree-drag-preview-icon-color\` | Drag preview icon color |

### 2. Dimensions

| Variable | Description |
|---|---|
| \`--v-tree-row-margin\` | Margin around each row (0 4px) |
| \`--v-tree-row-focus-ring-width\` | Width of focus ring (1px) |
| \`--v-tree-row-focus-ring-offset\` | Offset from row edge (-1px) |
| \`--v-tree-indicator-height\` | Height of drop indicator line (2px) |
| \`--v-tree-drop-inside-border-width\` | Border width for drop-inside (1px) |
| \`--v-tree-chevron-size\` | Size of chevron buttom (20px) |
| \`--v-tree-icon-spacing\` | Space between icon and text (6px) |
| \`--v-tree-input-border-width\` | Input border width (1px) |
| \`--v-tree-drag-preview-min-width\` | Minimum width (120px) |
| \`--v-tree-drag-preview-max-width\` | Maximum width (300px) |
| \`--v-tree-drag-preview-gap\` | Space between elements (0.5rem) |
| \`--v-tree-drag-preview-padding\` | Internal padding (0.5rem 1rem) |

### 3. Typography

| Variable | Description |
|---|---|
| \`--v-tree-row-font-size\` | Font size for row text (13px) |
| \`--v-tree-input-padding\` | Input internal padding (2px 6px) |
| \`--v-tree-input-font-size\` | Input font size (13px) |
| \`--v-tree-drag-preview-font-size\` | Main font size (13px) |
| \`--v-tree-drag-preview-font-weight\` | Font weight (600) |
| \`--v-tree-drag-preview-text-font-size\` | Text element font size (inherit) |
| \`--v-tree-drag-preview-badge-font-size\` | Badge font size (11px) |
| \`--v-tree-drag-preview-badge-font-weight\` | Badge font weight (700) |

### 4. Spacing, Effects & Transitions

| Variable | Description |
|---|---|
| \`--v-tree-actions-gap\` | Space between action buttons (4px) |
| \`--v-tree-actions-spacing\` | Space from row text to actions (8px) |
| \`--v-tree-drag-preview-badge-padding\` | Badge padding (0.125rem 0.5rem) |
| \`--v-tree-drag-preview-border-radius\` | Drag preview corner radius |
| \`--v-tree-drag-preview-badge-radius\` | Badge corner radius (0.75rem) |
| \`--v-tree-drag-preview-shadow\` | Drag preview drop shadow |
| \`--v-tree-drag-preview-backdrop-filter\` | Backdrop blur effect (blur(10px)) |
| \`--v-tree-actions-opacity-hidden\` | Actions opacity when hidden |
| \`--v-tree-actions-opacity-visible\` | Actions opacity when visible |
| \`--v-tree-row-transition\` | Row transition |
| \`--v-tree-chevron-transition\` | Chevron transition |
| \`--v-tree-actions-transition\` | Actions transition |

        `,
      },
    },
  },
  argTypes: {
    // Props documentation
    initialData: {
      description: 'Tree data in flat `Record<string, FileNode>` format',
      table: {
        type: { summary: 'Record<string, FileNode>' },
        defaultValue: { summary: '{}' },
        category: 'Data',
      },
      control: { type: 'object' },
    },
    storageKey: {
      description: 'LocalStorage key for persisting expansion state',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: `'vscode_tree_state'` },
        category: 'Persistence',
      },
      control: { type: 'text' },
    },
    allowSort: {
      description:
        'Allow reordering items (before/after positions). When `false`, only allows dropping inside folders.',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
        category: 'Behavior',
      },
      control: { type: 'boolean' },
    },
    allowDragAndDrop: {
      description: 'Enable/disable all drag and drop functionality',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'true' },
        category: 'Behavior',
      },
      control: { type: 'boolean' },
    },
    itemHeight: {
      description: 'Height of each row in pixels (for virtualization)',
      table: {
        type: { summary: 'number' },
        defaultValue: { summary: '24' },
        category: 'Layout',
      },
      control: { type: 'number', min: 16, max: 64 },
    },
    indentSize: {
      description: 'Pixels to indent per depth level',
      table: {
        type: { summary: 'number' },
        defaultValue: { summary: '20' },
        category: 'Layout',
      },
      control: { type: 'number', min: 8, max: 40 },
    },
    baseIndent: {
      description: 'Base indentation in pixels (applied to all items)',
      table: {
        type: { summary: 'number' },
        defaultValue: { summary: '8' },
        category: 'Layout',
      },
      control: { type: 'number', min: 0, max: 24 },
    },
    autoExpandDelay: {
      description:
        'Milliseconds to hover before auto-expanding folder during drag',
      table: {
        type: { summary: 'number' },
        defaultValue: { summary: '500' },
        category: 'Drag & Drop',
      },
      control: { type: 'number', min: 200, max: 2000 },
    },
    autoScrollThreshold: {
      description: 'Distance from edge (px) to trigger auto-scroll during drag',
      table: {
        type: { summary: 'number' },
        defaultValue: { summary: '50' },
        category: 'Drag & Drop',
      },
      control: { type: 'number', min: 20, max: 100 },
    },
    autoScrollSpeed: {
      description: 'Pixels to scroll per frame during auto-scroll',
      table: {
        type: { summary: 'number' },
        defaultValue: { summary: '10' },
        category: 'Drag & Drop',
      },
      control: { type: 'number', min: 5, max: 30 },
    },
    overscan: {
      description: 'Extra items to render off-screen for smoother scrolling',
      table: {
        type: { summary: 'number' },
        defaultValue: { summary: '10' },
        category: 'Performance',
      },
      control: { type: 'number', min: 5, max: 50 },
    },
  },
  args: {
    initialData: defaultData,
    allowSort: false,
    allowDragAndDrop: true,
    storageKey: 'storybook_tree',
    itemHeight: 24,
    indentSize: 20,
    baseIndent: 8,
    autoExpandDelay: 500,
    autoScrollThreshold: 50,
    autoScrollSpeed: 10,
    overscan: 10,
  },
  decorators: [
    () => ({
      template:
        '<div style="height: 500px; width: 100%; border: 1px solid var(--v-tree-row-hover-bg, #ddd); border-radius: 8px; overflow: hidden;"><story/></div>',
    }),
  ],
} satisfies Meta<typeof FileTree>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// Stories
// ============================================================================

/**
 * Default tree with basic functionality.
 * Click to select, double-click folders to expand/collapse.
 */
export const Default: Story = {
  args: {},
  render: args => ({
    components: { FileTree },
    setup() {
      return { args };
    },
    template: '<FileTree v-bind="args" />',
  }),
};

/**
 * Tree with drag and drop enabled. Demonstrates:
 * - Drag items to move them
 * - Drop on folders to nest
 * - Auto-expand folders on hover (500ms)
 * - Auto-scroll when dragging near edges
 *
 * > **Note**: Set `allowSort: true` to enable before/after positioning.
 */
export const DragAndDrop: Story = {
  args: {
    allowSort: true,
    allowDragAndDrop: true,
  },
  parameters: {
    docs: {
      description: {
        story: `
### Drop Positions

| Mouse Position | Drop Result |
|----------------|-------------|
| Top 20% | Drop **before** target (sibling) |
| Middle 60% | Drop **inside** folder |
| Bottom 20% | Drop **after** target (sibling) |

### Auto-Expand
Hover over a collapsed folder for **500ms** to auto-expand it during drag.
        `,
      },
    },
  },
  render: args => ({
    components: { FileTree },
    setup() {
      const handleMove = (
        nodeId: string | string[],
        targetId: string,
        position: string
      ) => {
        const ids = Array.isArray(nodeId) ? nodeId : [nodeId];
        console.log('📦 Move event:', { nodeId: ids, targetId, position });
        alert(`Moving ${ids.length} item(s) ${position} "${targetId}"`);
      };
      return { args, handleMove };
    },
    template: `
      <div style="height: 100%;">
        <p style="margin: 0 0 10px; padding: 10px; font-size: 0.8em; color: gray; background: rgba(0,0,0,0.05); border-radius: 4px;">
          🖱️ Drag items to reorder. Hover over folders to auto-expand.
        </p>
        <FileTree v-bind="args" @move="handleMove" style="height: calc(100% - 50px);" />
      </div>
    `,
  }),
};

/**
 * Drag and drop disabled. Items cannot be moved.
 */
export const DragDropDisabled: Story = {
  args: {
    allowDragAndDrop: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Set `allowDragAndDrop: false` to completely disable drag and drop functionality.',
      },
    },
  },
  render: args => ({
    components: { FileTree },
    setup() {
      return { args };
    },
    template: `
      <div style="height: 100%;">
        <p style="margin: 0 0 10px; padding: 10px; font-size: 0.8em; color: orange; background: rgba(255,165,0,0.1); border-radius: 4px;">
          ⚠️ Drag and drop is disabled
        </p>
        <FileTree v-bind="args" style="height: calc(100% - 50px);" />
      </div>
    `,
  }),
};

/**
 * Multi-select demonstration:
 * - **Ctrl/Cmd + Click**: Toggle individual items
 * - **Shift + Click**: Range select
 */
export const MultiSelect: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: `
### Selection Modes

| Action | Result |
|--------|--------|
| **Click** | Single select |
| **Ctrl/Cmd + Click** | Toggle multi-select |
| **Shift + Click** | Range select from last focused item |
        `,
      },
    },
  },
  render: args => ({
    components: { FileTree },
    setup() {
      const selectedItems = ref<string[]>([]);

      const handleSelect = (nodeIds: string[]) => {
        selectedItems.value = nodeIds;
        console.log('✅ Selected:', nodeIds);
      };

      return { args, selectedItems, handleSelect };
    },
    template: `
      <div style="height: 100%;">
        <div style="margin: 0 0 10px; padding: 10px; font-size: 0.8em; background: rgba(0,0,0,0.05); border-radius: 4px;">
          <strong>Selected ({{ selectedItems.length }}):</strong> 
          {{ selectedItems.slice(0, 5).join(', ') }}{{ selectedItems.length > 5 ? '...' : '' }}
        </div>
        <FileTree v-bind="args" @select="handleSelect" style="height: calc(100% - 50px);" />
      </div>
    `,
  }),
};

/**
 * Demonstrates keyboard navigation:
 * - `↑/↓`: Navigate with auto-scroll
 * - `←/→`: Collapse/expand or navigate hierarchy
 * - `Enter/Space`: Toggle folder
 */
export const KeyboardNavigation: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: `
### How to Test
1. Click on any item to focus the tree
2. Use **arrow keys** to navigate
3. Notice **auto-scroll** keeps the focused item visible
4. Use **Enter** or **Space** to toggle folders

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| \`↓\` | Move focus down (auto-scrolls) |
| \`↑\` | Move focus up (auto-scrolls) |
| \`→\` | Expand folder / move to first child |
| \`←\` | Collapse folder / move to parent |
| \`Enter\`/\`Space\` | Toggle folder expansion |
        `,
      },
    },
  },
  render: args => ({
    components: { FileTree },
    setup() {
      return { args };
    },
    template: `
      <div style="height: 100%;">
        <p style="margin: 0 0 10px; padding: 10px; font-size: 0.8em; color: gray; background: rgba(0,0,0,0.05); border-radius: 4px;">
          ⌨️ Click tree then use arrow keys. Watch auto-scroll!
        </p>
        <FileTree v-bind="args" style="height: calc(100% - 50px);" />
      </div>
    `,
  }),
};

/**
 * Demonstrates the `focusItem()` exposed method.
 * Programmatically jump to any item in the tree.
 */
export const FocusItem: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: `
### focusItem(nodeId: string)

Programmatically focus and scroll to any item:

\`\`\`typescript
const treeRef = ref();

// Jump to a specific item
treeRef.value?.focusItem('folder-5');
\`\`\`

**Behavior:**
1. Expands all parent folders if needed
2. Scrolls the item into view
3. Selects and focuses the item
4. Emits \`select\` event
        `,
      },
    },
  },
  render: args => ({
    components: { FileTree },
    setup() {
      const treeRef = ref();
      const nodeIds = Object.keys(args.initialData || defaultData).filter(
        id => id !== 'root'
      );

      const focusRandom = () => {
        const randomId = nodeIds[Math.floor(Math.random() * nodeIds.length)];
        treeRef.value?.focusItem(randomId);
        console.log('🎯 Focused:', randomId);
      };

      return { args, treeRef, focusRandom };
    },
    template: `
      <div style="height: 100%;">
        <div style="margin: 0 0 10px; display: flex; gap: 8px;">
          <button 
            @click="focusRandom" 
            style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;"
          >
            🎲 Focus Random Item
          </button>
        </div>
        <FileTree ref="treeRef" v-bind="args" style="height: calc(100% - 50px);" />
      </div>
    `,
  }),
};

/**
 * Demonstrates `expandAll()` and `collapseAll()` exposed methods.
 */
export const ExpandCollapseAll: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: `
### Exposed Methods

\`\`\`typescript
const treeRef = ref();

treeRef.value?.expandAll();   // Expand all folders
treeRef.value?.collapseAll(); // Collapse all folders
\`\`\`
        `,
      },
    },
  },
  render: args => ({
    components: { FileTree },
    setup() {
      const treeRef = ref();

      const expandAll = () => treeRef.value?.expandAll();
      const collapseAll = () => treeRef.value?.collapseAll();

      return { args, treeRef, expandAll, collapseAll };
    },
    template: `
      <div style="height: 100%;">
        <div style="margin: 0 0 10px; display: flex; gap: 8px;">
          <button 
            @click="expandAll" 
            style="padding: 8px 16px; background: #22c55e; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;"
          >
            📂 Expand All
          </button>
          <button 
            @click="collapseAll" 
            style="padding: 8px 16px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;"
          >
            📁 Collapse All
          </button>
        </div>
        <FileTree ref="treeRef" v-bind="args" style="height: calc(100% - 50px);" />
      </div>
    `,
  }),
};

/**
 * Demonstrates inline editing with `startEditing()` method.
 */
export const InlineEditing: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: `
### Inline Rename

Use \`startEditing(nodeId)\` to enable inline editing:

\`\`\`typescript
const treeRef = ref();

// Start editing a node's name
treeRef.value?.startEditing('file-3');
\`\`\`

**Events:**
- \`@rename\`: Emitted with \`(nodeId, newName)\` when confirmed
        `,
      },
    },
  },
  render: args => ({
    components: { FileTree },
    setup() {
      const treeRef = ref();
      const lastRename = ref('');

      const startRenameDemo = () => {
        // Focus on a file first, then start editing
        const fileId = Object.keys(args.initialData || defaultData).find(id =>
          id.startsWith('file-')
        );
        if (fileId) {
          treeRef.value?.focusItem(fileId);
          setTimeout(() => treeRef.value?.startEditing(fileId), 100);
        }
      };

      const handleRename = (nodeId: string, newName: string) => {
        lastRename.value = `${nodeId} → ${newName}`;
        console.log('✏️ Rename:', nodeId, newName);
      };

      return { args, treeRef, startRenameDemo, handleRename, lastRename };
    },
    template: `
      <div style="height: 100%;">
        <div style="margin: 0 0 10px; display: flex; gap: 8px; align-items: center;">
          <button 
            @click="startRenameDemo" 
            style="padding: 8px 16px; background: #8b5cf6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;"
          >
            ✏️ Start Rename Demo
          </button>
          <span v-if="lastRename" style="font-size: 0.85em; color: #22c55e;">
            Last rename: {{ lastRename }}
          </span>
        </div>
        <FileTree ref="treeRef" v-bind="args" @rename="handleRename" style="height: calc(100% - 50px);" />
      </div>
    `,
  }),
};

/**
 * Shows how to add custom action buttons using the `#actions` slot.
 */
export const CustomActions: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: `
### Actions Slot

Add custom action buttons that appear on row hover:

\`\`\`vue
<FileTree :initial-data="data">
  <template #actions="{ node }">
    <button @click.stop="handleEdit(node.id)">✏️</button>
    <button @click.stop="handleDelete(node.id)">🗑️</button>
  </template>
</FileTree>
\`\`\`

**Important:** Use \`@click.stop\` to prevent row selection when clicking actions.
        `,
      },
    },
  },
  render: args => ({
    components: { FileTree, Edit2, Trash2, Share2, Copy, FolderPlus, FilePlus },
    setup() {
      const handleAction = (
        action: string,
        nodeId: string,
        nodeName: string
      ) => {
        console.log('🎯 Action:', action, nodeId);
        alert(`${action}: ${nodeName} (${nodeId})`);
      };

      return { args, handleAction };
    },
    template: `
      <FileTree v-bind="args">
        <template #actions="{ node }">
          <div style="display: flex; gap: 2px; align-items: center;">
            <button 
              @click.stop="handleAction('Rename', node.id, node.name)" 
              title="Rename"
              style="display: flex; align-items: center; justify-content: center; height: 22px; width: 22px; border: none; background: transparent; cursor: pointer; color: inherit; border-radius: 4px; transition: background 0.15s;"
              onmouseover="this.style.background='rgba(255,255,255,0.1)'"
              onmouseout="this.style.background='transparent'"
            >
              <Edit2 :size="13" />
            </button>
            <button 
              @click.stop="handleAction('Copy', node.id, node.name)" 
              title="Copy"
              style="display: flex; align-items: center; justify-content: center; height: 22px; width: 22px; border: none; background: transparent; cursor: pointer; color: inherit; border-radius: 4px; transition: background 0.15s;"
              onmouseover="this.style.background='rgba(255,255,255,0.1)'"
              onmouseout="this.style.background='transparent'"
            >
              <Copy :size="13" />
            </button>
            <button 
              @click.stop="handleAction('Delete', node.id, node.name)" 
              title="Delete"
              style="display: flex; align-items: center; justify-content: center; height: 22px; width: 22px; border: none; background: transparent; cursor: pointer; color: #ef4444; border-radius: 4px; transition: background 0.15s;"
              onmouseover="this.style.background='rgba(239,68,68,0.1)'"
              onmouseout="this.style.background='transparent'"
            >
              <Trash2 :size="13" />
            </button>
          </div>
        </template>
      </FileTree>
    `,
  }),
};

/**
 * Context menu event demonstration.
 */
export const ContextMenu: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: `
### Context Menu Event

Listen to \`@contextmenu\` for right-click handling:

\`\`\`vue
<FileTree 
  :initial-data="data" 
  @contextmenu="(nodeId, event) => showMenu(nodeId, event)" 
/>
\`\`\`
        `,
      },
    },
  },
  render: args => ({
    components: { FileTree },
    setup() {
      const lastContext = ref('');

      const handleContextMenu = (nodeId: string, event: MouseEvent) => {
        event.preventDefault();
        lastContext.value = `Right-clicked: ${nodeId} at (${event.clientX}, ${event.clientY})`;
        console.log('🖱️ Context menu:', nodeId, event);
      };

      return { args, handleContextMenu, lastContext };
    },
    template: `
      <div style="height: 100%;">
        <p style="margin: 0 0 10px; padding: 10px; font-size: 0.8em; background: rgba(0,0,0,0.05); border-radius: 4px;">
          {{ lastContext || '🖱️ Right-click any item to see contextmenu event' }}
        </p>
        <FileTree v-bind="args" @contextmenu="handleContextMenu" style="height: calc(100% - 50px);" />
      </div>
    `,
  }),
};

/**
 * VS Code dark theme styling example.
 */
export const ThemeVSCode: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: `
### CSS Variable Theming

Wrap the tree in a container and override CSS variables:

\`\`\`css
.theme-vscode {
  --v-tree-bg: #1e1e1e;
  --v-tree-text: #d4d4d4;
  --v-tree-row-hover-bg: #2a2d2e;
  --v-tree-row-selected-bg: #37373d;
  --v-tree-indicator-color: #007fd4;
}
\`\`\`

See \`CUSTOMIZATION.md\` for all available CSS variables.
        `,
      },
    },
  },
  decorators: [
    () => ({
      template: `
        <div class="theme-vscode" style="height: 100%; width: 100%;">
          <style>
            .theme-vscode {
              --v-tree-bg: #1e1e1e;
              --v-tree-text: #d4d4d4;
              --v-tree-row-hover-bg: #2a2d2e;
              --v-tree-row-selected-bg: #37373d;
              --v-tree-row-selected-hover-bg: #3d3d46;
              --v-tree-row-focus-ring: #007fd4;
              --v-tree-indicator-color: #007fd4;
              --v-tree-drop-inside-bg: rgba(55, 55, 61, 0.5);
              --v-tree-chevron-hover-bg: #303031;
              --v-tree-drag-preview-bg: #252526;
              --v-tree-drag-preview-text: #ffffff;
            }
          </style>
          <story/>
        </div>
      `,
    }),
  ],
  render: args => ({
    components: { FileTree },
    setup() {
      return { args };
    },
    template: '<FileTree v-bind="args" />',
  }),
};

/**
 * GitHub-inspired theme.
 */
export const ThemeGitHub: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'GitHub-style light theme with green accents.',
      },
    },
  },
  decorators: [
    () => ({
      template: `
        <div class="theme-github" style="height: 100%; width: 100%;">
          <style>
            .theme-github {
              --v-tree-bg: #ffffff;
              --v-tree-text: #24292f;
              --v-tree-row-hover-bg: #f6f8fa;
              --v-tree-row-selected-bg: rgba(84, 174, 255, 0.15);
              --v-tree-row-selected-hover-bg: rgba(84, 174, 255, 0.25);
              --v-tree-row-focus-ring: #0969da;
              --v-tree-indicator-color: #1a7f37;
              --v-tree-chevron-hover-bg: #eaeef2;
            }
          </style>
          <story/>
        </div>
      `,
    }),
  ],
  render: args => ({
    components: { FileTree },
    setup() {
      return { args };
    },
    template: '<FileTree v-bind="args" />',
  }),
};

/**
 * Notion-inspired minimal theme.
 */
export const ThemeNotion: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Clean, minimal Notion-style theme.',
      },
    },
  },
  decorators: [
    () => ({
      template: `
        <div class="theme-notion" style="height: 100%; width: 100%;">
          <style>
            .theme-notion {
              --v-tree-bg: #ffffff;
              --v-tree-text: #37352f;
              --v-tree-row-hover-bg: rgba(55, 53, 47, 0.08);
              --v-tree-row-selected-bg: rgba(35, 131, 226, 0.14);
              --v-tree-row-selected-hover-bg: rgba(35, 131, 226, 0.2);
              --v-tree-row-focus-ring: #2383e2;
              --v-tree-indicator-color: #2383e2;
              --v-tree-chevron-hover-bg: rgba(55, 53, 47, 0.1);
            }
          </style>
          <story/>
        </div>
      `,
    }),
  ],
  render: args => ({
    components: { FileTree },
    setup() {
      return { args };
    },
    template: '<FileTree v-bind="args" />',
  }),
};

/**
 * Custom layout with different item height and indent sizes.
 */
export const CustomLayout: Story = {
  args: {
    itemHeight: 32,
    indentSize: 28,
    baseIndent: 12,
  },
  parameters: {
    docs: {
      description: {
        story: `
### Layout Props

Customize the tree layout:

| Prop | Description | Default |
|------|-------------|---------|
| \`itemHeight\` | Row height in pixels | 24 |
| \`indentSize\` | Indent per depth level | 20 |
| \`baseIndent\` | Base padding for all items | 8 |
        `,
      },
    },
  },
  render: args => ({
    components: { FileTree },
    setup() {
      return { args };
    },
    template: `
      <div style="height: 100%;">
        <p style="margin: 0 0 10px; padding: 10px; font-size: 0.8em; background: rgba(0,0,0,0.05); border-radius: 4px;">
          📐 Larger rows (32px), wider indentation (28px/level)
        </p>
        <FileTree v-bind="args" style="height: calc(100% - 50px);" />
      </div>
    `,
  }),
};

/**
 * Large dataset performance demonstration.
 */
export const LargeDataset: Story = {
  args: {
    initialData: generateTestData(1000),
    storageKey: 'storybook_large_tree',
  },
  parameters: {
    docs: {
      description: {
        story: `
### Performance with Large Datasets

This example uses **1000 nodes** to demonstrate virtualization performance.

**Benchmarks (M1 MacBook Pro):**

| Nodes | Generation | Render | Scrolling |
|-------|------------|--------|-----------|
| 1,000 | ~5ms | ~15ms | 60fps ✅ |
| 5,000 | ~20ms | ~30ms | 60fps ✅ |
| 10,000 | ~40ms | ~50ms | 60fps ✅ |
| 50,000 | ~200ms | ~150ms | 60fps ✅ |
        `,
      },
    },
  },
  render: args => ({
    components: { FileTree },
    setup() {
      const treeRef = ref();
      const nodeCount = Object.keys(args.initialData || {}).length;

      return { args, treeRef, nodeCount };
    },
    template: `
      <div style="height: 100%;">
        <p style="margin: 0 0 10px; padding: 10px; font-size: 0.8em; background: rgba(59,130,246,0.1); border-radius: 4px; color: #3b82f6;">
          🚀 {{ nodeCount }} nodes loaded with virtualization
        </p>
        <FileTree ref="treeRef" v-bind="args" style="height: calc(100% - 50px);" />
      </div>
    `,
  }),
};

/**
 * All events demonstration.
 */
export const AllEvents: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: `
### All Available Events

| Event | Payload | Description |
|-------|---------|-------------|
| \`@move\` | \`(nodeId, targetId, position)\` | Node dropped |
| \`@select\` | \`(nodeIds: string[])\` | Selection changed |
| \`@click\` | \`(nodeId, event)\` | Row clicked |
| \`@contextmenu\` | \`(nodeId, event)\` | Right-click |
| \`@rename\` | \`(nodeId, newName)\` | Rename confirmed |
        `,
      },
    },
  },
  render: args => ({
    components: { FileTree },
    setup() {
      const logs = ref<string[]>([]);

      const addLog = (msg: string) => {
        logs.value = [msg, ...logs.value.slice(0, 4)];
      };

      return {
        args,
        logs,
        handleMove: (id: any, target: string, pos: string) =>
          addLog(
            `📦 move: ${Array.isArray(id) ? id.join(',') : id} → ${target} (${pos})`
          ),
        handleSelect: (ids: string[]) =>
          addLog(
            `✅ select: [${ids.slice(0, 3).join(', ')}${ids.length > 3 ? '...' : ''}]`
          ),
        handleClick: (id: string) => addLog(`👆 click: ${id}`),
        handleContextmenu: (id: string, e: MouseEvent) => {
          e.preventDefault();
          addLog(`🖱️ contextmenu: ${id}`);
        },
        handleRename: (id: string, name: string) =>
          addLog(`✏️ rename: ${id} → ${name}`),
      };
    },
    template: `
      <div style="height: 100%; display: flex; flex-direction: column;">
        <div style="flex: 0 0 auto; padding: 10px; background: #1e1e1e; color: #d4d4d4; font-family: monospace; font-size: 12px; border-radius: 4px; margin-bottom: 10px; max-height: 120px; overflow: auto;">
          <div style="margin-bottom: 4px; color: #888;">📋 Event Log (most recent first):</div>
          <div v-for="(log, i) in logs" :key="i" style="opacity: calc(1 - (v-for index * 0.15));">{{ log }}</div>
          <div v-if="!logs.length" style="color: #666;">Interact with the tree to see events...</div>
        </div>
        <FileTree 
          v-bind="args" 
          @move="handleMove"
          @select="handleSelect"
          @click="handleClick"
          @contextmenu="handleContextmenu"
          @rename="handleRename"
          style="flex: 1; min-height: 0;" 
        />
      </div>
    `,
  }),
};
