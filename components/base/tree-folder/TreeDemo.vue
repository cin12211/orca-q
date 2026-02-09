<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  Edit2,
  Trash2,
  Share2,
  Copy,
  FolderPlus,
  FilePlus,
} from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import BaseContextMenu from '~/components/base/context-menu/BaseContextMenu.vue';
import {
  ContextMenuItemType,
  type ContextMenuItem,
} from '~/components/base/context-menu/menuContext.type';
import FileTree from './FileTree.vue';
import type { FileNode } from './types';

// Generate test data
const generateTestData = (nodeCount: number): Record<string, FileNode> => {
  const nodes: Record<string, FileNode> = {};
  const startTime = performance.now();

  // Create root folder
  nodes['root'] = {
    id: 'root',
    parentId: null,
    name: 'Project Root',
    type: 'folder',
    depth: 0,
    children: [],
  };

  let currentId = 1;

  // Helper to generate a folder with children
  const generateFolder = (
    parentId: string,
    depth: number,
    remainingNodes: number,
    name: string
  ) => {
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

    parent.children!.push(folderId);

    let consumed = 1;
    remainingNodes--;

    // Add 3-7 children (mix of files and folders)
    const childCount = Math.min(
      Math.floor(Math.random() * 5) + 3,
      remainingNodes
    );

    for (let i = 0; i < childCount && remainingNodes > 0; i++) {
      if (Math.random() > 0.3 && depth < 8) {
        // 70% chance to create a file, 30% chance for nested folder
        const fileId = `file-${currentId++}`;
        nodes[fileId] = {
          id: fileId,
          parentId: folderId,
          name: `file-${i}.ts`,
          type: 'file',
          depth: depth + 1,
        };
        nodes[folderId].children!.push(fileId);
        consumed++;
        remainingNodes--;
      } else if (depth < 8) {
        // Create nested folder (limit depth to prevent stack overflow)
        const nestedConsumed = generateFolder(
          folderId,
          depth + 1,
          Math.min(remainingNodes, 20),
          `nested-${i}`
        );
        consumed += nestedConsumed;
        remainingNodes -= nestedConsumed;
      }
    }

    return consumed;
  };

  // Generate structure
  let remaining = nodeCount - 1; // -1 for root
  let folderIdx = 0;

  while (remaining > 0) {
    const consumed = generateFolder(
      'root',
      1,
      Math.min(remaining, 50),
      `Module-${folderIdx++}`
    );
    remaining -= consumed;
  }

  const endTime = performance.now();
  console.log(
    `✅ Generated ${Object.keys(nodes).length} nodes in ${(endTime - startTime).toFixed(2)}ms`
  );

  return nodes;
};

// Test configurations
const testSizes = [
  { label: '1K nodes', value: 1000 },
  { label: '5K nodes', value: 5000 },
  { label: '10K nodes', value: 10000 },
  { label: '50K nodes', value: 50000 },
];

const selectedSize = ref(5000);
const treeData = ref<Record<string, FileNode>>({});
const selectedNodes = ref<string[]>([]);
const moveLog = ref<string[]>([]);
const treeRef = ref<InstanceType<typeof FileTree> | null>(null);

// Drag-drop configuration
const allowSort = ref(false); // Default: only allow moving into folders

// Theme configuration
const selectedTheme = ref('default');
const themes = [
  { value: 'default', label: '🎨 Default (Design System)' },
  { value: 'vscode', label: '💻 VSCode Dark' },
  { value: 'github-light', label: '☀️ GitHub Light' },
  { value: 'github-dark', label: '🌙 GitHub Dark' },
  { value: 'notion', label: '📝 Notion' },
  { value: 'forest', label: '🌲 Forest Green' },
  { value: 'ocean', label: '🌊 Ocean Blue' },
  { value: 'sunset', label: '🌅 Sunset Orange' },
];

// Context menu state
const contextMenuNode = ref<string | null>(null);

// Action log
const actionLog = ref<string[]>([]);

// Performance metrics
const metrics = ref({
  generationTime: 0,
  renderTime: 0,
  nodeCount: 0,
});

