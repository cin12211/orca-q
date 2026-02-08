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
  <div class="demo-container">
    <!-- Controls Panel -->
    <div class="controls-panel">
      <h2>🚀 Tree Performance Test</h2>

      <div class="control-group">
        <label>Dataset Size:</label>
        <select v-model.number="selectedSize">
          <option
            v-for="size in testSizes"
            :key="size.value"
            :value="size.value"
          >
            {{ size.label }}
          </option>
        </select>
        <button @click="generateData" class="btn-primary">
          Generate New Data
        </button>
      </div>

      <div class="control-group">
        <button @click="expandAll" class="btn-secondary">Expand All</button>
        <button @click="collapseAll" class="btn-secondary">Collapse All</button>
      </div>

      <!-- Theme Selection -->
      <div class="control-group">
        <label>Theme:</label>
        <select v-model="selectedTheme">
          <option
            v-for="theme in themes"
            :key="theme.value"
            :value="theme.value"
          >
            {{ theme.label }}
          </option>
        </select>
        <div class="help-text">
          Switch between different color themes to see customization options
        </div>
      </div>

      <!-- Drag-Drop Configuration -->
      <div class="control-group">
        <label class="checkbox-label">
          <input type="checkbox" v-model="allowSort" class="checkbox-input" />
          <span>Allow Reordering (before/after)</span>
        </label>
        <div class="help-text">
          {{
            allowSort
              ? '✓ Can reorder items and move into folders'
              : '✗ Can only move items into folders (no reordering)'
          }}
        </div>
      </div>

      <!-- Focus Feature -->
      <div class="focus-feature">
        <h3>🎯 Focus Feature</h3>
        <div class="control-group">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search to focus..."
            class="search-input"
          />
        </div>

        <!-- Search Results -->
        <div v-if="searchResults.length > 0" class="search-results">
          <div class="search-results-header">
            Found {{ searchResults.length }} items (showing max 20)
          </div>
          <div class="search-results-list">
            <div
              v-for="node in searchResults"
              :key="node.id"
              class="search-result-item"
              @click="focusOnItem(node.id)"
            >
              <span class="result-icon">{{
                node.type === 'folder' ? '📁' : '📄'
              }}</span>
              <span class="result-name">{{ node.name }}</span>
              <span class="result-depth">depth: {{ node.depth }}</span>
            </div>
          </div>
        </div>

        <button
          @click="focusRandomItem"
          class="btn-secondary"
          style="width: 100%; margin-top: 8px"
        >
          🎲 Focus Random Item
        </button>

        <button
          @click="focusDeepestItem"
          class="btn-secondary"
          style="width: 100%; margin-top: 8px"
          title="Collapses all folders then focuses deepest nested item (auto-expands path)"
        >
          🎯 Focus Deepest Item
        </button>
      </div>

      <!-- Metrics -->
      <div class="metrics">
        <h3>📊 Performance Metrics</h3>
        <div class="metric-row">
          <span>Data Generation:</span>
          <strong>{{ metrics.generationTime.toFixed(2) }}ms</strong>
        </div>
        <div class="metric-row">
          <span>Initial Render:</span>
          <strong>{{ metrics.renderTime.toFixed(2) }}ms</strong>
        </div>
        <div class="metric-row">
          <span>Total Nodes:</span>
          <strong>{{ metrics.nodeCount.toLocaleString() }}</strong>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats">
        <h3>📁 Tree Statistics</h3>
        <div class="stat-row">
          <span>Total Items:</span>
          <strong>{{ treeStats.total.toLocaleString() }}</strong>
        </div>
        <div class="stat-row">
          <span>Folders:</span>
          <strong>{{ treeStats.folders.toLocaleString() }}</strong>
        </div>
        <div class="stat-row">
          <span>Files:</span>
          <strong>{{ treeStats.files.toLocaleString() }}</strong>
        </div>
        <div class="stat-row">
          <span>Selected:</span>
          <strong>{{ selectedNodes.length }}</strong>
        </div>
      </div>

      <!-- Move Log -->
      <div class="move-log">
        <h3>🔄 Recent Moves</h3>
        <div v-if="moveLog.length === 0" class="empty-log">
          Drag & drop nodes to see moves...
        </div>
        <div v-else class="log-entries">
          <div v-for="(log, idx) in moveLog" :key="idx" class="log-entry">
            {{ log }}
          </div>
        </div>
      </div>

      <!-- Action Log -->
      <div class="action-log">
        <h3>⚡ Recent Actions</h3>
        <div v-if="actionLog.length === 0" class="empty-log">
          Right-click or use action buttons...
        </div>
        <div v-else class="log-entries">
          <div
            v-for="(log, idx) in actionLog"
            :key="idx"
            class="log-entry log-entry--action"
          >
            {{ log }}
          </div>
        </div>
      </div>

      <!-- Instructions -->
      <div class="instructions">
        <h3>💡 Test Instructions</h3>
        <ul>
          <li><strong>Click</strong> to select items</li>
          <li><strong>Ctrl/Cmd + Click</strong> for multi-select</li>
          <li><strong>Shift + Click</strong> for range select</li>
          <li>
            <strong>Drag multiple items</strong> - Select multiple items then
            drag to move them all together (shows count in drag preview)
          </li>
          <li>
            <strong>Double-click</strong> or <strong>chevron</strong> to
            expand/collapse
          </li>
          <li>
            <strong>Arrow keys</strong> for keyboard navigation (auto-scrolls to
            focused item)
          </li>
          <li>
            <strong>Drag & drop</strong> to reorder or move into folders (toggle
            "Allow Reordering" to test both modes)
          </li>
          <li>
            <strong>Hover</strong> anywhere over a closed folder during drag to
            auto-expand after 500ms
          </li>
          <li>
            <strong>Drag near edges</strong> (top/bottom 50px) to auto-scroll
          </li>
          <li>
            <strong>Search & Focus</strong> to jump to specific items instantly
            (auto-expands parent folders)
          </li>
          :class="`theme-${selectedTheme}`"
          <li>
            <strong>Right-click</strong> for context menu with actions (rename,
            duplicate, share, delete)
          </li>
          <li>
            <strong>Action buttons</strong> appear on hover (rename, share,
            delete)
          </li>
          <li>
            <strong>Inline editing</strong> with Enter/Esc to confirm/cancel
          </li>
        </ul>
      </div>
    </div>

    <!-- Tree Container -->
    <div class="tree-container" :class="`theme-${selectedTheme}`">
      <BaseContextMenu
        :context-menu-items="contextMenuItems"
        @on-clear-context-menu="clearContextMenu"
      >
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
              class="action-button"
              title="Rename"
              @click.stop="handleQuickAction('rename', node.id)"
            >
              <Edit2 :size="14" />
            </button>
            <button
              class="action-button"
              title="Share"
              @click.stop="handleQuickAction('share', node.id)"
            >
              <Share2 :size="14" />
            </button>
            <button
              class="action-button action-button--danger"
              title="Delete"
              @click.stop="handleQuickAction('delete', node.id)"
            >
              <Trash2 :size="14" />
            </button>
          </template>
        </FileTree>
      </BaseContextMenu>
    </div>
  </div>
