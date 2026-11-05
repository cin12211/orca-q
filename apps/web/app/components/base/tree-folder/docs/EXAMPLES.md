# Tree Folder Component - Usage Examples

## Example 1: Basic File Explorer

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { FileTree } from '@/components/base/tree-folder';
import type { FileNode } from '@/components/base/tree-folder';

const myFiles = ref<Record<string, FileNode>>({
  root: {
    id: 'root',
    parentId: null,
    name: 'My Documents',
    type: 'folder',
    depth: 0,
    children: ['file-1', 'folder-1'],
  },
  'file-1': {
    id: 'file-1',
    parentId: 'root',
    name: 'notes.txt',
    type: 'file',
    depth: 1,
  },
  'folder-1': {
    id: 'folder-1',
    parentId: 'root',
    name: 'Projects',
    type: 'folder',
    depth: 1,
    children: ['file-2', 'file-3'],
  },
  'file-2': {
    id: 'file-2',
    parentId: 'folder-1',
    name: 'README.md',
    type: 'file',
    depth: 2,
  },
  'file-3': {
    id: 'file-3',
    parentId: 'folder-1',
    name: 'index.ts',
    type: 'file',
    depth: 2,
  },
});

const handleSelect = (nodeIds: string[]) => {
  console.log(
    'Selected:',
    nodeIds.map(id => myFiles.value[id].name)
  );
};

const handleMove = (sourceId: string, targetId: string, position: string) => {
  console.log(
    `Moving ${myFiles.value[sourceId].name} ${position} ${myFiles.value[targetId].name}`
  );
  // Implement your move logic here
};
</script>

<template>
  <div style="height: 600px;">
    <FileTree
      :initial-data="myFiles"
      storage-key="my_file_explorer"
      @select="handleSelect"
      @move="handleMove"
    />
  </div>
</template>
```

## Example 2: Loading Data from API

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { FileTree } from '@/components/base/tree-folder';
import type { FileNode } from '@/components/base/tree-folder';

const treeData = ref<Record<string, FileNode>>({});
const loading = ref(true);

// Convert hierarchical data to flat map
const convertToFlatMap = (
  nodes: any[],
  parentId: string | null = null,
  depth = 0
): Record<string, FileNode> => {
  const flatMap: Record<string, FileNode> = {};

  nodes.forEach(node => {
    flatMap[node.id] = {
      id: node.id,
      parentId,
      name: node.name,
      type: node.type,
      depth,
      children: node.children ? node.children.map((c: any) => c.id) : undefined,
    };

    // Recursively process children
    if (node.children) {
      const childrenMap = convertToFlatMap(node.children, node.id, depth + 1);
      Object.assign(flatMap, childrenMap);
    }
  });

  return flatMap;
};

onMounted(async () => {
  try {
    const response = await fetch('/api/filesystem');
    const data = await response.json();
    treeData.value = convertToFlatMap(data);
  } catch (error) {
    console.error('Failed to load tree data:', error);
  } finally {
    loading.value = false;
  }
});

const handleMove = async (
  sourceId: string,
  targetId: string,
  position: string
) => {
  // Optimistically update UI
  const sourceNode = treeData.value[sourceId];
  const oldParentId = sourceNode.parentId;

  // Update local state (simplified - you'd need complete move logic)
  // ...

  // Sync to backend
  try {
    await fetch('/api/filesystem/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceId, targetId, position }),
    });
  } catch (error) {
    // Rollback on failure
    console.error('Move failed:', error);
    // Restore old state...
  }
};
</script>

<template>
  <div style="height: 600px;">
    <div v-if="loading">Loading file tree...</div>
    <FileTree
      v-else
      :initial-data="treeData"
      storage-key="api_file_tree"
      @move="handleMove"
    />
  </div>
</template>
```

## Example 3: Programmatic Control

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { FileTree } from '@/components/base/tree-folder';
import type { FileNode } from '@/components/base/tree-folder';

const treeRef = ref<InstanceType<typeof FileTree> | null>(null);
const treeData = ref<Record<string, FileNode>>({
  // ... your tree data
});

// Control methods
const expandAll = () => {
  treeRef.value?.expandAll();
};

const collapseAll = () => {
  treeRef.value?.collapseAll();
};