// Generate initial data
const generateData = () => {
  const start = performance.now();
  treeData.value = generateTestData(selectedSize.value);
  metrics.value.generationTime = performance.now() - start;
  metrics.value.nodeCount = Object.keys(treeData.value).length;
  moveLog.value = [];

  // Measure render time
  setTimeout(() => {
    metrics.value.renderTime =
      performance.now() - start - metrics.value.generationTime;
  }, 100);
};

// Handle node move (supports single or multi-select)
const handleMove = (
  nodeId: string | string[],
  targetId: string,
  position: 'before' | 'after' | 'inside'
) => {
  const timestamp = new Date().toLocaleTimeString();

  // Handle multi-select
  const nodeIds = Array.isArray(nodeId) ? nodeId : [nodeId];
  const count = nodeIds.length;

  if (count === 1) {
    moveLog.value.unshift(
      `[${timestamp}] Moved "${treeData.value[nodeIds[0]]?.name}" ${position} "${treeData.value[targetId]?.name}"`
    );
  } else {
    moveLog.value.unshift(
      `[${timestamp}] Moved ${count} items ${position} "${treeData.value[targetId]?.name}"`
    );
  }

  // Keep only last 10 moves
  if (moveLog.value.length > 10) {
    moveLog.value = moveLog.value.slice(0, 10);
  }

  // In a real app, you would update the tree structure here
  console.log('Move:', { nodeIds, targetId, position, count });
};

// Handle selection
const handleSelect = (nodeIds: string[]) => {
  selectedNodes.value = nodeIds;
};

// Control methods
const expandAll = () => {
  treeRef.value?.expandAll();
};

const collapseAll = () => {
  treeRef.value?.collapseAll();
};

// Focus feature
const searchQuery = ref('');
const searchResults = computed(() => {
  if (!searchQuery.value) return [];

  const query = searchQuery.value.toLowerCase();
  return Object.values(treeData.value)
    .filter(node => node.name.toLowerCase().includes(query))
    .slice(0, 20); // Limit to 20 results
});

const focusOnItem = (nodeId: string) => {
  treeRef.value?.focusItem(nodeId);
  searchQuery.value = ''; // Clear search after focus
};

const focusRandomItem = () => {
  const allNodes = Object.values(treeData.value);
  const randomNode = allNodes[Math.floor(Math.random() * allNodes.length)];
  if (randomNode) {
    focusOnItem(randomNode.id);
  }
};

const focusDeepestItem = () => {
  // Find the deepest nested item
  const allNodes = Object.values(treeData.value);
  const deepestNode = allNodes.reduce((deepest, node) => {
    return node.depth > deepest.depth ? node : deepest;
  }, allNodes[0]);

  if (deepestNode) {
    // First collapse all to demonstrate the auto-expand feature
    collapseAll();
    setTimeout(() => {
      focusOnItem(deepestNode.id);
      toast.info(`Focusing on deepest item at depth ${deepestNode.depth}`);
    }, 100);
  }
};

// Context menu handlers
const handleContextMenu = (nodeId: string, event: MouseEvent) => {
  console.log('🚀 ~ handleContextMenu ~ nodeId:', nodeId);

  contextMenuNode.value = nodeId;
};

const clearContextMenu = () => {
  contextMenuNode.value = null;
};

// Context menu items
const contextMenuItems = computed<ContextMenuItem[]>(() => {
  if (!contextMenuNode.value) return [];

  const node = treeData.value[contextMenuNode.value];
  console.log('🚀 ~ node:', node);
  if (!node) return [];

  return [
    {
      type: ContextMenuItemType.LABEL,
      title: node.name,
    },
    {
      type: ContextMenuItemType.SEPARATOR,
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Rename',
      icon: 'lucide:edit-2',
      select: () => handleRenameClick(contextMenuNode.value!),
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Duplicate',
      icon: 'lucide:copy',
      select: () => handleDuplicateClick(contextMenuNode.value!),
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Share',
      icon: 'lucide:share-2',
      select: () => handleShareClick(contextMenuNode.value!),
    },
    {
      type: ContextMenuItemType.SEPARATOR,
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Delete',
      icon: 'lucide:trash-2',
      select: () => handleDeleteClick(contextMenuNode.value!),
    },
  ];
});