</template>

<style scoped>
/* 
 * Tree Demo Styles
 * Uses CSS variables from your design system
 * Works in both light and dark modes
 */

.demo-container {
  display: flex;
  height: 100vh;
  width: 100%;
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  font-family: var(--system-ui);
}

.controls-panel {
  width: 350px;
  padding: 20px;
  background-color: hsl(var(--card));
  border-right: 1px solid hsl(var(--border));
  overflow-y: auto;
  flex-shrink: 0;
}

.controls-panel h2 {
  margin: 0 0 20px 0;
  font-size: 20px;
  font-weight: 600;
}

.controls-panel h3 {
  margin: 20px 0 10px 0;
  font-size: 14px;
  font-weight: 600;
  color: hsl(var(--muted-foreground));
}

.control-group {
  margin-bottom: 15px;
}

.control-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
}

.control-group select {
  width: 100%;
  padding: 8px;
  margin-bottom: 8px;
  background-color: hsl(var(--input));
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius-md);
  color: hsl(var(--foreground));
  font-size: 13px;
}

.btn-primary,
.btn-secondary {
  padding: 8px 16px;
  border: none;
  border-radius: var(--radius-md);
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-primary {
  width: 100%;
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-secondary {
  background-color: hsl(var(--secondary));
  color: hsl(var(--secondary-foreground));
  margin-right: 8px;
}

.btn-secondary:hover {
  background-color: hsl(var(--secondary) / 0.8);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  user-select: none;
}

.checkbox-input {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: hsl(var(--primary));
}

.help-text {
  margin-top: 6px;
  padding: 8px;
  font-size: 11px;
  background-color: hsl(var(--muted));
  border-left: 3px solid hsl(var(--primary));
  border-radius: var(--radius-sm);
  color: hsl(var(--muted-foreground));
}

.metrics,
.stats,
.move-log,
.action-log,
.focus-feature,
.instructions {
  margin-top: 20px;
  padding: 15px;
  background-color: hsl(var(--muted));
  border-radius: var(--radius-lg);
}

.metric-row,
.stat-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 13px;
}

.metric-row strong,
.stat-row strong {
  color: hsl(var(--primary));
}

.empty-log {
  padding: 10px;
  text-align: center;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  font-style: italic;
}

.log-entries {
  max-height: 200px;
  overflow-y: auto;
}

.log-entry {
  padding: 6px 8px;
  margin-bottom: 4px;
  background-color: hsl(var(--card));
  border-left: 3px solid hsl(var(--primary));
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-family: 'Courier New', monospace;
}

.log-entry--action {
  border-left-color: hsl(var(--chart-2));
}

.instructions ul {
  margin: 0;
  padding-left: 20px;
  font-size: 12px;
  line-height: 1.8;
}

.instructions li {
  margin-bottom: 6px;
}

.instructions strong {
  color: hsl(var(--primary));
}

.tree-container {
  flex: 1;
  padding: 20px;
  overflow: hidden;
}

/* Scrollbar styling */
.controls-panel::-webkit-scrollbar {
  width: 8px;
}

.controls-panel::-webkit-scrollbar-thumb {
  background-color: hsl(var(--muted-foreground) / 0.3);
  border-radius: var(--radius-sm);
}

.controls-panel::-webkit-scrollbar-thumb:hover {
  background-color: hsl(var(--muted-foreground) / 0.5);
}

.log-entries::-webkit-scrollbar {
  width: 6px;
}

.log-entries::-webkit-scrollbar-thumb {
  background-color: hsl(var(--muted-foreground) / 0.3);
  border-radius: var(--radius-sm);
}

/* Focus Feature Styles */
.focus-feature h3 {
  margin: 0 0 12px 0;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  background-color: hsl(var(--input));
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius-md);
  color: hsl(var(--foreground));
  font-size: 13px;
  outline: none;
}