const searchAndExpand = (searchTerm: string) => {
  // Find matching nodes
  const matchingIds = Object.values(treeData.value)
    .filter(node => node.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .map(node => node.id);

  // You could extend FileTree to expose a method to expand specific nodes
  console.log('Matching nodes:', matchingIds);
};
</script>

<template>
  <div>
    <div style="padding: 10px; display: flex; gap: 10px;">
      <button @click="expandAll">Expand All</button>
      <button @click="collapseAll">Collapse All</button>
      <input
        type="text"
        placeholder="Search..."
        @input="searchAndExpand(($event.target as HTMLInputElement).value)"
      />
    </div>

    <div style="height: 500px;">
      <FileTree
        ref="treeRef"
        :initial-data="treeData"
        storage-key="controlled_tree"
      />
    </div>
  </div>
</template>
```

## Example 4: Context Menu Integration

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { FileTree } from '@/components/base/tree-folder';
import type { FileNode } from '@/components/base/tree-folder';

const treeData = ref<Record<string, FileNode>>({
  /* ... */
});
const contextMenu = ref<{ x: number; y: number; nodeId: string } | null>(null);

const handleContextMenu = (event: MouseEvent, nodeId: string) => {
  event.preventDefault();
  contextMenu.value = {
    x: event.clientX,
    y: event.clientY,
    nodeId,
  };
};

const handleMenuAction = (action: string) => {
  if (!contextMenu.value) return;

  const node = treeData.value[contextMenu.value.nodeId];

  switch (action) {
    case 'rename':
      console.log('Rename', node.name);
      break;
    case 'delete':
      console.log('Delete', node.name);
      break;
    case 'copy':
      console.log('Copy', node.name);
      break;
  }

  contextMenu.value = null;
};

const handleClickOutside = () => {
  contextMenu.value = null;
};
</script>

<template>
  <div @click.right.prevent @contextmenu.prevent style="position: relative;">
    <FileTree
      :initial-data="treeData"
      storage-key="context_menu_tree"
      @contextmenu.prevent="
        handleContextMenu($event, $event.target.dataset.nodeId)
      "
    />

    <!-- Context Menu -->
    <div
      v-if="contextMenu"
      class="context-menu"
      :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
      @click.stop
    >
      <div @click="handleMenuAction('rename')">Rename</div>
      <div @click="handleMenuAction('copy')">Copy</div>
      <div @click="handleMenuAction('delete')">Delete</div>
    </div>

    <!-- Click outside handler -->
    <div v-if="contextMenu" class="overlay" @click="handleClickOutside" />
  </div>
</template>

<style scoped>
.context-menu {
  position: fixed;
  background: #2d2d30;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  padding: 4px 0;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.context-menu div {
  padding: 6px 16px;
  cursor: pointer;
  font-size: 13px;
}

.context-menu div:hover {
  background: #3e3e42;
}

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
}
</style>
```

## Example 5: Database Schema Explorer

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import { FileTree } from '@/components/base/tree-folder';
import type { FileNode } from '@/components/base/tree-folder';

// Simulate database schema
const createSchemaTree = () => {
  const nodes: Record<string, FileNode> = {};

  // Root
  nodes['db-root'] = {
    id: 'db-root',
    parentId: null,
    name: 'PostgreSQL Database',
    type: 'folder',
    depth: 0,
    children: ['schema-public', 'schema-auth'],
  };

  // Public Schema
  nodes['schema-public'] = {
    id: 'schema-public',
    parentId: 'db-root',
    name: 'public',
    type: 'folder',
    depth: 1,
    children: ['table-users', 'table-posts'],
  };

  // Tables
  nodes['table-users'] = {
    id: 'table-users',
    parentId: 'schema-public',
    name: '📋 users',
    type: 'folder',
    depth: 2,
    children: ['col-id', 'col-email', 'col-name'],
  };

  // Columns
  nodes['col-id'] = {
    id: 'col-id',
    parentId: 'table-users',
    name: '🔑 id (integer)',
    type: 'file',
    depth: 3,
  };

  nodes['col-email'] = {
    id: 'col-email',
    parentId: 'table-users',
    name: '📧 email (varchar)',
    type: 'file',
    depth: 3,
  };

  nodes['col-name'] = {
    id: 'col-name',
    parentId: 'table-users',
    name: '👤 name (varchar)',
    type: 'file',
    depth: 3,
  };

  // More tables...
  nodes['table-posts'] = {
    id: 'table-posts',
    parentId: 'schema-public',
    name: '📋 posts',
    type: 'folder',
    depth: 2,
    children: [],
  };

  nodes['schema-auth'] = {
    id: 'schema-auth',
    parentId: 'db-root',
    name: 'auth',
    type: 'folder',
    depth: 1,
    children: [],
  };

  return nodes;
};

const schemaData = ref(createSchemaTree());

const handleSelect = (nodeIds: string[]) => {
  const selectedNodes = nodeIds.map(id => schemaData.value[id]);
  console.log('Selected schema items:', selectedNodes);

  // Could open a detail panel showing table structure, etc.
};
</script>

<template>
  <div style="height: 600px; background: #1e1e1e;">
    <div style="padding: 16px; border-bottom: 1px solid #3e3e42;">
      <h3 style="margin: 0; color: #cccccc;">Database Explorer</h3>
    </div>
    <FileTree
      :initial-data="schemaData"
      storage-key="database_schema_tree"
      @select="handleSelect"
    />
  </div>
</template>
```

## Example 6: Project Structure with File Icons

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { FileTree } from '@/components/base/tree-folder';
import type { FileNode } from '@/components/base/tree-folder';

// Extend FileNode with custom metadata
interface ExtendedFileNode extends FileNode {
  icon?: string;
  color?: string;
}

const projectFiles = ref<Record<string, ExtendedFileNode>>({
  root: {
    id: 'root',
    parentId: null,
    name: 'my-vue-app',
    type: 'folder',
    depth: 0,
    icon: '📁',
    children: ['src', 'public', 'package-json'],
  },
  src: {
    id: 'src',
    parentId: 'root',
    name: 'src',
    type: 'folder',
    depth: 1,
    icon: '📂',
    children: ['app-vue', 'main-ts'],
  },
  'app-vue': {
    id: 'app-vue',
    parentId: 'src',
    name: 'App.vue',
    type: 'file',
    depth: 2,
    icon: '🟩',
    color: '#41b883',
  },
  'main-ts': {
    id: 'main-ts',
    parentId: 'src',
    name: 'main.ts',
    type: 'file',
    depth: 2,
    icon: '🔷',
    color: '#3178c6',
  },
  public: {
    id: 'public',
    parentId: 'root',
    name: 'public',
    type: 'folder',
    depth: 1,
    icon: '📂',
    children: [],
  },
  'package-json': {
    id: 'package-json',
    parentId: 'root',
    name: 'package.json',
    type: 'file',
    depth: 1,
    icon: '📦',
    color: '#cb3837',
  },
});

const selectedFile = ref<string | null>(null);

const handleSelect = (nodeIds: string[]) => {
  if (nodeIds.length === 1) {
    const node = projectFiles.value[nodeIds[0]];
    if (node.type === 'file') {
      selectedFile.value = node.name;
      // Open file in editor...
    }
  }
};
</script>

<template>
  <div style="display: flex; height: 600px;">
    <div style="width: 300px; background: #1e1e1e;">
      <FileTree
        :initial-data="projectFiles"
        storage-key="project_files"
        @select="handleSelect"
      />
    </div>

    <div style="flex: 1; padding: 20px; background: #252526; color: #d4d4d4;">
      <h3 v-if="selectedFile">Editing: {{ selectedFile }}</h3>
      <p v-else>Select a file to edit</p>
    </div>
  </div>
</template>
```

## Tips for Production Use

### 1. Lazy Loading Children

For very large trees, load children on-demand:

```typescript
const loadChildren = async (folderId: string) => {
  const response = await fetch(`/api/folders/${folderId}/children`);
  const children = await response.json();

  // Add children to tree
  children.forEach(child => {
    treeData.value[child.id] = child;
  });

  // Update parent's children array
  treeData.value[folderId].children = children.map(c => c.id);
};
```

### 2. Optimistic Updates

Update UI immediately, sync to server in background:

```typescript
const handleMove = async (sourceId, targetId, position) => {
  // 1. Save current state for rollback
  const snapshot = { ...treeData.value };

  // 2. Update UI immediately
  updateTreeStructure(sourceId, targetId, position);

  // 3. Sync to server
  try {
    await api.moveNode(sourceId, targetId, position);
  } catch (error) {
    // 4. Rollback on error
    treeData.value = snapshot;
    showError('Failed to move item');
  }
};
```

### 3. Search/Filter

Implement tree filtering:

```typescript
const filterTree = (searchTerm: string) => {
  if (!searchTerm) {
    // Show all nodes
    return allNodes.value;
  }

  // Find matching nodes and their ancestors
  const matches = new Set<string>();

  Object.values(allNodes.value).forEach(node => {
    if (node.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      matches.add(node.id);

      // Add all ancestors
      let current = node;
      while (current.parentId) {
        matches.add(current.parentId);
        current = allNodes.value[current.parentId];
      }
    }
  });

  // Return filtered nodes
  return Object.fromEntries(
    Object.entries(allNodes.value).filter(([id]) => matches.has(id))
  );
};
```

---

For more examples and detailed API documentation, see [README.md](./README.md)