// Action handlers
const logAction = (action: string, nodeId: string) => {
  const node = treeData.value[nodeId];
  const timestamp = new Date().toLocaleTimeString();
  actionLog.value.unshift(`[${timestamp}] ${action}: "${node?.name}"`);
  if (actionLog.value.length > 10) {
    actionLog.value = actionLog.value.slice(0, 10);
  }
};

const handleRenameClick = (nodeId: string) => {
  treeRef.value?.startEditing(nodeId);
  logAction('Rename started', nodeId);
};

const handleRename = (nodeId: string, newName: string) => {
  // Update the node name in the data
  if (treeData.value[nodeId]) {
    treeData.value[nodeId].name = newName;
    logAction(`Renamed to "${newName}"`, nodeId);
    toast.success(`Renamed to "${newName}"`);
  }
};

const handleDeleteClick = (nodeId: string) => {
  logAction('Delete', nodeId);
  toast.error(`Delete "${treeData.value[nodeId]?.name}"`);
};

const handleDuplicateClick = (nodeId: string) => {
  logAction('Duplicate', nodeId);
  toast.info(`Duplicate "${treeData.value[nodeId]?.name}"`);
};

const handleShareClick = (nodeId: string) => {
  logAction('Share', nodeId);
  toast.success(`Share "${treeData.value[nodeId]?.name}"`);
};

const handleQuickAction = (action: string, nodeId: string) => {
  switch (action) {
    case 'rename':
      handleRenameClick(nodeId);
      break;
    case 'delete':
      handleDeleteClick(nodeId);
      break;
    case 'share':
      handleShareClick(nodeId);
      break;
  }
};

// Initialize with default data
generateData();

// Computed stats
const treeStats = computed(() => {
  const data = treeData.value;
  const folderCount = Object.values(data).filter(
    n => n.type === 'folder'
  ).length;
  const fileCount = Object.values(data).filter(n => n.type === 'file').length;

  return {
    total: Object.keys(data).length,
    folders: folderCount,
    files: fileCount,
  };
});
</script>