.search-input:focus {
  border-color: hsl(var(--ring));
}

.search-results {
  margin-top: 12px;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius-md);
  background-color: hsl(var(--card));
}

.search-results-header {
  padding: 8px 12px;
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  border-bottom: 1px solid hsl(var(--border));
  background-color: hsl(var(--muted));
}

.search-results-list {
  padding: 4px;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  cursor: pointer;
  border-radius: var(--radius-sm);
  font-size: 12px;
  transition: background-color 0.15s;
}

.search-result-item:hover {
  background-color: hsl(var(--accent));
}

.result-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.result-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: hsl(var(--foreground));
}

.result-depth {
  font-size: 10px;
  color: hsl(var(--muted-foreground));
  flex-shrink: 0;
}

.search-results::-webkit-scrollbar {
  width: 6px;
}

.search-results::-webkit-scrollbar-thumb {
  background-color: hsl(var(--muted-foreground) / 0.3);
  border-radius: var(--radius-sm);
}

/* Action Buttons */
.action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background-color: transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: hsl(var(--foreground));
  transition: all 0.15s ease;
}

.action-button:hover {
  background-color: hsl(var(--accent));
  color: hsl(var(--accent-foreground));
}

.action-button--danger:hover {
  background-color: hsl(var(--destructive) / 0.2);
  color: hsl(var(--destructive));
}

.action-button:active {
  transform: scale(0.95);
}

/* Theme Variants */
/* VSCode Dark Theme */
.theme-vscode {
  --tree-bg: oklch(0.15 0 0);
  --tree-text: oklch(0.8 0 0);
  --tree-row-hover-bg: oklch(0.2 0 0);
  --tree-row-selected-bg: oklch(0.3 0.08 230 / 0.5);
  --tree-row-selected-hover-bg: oklch(0.35 0.08 230 / 0.6);
  --tree-row-focus-ring: oklch(0.5 0.18 230);
  --tree-indicator-color: oklch(0.5 0.18 230);
  --tree-drop-inside-bg: oklch(0.3 0.08 230 / 0.3);
  --tree-chevron-hover-bg: oklch(0.25 0 0);
  --drag-preview-bg: linear-gradient(
    to bottom right,
    oklch(0.5 0.18 230 / 0.95),
    oklch(0.4 0.18 230 / 0.98)
  );
  --drag-preview-text: oklch(1 0 0);
}

/* GitHub Light Theme */
.theme-github-light {
  --tree-bg: oklch(1 0 0);
  --tree-text: oklch(0.2 0 0);
  --tree-row-hover-bg: oklch(0.95 0 0);
  --tree-row-selected-bg: oklch(0.65 0.15 250 / 0.35);
  --tree-row-selected-hover-bg: oklch(0.65 0.15 250 / 0.45);
  --tree-row-focus-ring: oklch(0.5 0.18 250);
  --tree-indicator-color: oklch(0.5 0.18 250);
  --tree-drop-inside-bg: oklch(0.65 0.15 250 / 0.2);
  --tree-chevron-hover-bg: oklch(0.92 0 0);
  --drag-preview-bg: linear-gradient(
    to bottom right,
    oklch(0.5 0.18 250 / 0.95),
    oklch(0.4 0.18 250 / 0.98)
  );
  --drag-preview-text: oklch(1 0 0);
}

