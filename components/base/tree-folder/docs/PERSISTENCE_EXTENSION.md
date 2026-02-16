# FileTree Persistence Extension

This guide explains the clean extension-based persistence architecture used by `FileTree`.

## Goal

Support one `FileTree` API with multiple persistence backends:

- Web app: localStorage
- Electron app: local persisted storage bridge
- API sync: pull/push expanded ids

## Files

- Main plugin implementation: `extensions/tree-persistence.ts`
- Backward-compatible re-export: `persistence-extension.ts`
- Public exports: `index.ts`

## Core Concepts

### 1) `FileTree` extension contract

`FileTree` accepts `persistenceExtension` prop with this shape:

- `loadExpandedIds(context)`
- `saveExpandedIds(expandedIds, context)`
- `clearExpandedIds(context)`

This keeps the tree reusable and persistence-agnostic.

### 2) Plugin factory

Use `createTreePersistencePlugin(options)` to create a pluggable extension.

It supports:

- mode selection: `auto | web | electron`
- storage adapters (`webStorage`, `electronStorage`)
- API sync (`pullExpandedIds`, `pushExpandedIds`)
- debounce for push updates (`pushDebounceMs`)
- async preload (`preload`) and flush (`flush`)

## Quick Usage

```ts
import {
  createTreePersistencePlugin,
  createWebLocalStorageAdapter,
} from '~/components/base/tree-folder';

const persistence = createTreePersistencePlugin({
  mode: 'web',
  webStorage: createWebLocalStorageAdapter(),
  apiSync: {
    pullExpandedIds: key => $fetch<string[] | null>(`/api/tree/${key}`),
    pushExpandedIds: (key, ids) =>
      $fetch(`/api/tree/${key}`, {
        method: 'POST',
        body: { expandedIds: ids },
      }),
  },
});
```

```vue
<FileTree
  :initial-data="treeData"
  :storage-key="storageKey"
  :persistence-extension="persistence"
/>
```

## Parent Hydration Pattern (recommended)

`FileTree` load hook is synchronous, so for async backends (Electron/API) preload in parent first:

```ts
const persistence = createTreePersistencePlugin({
  mode: 'electron',
  electronStorage: createElectronStorageAdapter(window.electronStore),
  apiSync: {
    pullExpandedIds: key => $fetch(`/api/tree/${key}`),
    pushExpandedIds: (key, ids) =>
      $fetch(`/api/tree/${key}`, {
        method: 'POST',
        body: { expandedIds: ids },
      }),
  },
});

const expandedIds = ref<string[]>([]);

onMounted(async () => {
  const loaded = await persistence.preload({ storageKey: storageKey.value });
  expandedIds.value = loaded ?? [];
});
```

```vue
<FileTree
  :expanded-ids="expandedIds"
  :persistence-extension="persistence"
  @update:expanded-ids="expandedIds = $event"
/>
```

## Electron Adapter

Provide a bridge object that wraps your Electron preload API:

```ts
const electronAdapter = createElectronStorageAdapter({
  getItem: key => window.electronApi.storeGet(key),
  setItem: (key, value) => window.electronApi.storeSet(key, value),
  removeItem: key => window.electronApi.storeDelete(key),
});
```

## API Sync Notes

- Push is debounced by default (400ms).
- Use `preferRemote: true` when remote should override local on preload.
- Call `await persistence.flush()` before app shutdown/navigation if you need to guarantee final push delivery.

## Clean-Code Decisions

- persistence is isolated from rendering logic
- adapters are single-responsibility and composable
- backward compatibility is preserved (`persistence-extension.ts`)
- parent controls hydration timing for async sources