<template>
  <div class="flex h-screen w-full bg-background text-foreground font-sans">
    <!-- Controls Panel -->
    <div
      class="w-[350px] shrink-0 overflow-y-auto border-r border-border bg-card p-5 [&::-webkit-scrollbar-thumb]:rounded-sm [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50 [&::-webkit-scrollbar]:w-2"
    >
      <h2 class="mb-5 text-xl font-semibold">🚀 Tree Performance Test</h2>

      <div class="mb-4">
        <label class="mb-2 block text-[13px] font-medium">Dataset Size:</label>
        <select
          v-model.number="selectedSize"
          class="mb-2 w-full rounded-md border border-border bg-input p-2 text-[13px] text-foreground"
        >
          <option
            v-for="size in testSizes"
            :key="size.value"
            :value="size.value"
          >
            {{ size.label }}
          </option>
        </select>
        <button
          @click="generateData"
          class="w-full rounded-md border-none bg-primary px-4 py-2 text-[13px] text-primary-foreground transition-all hover:opacity-90"
        >
          Generate New Data
        </button>
      </div>

      <div class="mb-4">
        <button
          @click="expandAll"
          class="mr-2 rounded-md border-none bg-secondary px-4 py-2 text-[13px] text-secondary-foreground transition-all hover:bg-secondary/80"
        >
          Expand All
        </button>
        <button
          @click="collapseAll"
          class="mr-2 rounded-md border-none bg-secondary px-4 py-2 text-[13px] text-secondary-foreground transition-all hover:bg-secondary/80"
        >
          Collapse All
        </button>
      </div>

      <!-- Theme Selection -->
      <div class="mb-4">
        <label class="mb-2 block text-[13px] font-medium">Theme:</label>
        <select
          v-model="selectedTheme"
          class="mb-2 w-full rounded-md border border-border bg-input p-2 text-[13px] text-foreground"
        >
          <option
            v-for="theme in themes"
            :key="theme.value"
            :value="theme.value"
          >
            {{ theme.label }}
          </option>
        </select>
        <div
          class="mt-1.5 rounded-sm border-l-[3px] border-primary bg-muted p-2 text-[11px] text-muted-foreground"
        >
          Switch between different color themes to see customization options
        </div>
      </div>

      <!-- Drag-Drop Configuration -->
      <div class="mb-4">
        <label
          class="flex cursor-pointer select-none items-center gap-2 text-[13px]"
        >
          <input
            type="checkbox"
            v-model="allowSort"
            class="h-4 w-4 cursor-pointer accent-primary"
          />
          <span>Allow Reordering (before/after)</span>
        </label>
        <div
          class="mt-1.5 rounded-sm border-l-[3px] border-primary bg-muted p-2 text-[11px] text-muted-foreground"
        >
          {{
            allowSort
              ? '✓ Can reorder items and move into folders'
              : '✗ Can only move items into folders (no reordering)'
          }}
        </div>
      </div>

      <!-- Focus Feature -->
      <div class="mt-5 rounded-lg bg-muted p-4">
        <h3 class="mb-3 mt-0 text-sm font-semibold text-muted-foreground">
          🎯 Focus Feature
        </h3>
        <div class="mb-4">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search to focus..."
            class="mb-2 w-full rounded-md border border-border bg-input px-3 py-2 text-[13px] text-foreground outline-none focus:border-ring"
          />
        </div>

        <!-- Search Results -->
        <div
          v-if="searchResults.length > 0"
          class="mt-3 max-h-[300px] overflow-y-auto rounded-md border border-border bg-card [&::-webkit-scrollbar-thumb]:rounded-sm [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50 [&::-webkit-scrollbar]:w-[6px]"
        >
          <div
            class="border-b border-border bg-muted px-3 py-2 text-[11px] text-muted-foreground"
          >
            Found {{ searchResults.length }} items (showing max 20)
          </div>
          <div class="p-1">
            <div
              v-for="node in searchResults"
              :key="node.id"
              class="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-[12px] transition-colors hover:bg-accent"
              @click="focusOnItem(node.id)"
            >
              <span class="shrink-0 text-sm">{{
                node.type === 'folder' ? '📁' : '📄'
              }}</span>
              <span class="flex-1 truncate text-foreground">{{
                node.name
              }}</span>
              <span class="shrink-0 text-[10px] text-muted-foreground"
                >depth: {{ node.depth }}</span
              >
            </div>
          </div>
        </div>

        <button
          @click="focusRandomItem"
          class="mr-2 mt-2 w-full rounded-md border-none bg-secondary px-4 py-2 text-[13px] text-secondary-foreground transition-all hover:bg-secondary/80"
        >
          🎲 Focus Random Item
        </button>

        <button
          @click="focusDeepestItem"
          class="mr-2 mt-2 w-full rounded-md border-none bg-secondary px-4 py-2 text-[13px] text-secondary-foreground transition-all hover:bg-secondary/80"
          title="Collapses all folders then focuses deepest nested item (auto-expands path)"
        >
          🎯 Focus Deepest Item
        </button>
      </div>

      <!-- Metrics -->
      <div class="mt-5 rounded-lg bg-muted p-4">
        <h3
          class="mb-2.5 mt-5 text-sm font-semibold text-muted-foreground first:mt-0"
        >
          📊 Performance Metrics
        </h3>
        <div class="flex justify-between py-1.5 text-[13px]">
          <span>Data Generation:</span>
          <strong class="text-primary"
            >{{ metrics.generationTime.toFixed(2) }}ms</strong
          >
        </div>
        <div class="flex justify-between py-1.5 text-[13px]">
          <span>Initial Render:</span>
          <strong class="text-primary"
            >{{ metrics.renderTime.toFixed(2) }}ms</strong
          >
        </div>
        <div class="flex justify-between py-1.5 text-[13px]">
          <span>Total Nodes:</span>
          <strong class="text-primary">{{
            metrics.nodeCount.toLocaleString()
          }}</strong>
        </div>
      </div>

      <!-- Stats -->
      <div class="mt-5 rounded-lg bg-muted p-4">
        <h3
          class="mb-2.5 mt-5 text-sm font-semibold text-muted-foreground first:mt-0"
        >
          📁 Tree Statistics
        </h3>
        <div class="flex justify-between py-1.5 text-[13px]">
          <span>Total Items:</span>
          <strong class="text-primary">{{
            treeStats.total.toLocaleString()
          }}</strong>
        </div>
        <div class="flex justify-between py-1.5 text-[13px]">
          <span>Folders:</span>
          <strong class="text-primary">{{
            treeStats.folders.toLocaleString()
          }}</strong>
        </div>
        <div class="flex justify-between py-1.5 text-[13px]">
          <span>Files:</span>
          <strong class="text-primary">{{
            treeStats.files.toLocaleString()
          }}</strong>
        </div>
        <div class="flex justify-between py-1.5 text-[13px]">
          <span>Selected:</span>
          <strong class="text-primary">{{ selectedNodes.length }}</strong>
        </div>
      </div>

      <!-- Move Log -->
      <div class="mt-5 rounded-lg bg-muted p-4">
        <h3
          class="mb-2.5 mt-5 text-sm font-semibold text-muted-foreground first:mt-0"
        >
          🔄 Recent Moves
        </h3>
        <div
          v-if="moveLog.length === 0"
          class="p-2.5 text-center text-xs italic text-muted-foreground"
        >
          Drag & drop nodes to see moves...
        </div>
        <div
          v-else
          class="max-h-[200px] space-y-1 overflow-y-auto [&::-webkit-scrollbar-thumb]:rounded-sm [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50 [&::-webkit-scrollbar]:w-[6px]"
        >
          <div
            v-for="(log, idx) in moveLog"
            :key="idx"
            class="mb-1 rounded-sm border-l-[3px] border-primary bg-card px-2 py-1.5 font-mono text-[11px]"
          >
            {{ log }}
          </div>
        </div>
      </div>

      <!-- Action Log -->
      <div class="mt-5 rounded-lg bg-muted p-4">
        <h3
          class="mb-2.5 mt-5 text-sm font-semibold text-muted-foreground first:mt-0"
        >
          ⚡ Recent Actions
        </h3>
        <div
          v-if="actionLog.length === 0"
          class="p-2.5 text-center text-xs italic text-muted-foreground"
        >
          Right-click or use action buttons...
        </div>
        <div
          v-else
          class="max-h-[200px] space-y-1 overflow-y-auto [&::-webkit-scrollbar-thumb]:rounded-sm [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50 [&::-webkit-scrollbar]:w-[6px]"
        >
          <div
            v-for="(log, idx) in actionLog"
            :key="idx"
            class="mb-1 rounded-sm border-l-[3px] border-chart-2 bg-card px-2 py-1.5 font-mono text-[11px]"
          >
            {{ log }}
          </div>
        </div>
      </div>

      <!-- Instructions -->
      <div class="mt-5 rounded-lg bg-muted p-4">
        <h3
          class="mb-2.5 mt-5 text-sm font-semibold text-muted-foreground first:mt-0"
        >
          💡 Test Instructions
        </h3>
        <ul class="m-0 space-y-1 pl-5 text-xs leading-relaxed">
          <li><strong class="text-primary">Click</strong> to select items</li>
          <li>
            <strong class="text-primary">Ctrl/Cmd + Click</strong> for
            multi-select
          </li>
          <li>
            <strong class="text-primary">Shift + Click</strong> for range select
          </li>
          <li>
            <strong class="text-primary">Drag multiple items</strong> - Select
            multiple items then drag to move them all together (shows count in
            drag preview)
          </li>
          <li>
            <strong class="text-primary">Double-click</strong> or
            <strong class="text-primary">chevron</strong> to expand/collapse
          </li>
          <li>
            <strong class="text-primary">Arrow keys</strong> for keyboard
            navigation (auto-scrolls to focused item)
          </li>
          <li>
            <strong class="text-primary">Drag & drop</strong> to reorder or move
            into folders (toggle "Allow Reordering" to test both modes)
          </li>
          <li>
            <strong class="text-primary">Hover</strong> anywhere over a closed
            folder during drag to auto-expand after 500ms
          </li>
          <li>
            <strong class="text-primary">Drag near edges</strong> (top/bottom
            50px) to auto-scroll
          </li>
          <li>
            <strong class="text-primary">Search & Focus</strong> to jump to
            specific items instantly (auto-expands parent folders)
          </li>
          <li>
            <strong class="text-primary">Right-click</strong> for context menu
            with actions (rename, duplicate, share, delete)
          </li>
          <li>
            <strong class="text-primary">Action buttons</strong> appear on hover
            (rename, share, delete)
          </li>
          <li>
            <strong class="text-primary">Inline editing</strong> with Enter/Esc
            to confirm/cancel
          </li>
        </ul>
      </div>
    </div>

    <!-- Tree Container -->
    <div class="flex-1 overflow-hidden p-5" :class="`theme-${selectedTheme}`">
      <BaseContextMenu
        :context-menu-items="contextMenuItems"
        @on-clear-context-menu="clearContextMenu"
      >
        <div class="h-full">
          <FileTree
            ref="treeRef"
            :initial-data="treeData"
            :allow-sort="allowSort"
            storage-key="demo_tree"
            @move="handleMove"
            @select="handleSelect"
            @contextmenu="handleContextMenu"
            @rename="handleRename"
          >
            <!-- Action buttons slot -->
            <template #actions="{ node }">
              <button
                class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-sm border-none bg-transparent p-0 text-foreground transition-all duration-150 hover:bg-accent hover:text-accent-foreground active:scale-95"
                title="Rename"
                @click.stop="handleQuickAction('rename', node.id)"
              >
                <Edit2 :size="14" />
              </button>
              <button
                class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-sm border-none bg-transparent p-0 text-foreground transition-all duration-150 hover:bg-accent hover:text-accent-foreground active:scale-95"
                title="Share"
                @click.stop="handleQuickAction('share', node.id)"
              >
                <Share2 :size="14" />
              </button>
              <button
                class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-sm border-none bg-transparent p-0 text-foreground transition-all duration-150 hover:bg-destructive/20 hover:text-destructive active:scale-95"
                title="Delete"
                @click.stop="handleQuickAction('delete', node.id)"
              >
                <Trash2 :size="14" />
              </button>
            </template>
          </FileTree>
        </div>
      </BaseContextMenu>
    </div>
  </div>