/* GitHub Dark Theme */
.theme-github-dark {
  --tree-bg: oklch(0.12 0 0);
  --tree-text: oklch(0.8 0 0);
  --tree-row-hover-bg: oklch(0.18 0 0);
  --tree-row-selected-bg: oklch(0.55 0.2 250 / 0.2);
  --tree-row-selected-hover-bg: oklch(0.55 0.2 250 / 0.3);
  --tree-row-focus-ring: oklch(0.6 0.2 250);
  --tree-indicator-color: oklch(0.6 0.2 250);
  --tree-drop-inside-bg: oklch(0.55 0.2 250 / 0.15);
  --tree-chevron-hover-bg: oklch(0.2 0 0);
  --drag-preview-bg: linear-gradient(
    to bottom right,
    oklch(0.6 0.2 250 / 0.95),
    oklch(0.5 0.2 250 / 0.98)
  );
  --drag-preview-text: oklch(1 0 0);
}

/* Notion Theme */
.theme-notion {
  --tree-bg: oklch(0.99 0 0);
  --tree-text: oklch(0.25 0 0);
  --tree-row-hover-bg: oklch(0.96 0 0);
  --tree-row-selected-bg: oklch(0.65 0.12 200 / 0.25);
  --tree-row-selected-hover-bg: oklch(0.65 0.12 200 / 0.35);
  --tree-row-focus-ring: oklch(0.65 0.12 200);
  --tree-indicator-color: oklch(0.65 0.12 200);
  --tree-drop-inside-bg: oklch(0.65 0.12 200 / 0.15);
  --tree-chevron-hover-bg: oklch(0.94 0 0);
  --drag-preview-bg: linear-gradient(
    to bottom right,
    oklch(0.65 0.12 200 / 0.95),
    oklch(0.55 0.12 200 / 0.98)
  );
  --drag-preview-text: oklch(1 0 0);
}

/* Forest Green Theme */
.theme-forest {
  --tree-bg: oklch(0.18 0.02 150);
  --tree-text: oklch(0.85 0.05 140);
  --tree-row-hover-bg: oklch(0.22 0.03 150);
  --tree-row-selected-bg: oklch(0.45 0.15 140 / 0.4);
  --tree-row-selected-hover-bg: oklch(0.45 0.15 140 / 0.5);
  --tree-row-focus-ring: oklch(0.55 0.18 140);
  --tree-indicator-color: oklch(0.6 0.2 140);
  --tree-drop-inside-bg: oklch(0.45 0.15 140 / 0.25);
  --tree-chevron-hover-bg: oklch(0.25 0.03 150);
  --drag-preview-bg: linear-gradient(
    to bottom right,
    oklch(0.5 0.18 140 / 0.95),
    oklch(0.4 0.18 140 / 0.98)
  );
  --drag-preview-text: oklch(1 0 0);
}

/* Ocean Blue Theme */
.theme-ocean {
  --tree-bg: oklch(0.16 0.03 240);
  --tree-text: oklch(0.85 0.05 220);
  --tree-row-hover-bg: oklch(0.2 0.04 240);
  --tree-row-selected-bg: oklch(0.5 0.18 210 / 0.4);
  --tree-row-selected-hover-bg: oklch(0.5 0.18 210 / 0.5);
  --tree-row-focus-ring: oklch(0.6 0.2 210);
  --tree-indicator-color: oklch(0.65 0.22 210);
  --tree-drop-inside-bg: oklch(0.5 0.18 210 / 0.25);
  --tree-chevron-hover-bg: oklch(0.22 0.04 240);
  --drag-preview-bg: linear-gradient(
    to bottom right,
    oklch(0.55 0.2 210 / 0.95),
    oklch(0.45 0.2 210 / 0.98)
  );
  --drag-preview-text: oklch(1 0 0);
}

/* Sunset Orange Theme */
.theme-sunset {
  --tree-bg: oklch(0.2 0.03 30);
  --tree-text: oklch(0.9 0.05 50);
  --tree-row-hover-bg: oklch(0.25 0.04 30);
  --tree-row-selected-bg: oklch(0.6 0.2 40 / 0.4);
  --tree-row-selected-hover-bg: oklch(0.6 0.2 40 / 0.5);
  --tree-row-focus-ring: oklch(0.65 0.22 40);
  --tree-indicator-color: oklch(0.7 0.24 40);
  --tree-drop-inside-bg: oklch(0.6 0.2 40 / 0.25);
  --tree-chevron-hover-bg: oklch(0.28 0.04 30);
  --drag-preview-bg: linear-gradient(
    to bottom right,
    oklch(0.65 0.22 40 / 0.95),
    oklch(0.55 0.22 40 / 0.98)
  );
  --drag-preview-text: oklch(0.1 0 0);
}
</style>