</template>

<style scoped>
/* Theme Variants */
/* VSCode Dark Theme */
.theme-vscode {
  --v-tree-bg: oklch(0.15 0 0);
  --v-tree-text: oklch(0.8 0 0);
  --v-tree-row-hover-bg: oklch(0.2 0 0);
  --v-tree-row-selected-bg: oklch(0.3 0.08 230 / 0.5);
  --v-tree-row-selected-hover-bg: oklch(0.35 0.08 230 / 0.6);
  --v-tree-row-focus-ring: oklch(0.5 0.18 230);
  --v-tree-indicator-color: oklch(0.5 0.18 230);
  --v-tree-drop-inside-bg: oklch(0.3 0.08 230 / 0.3);
  --v-tree-chevron-hover-bg: oklch(0.25 0 0);

  /* Input Field */
  --v-tree-input-bg: oklch(0.25 0 0);
  --v-tree-input-border: oklch(0.3 0 0);
  --v-tree-input-text-color: oklch(0.9 0 0);
  --v-tree-input-focus-bg: oklch(0.25 0 0);
  --v-tree-input-focus-border: oklch(0.5 0.18 230);

  --v-tree-drag-preview-bg: linear-gradient(
    to bottom right,
    oklch(0.5 0.18 230 / 0.95),
    oklch(0.4 0.18 230 / 0.98)
  );
  --v-tree-drag-preview-text: oklch(1 0 0);
}

/* GitHub Light Theme */
.theme-github-light {
  --v-tree-bg: oklch(1 0 0);
  --v-tree-text: oklch(0.2 0 0);
  --v-tree-row-hover-bg: oklch(0.95 0 0);
  --v-tree-row-selected-bg: oklch(0.65 0.15 250 / 0.35);
  --v-tree-row-selected-hover-bg: oklch(0.65 0.15 250 / 0.45);
  --v-tree-row-focus-ring: oklch(0.5 0.18 250);
  --v-tree-indicator-color: oklch(0.5 0.18 250);
  --v-tree-drop-inside-bg: oklch(0.65 0.15 250 / 0.2);
  --v-tree-chevron-hover-bg: oklch(0.92 0 0);

  /* Input Field */
  --v-tree-input-bg: oklch(1 0 0);
  --v-tree-input-border: oklch(0.9 0 0);
  --v-tree-input-text-color: oklch(0.2 0 0);
  --v-tree-input-focus-bg: oklch(1 0 0);
  --v-tree-input-focus-border: oklch(0.5 0.18 250);

  --v-tree-drag-preview-bg: linear-gradient(
    to bottom right,
    oklch(0.5 0.18 250 / 0.95),
    oklch(0.4 0.18 250 / 0.98)
  );
  --v-tree-drag-preview-text: oklch(1 0 0);
}

/* GitHub Dark Theme */
.theme-github-dark {
  --v-tree-bg: oklch(0.12 0 0);
  --v-tree-text: oklch(0.8 0 0);
  --v-tree-row-hover-bg: oklch(0.18 0 0);
  --v-tree-row-selected-bg: oklch(0.55 0.2 250 / 0.2);
  --v-tree-row-selected-hover-bg: oklch(0.55 0.2 250 / 0.3);
  --v-tree-row-focus-ring: oklch(0.6 0.2 250);
  --v-tree-indicator-color: oklch(0.6 0.2 250);
  --v-tree-drop-inside-bg: oklch(0.55 0.2 250 / 0.15);
  --v-tree-chevron-hover-bg: oklch(0.2 0 0);

  /* Input Field */
  --v-tree-input-bg: oklch(0.18 0 0);
  --v-tree-input-border: oklch(0.3 0 0);
  --v-tree-input-text-color: oklch(0.9 0 0);
  --v-tree-input-focus-bg: oklch(0.18 0 0);
  --v-tree-input-focus-border: oklch(0.6 0.2 250);

  --v-tree-drag-preview-bg: linear-gradient(
    to bottom right,
    oklch(0.6 0.2 250 / 0.95),
    oklch(0.5 0.2 250 / 0.98)
  );
  --v-tree-drag-preview-text: oklch(1 0 0);
}

/* Notion Theme */
.theme-notion {
  --v-tree-bg: oklch(0.99 0 0);
  --v-tree-text: oklch(0.25 0 0);
  --v-tree-row-hover-bg: oklch(0.96 0 0);
  --v-tree-row-selected-bg: oklch(0.65 0.12 200 / 0.25);
  --v-tree-row-selected-hover-bg: oklch(0.65 0.12 200 / 0.35);
  --v-tree-row-focus-ring: oklch(0.65 0.12 200);
  --v-tree-indicator-color: oklch(0.65 0.12 200);
  --v-tree-drop-inside-bg: oklch(0.65 0.12 200 / 0.15);
  --v-tree-chevron-hover-bg: oklch(0.94 0 0);

  /* Input Field */
  --v-tree-input-bg: oklch(0.98 0 0);
  --v-tree-input-border: oklch(0.9 0 0);
  --v-tree-input-text-color: oklch(0.25 0 0);
  --v-tree-input-focus-bg: oklch(1 0 0);
  --v-tree-input-focus-border: oklch(0.65 0.12 200);

  --v-tree-drag-preview-bg: linear-gradient(
    to bottom right,
    oklch(0.65 0.12 200 / 0.95),
    oklch(0.55 0.12 200 / 0.98)
  );
  --v-tree-drag-preview-text: oklch(1 0 0);
}

/* Forest Green Theme */
.theme-forest {
  --v-tree-bg: oklch(0.18 0.02 150);
  --v-tree-text: oklch(0.85 0.05 140);
  --v-tree-row-hover-bg: oklch(0.22 0.03 150);
  --v-tree-row-selected-bg: oklch(0.45 0.15 140 / 0.4);
  --v-tree-row-selected-hover-bg: oklch(0.45 0.15 140 / 0.5);
  --v-tree-row-focus-ring: oklch(0.55 0.18 140);
  --v-tree-indicator-color: oklch(0.6 0.2 140);
  --v-tree-drop-inside-bg: oklch(0.45 0.15 140 / 0.25);
  --v-tree-chevron-hover-bg: oklch(0.25 0.03 150);

  /* Input Field */
  --v-tree-input-bg: oklch(0.22 0.03 150);
  --v-tree-input-border: oklch(0.3 0.05 140);
  --v-tree-input-text-color: oklch(0.9 0.05 140);
  --v-tree-input-focus-bg: oklch(0.22 0.03 150);
  --v-tree-input-focus-border: oklch(0.55 0.18 140);

  --v-tree-drag-preview-bg: linear-gradient(
    to bottom right,
    oklch(0.5 0.18 140 / 0.95),
    oklch(0.4 0.18 140 / 0.98)
  );
  --v-tree-drag-preview-text: oklch(1 0 0);
}

/* Ocean Blue Theme */
.theme-ocean {
  --v-tree-bg: oklch(0.16 0.03 240);
  --v-tree-text: oklch(0.85 0.05 220);
  --v-tree-row-hover-bg: oklch(0.2 0.04 240);
  --v-tree-row-selected-bg: oklch(0.5 0.18 210 / 0.4);
  --v-tree-row-selected-hover-bg: oklch(0.5 0.18 210 / 0.5);
  --v-tree-row-focus-ring: oklch(0.6 0.2 210);
  --v-tree-indicator-color: oklch(0.65 0.22 210);
  --v-tree-drop-inside-bg: oklch(0.5 0.18 210 / 0.25);
  --v-tree-chevron-hover-bg: oklch(0.22 0.04 240);

  /* Input Field */
  --v-tree-input-bg: oklch(0.2 0.04 240);
  --v-tree-input-border: oklch(0.3 0.1 240);
  --v-tree-input-text-color: oklch(0.9 0.05 220);
  --v-tree-input-focus-bg: oklch(0.2 0.04 240);
  --v-tree-input-focus-border: oklch(0.6 0.2 210);

  --v-tree-drag-preview-bg: linear-gradient(
    to bottom right,
    oklch(0.55 0.2 210 / 0.95),
    oklch(0.45 0.2 210 / 0.98)
  );
  --v-tree-drag-preview-text: oklch(1 0 0);
}

/* Sunset Orange Theme */
.theme-sunset {
  --v-tree-bg: oklch(0.2 0.03 30);
  --v-tree-text: oklch(0.9 0.05 50);
  --v-tree-row-hover-bg: oklch(0.25 0.04 30);
  --v-tree-row-selected-bg: oklch(0.6 0.2 40 / 0.4);
  --v-tree-row-selected-hover-bg: oklch(0.6 0.2 40 / 0.5);
  --v-tree-row-focus-ring: oklch(0.65 0.22 40);
  --v-tree-indicator-color: oklch(0.7 0.24 40);
  --v-tree-drop-inside-bg: oklch(0.6 0.2 40 / 0.25);
  --v-tree-chevron-hover-bg: oklch(0.28 0.04 30);

  /* Input Field */
  --v-tree-input-bg: oklch(0.25 0.04 30);
  --v-tree-input-border: oklch(0.35 0.1 40);
  --v-tree-input-text-color: oklch(0.95 0.05 50);
  --v-tree-input-focus-bg: oklch(0.25 0.04 30);
  --v-tree-input-focus-border: oklch(0.65 0.22 40);

  --v-tree-drag-preview-bg: linear-gradient(
    to bottom right,
    oklch(0.65 0.22 40 / 0.95),
    oklch(0.55 0.22 40 / 0.98)
  );
  --v-tree-drag-preview-text: oklch(0.1 0 0);
}
</style>
