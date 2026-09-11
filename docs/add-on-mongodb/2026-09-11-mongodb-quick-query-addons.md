# MongoDB QuickQuery Add-ons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Loại bỏ Table view mode khỏi MongoDB QuickQuery, bổ sung modal `+ Insert` (hỗ trợ nhập Document hoặc Import CSV/JSON), thêm modal `Export Data` (hỗ trợ Current results / Full collections với 3 chuẩn Extended JSON), và khôi phục cột số thứ tự `#` trong `MongoDatabaseOverview`.

**Architecture:** Thiết kế modular tuân thủ Module Architecture. Tách riêng các modal độc lập vào `components/modules/quick-query/mongodb/components/`, tích hợp qua event handlers trên ControlBar và Detail Container; cung cấp 2 server API chuyên dụng cho stream import và export dữ liệu; dọn sạch triệt để mã nguồn thừa sau khi xoá Table view mode; và tái sử dụng `createHashIndexColumnDef` cho cột số thứ tự.

**Tech Stack:** Vue 3 (Composition API, `<script setup>`), TypeScript, Nuxt 3 server engine (h3), MongoDB driver (BSON/EJSON), Tailwind CSS, Radix/shadcn-vue UI primitives, AG Grid Community.

## Global Constraints

- **Không commit code lên git** (theo yêu cầu của user, các bước commit sẽ được bỏ qua).
- Mọi thay đổi mã nguồn phải vượt qua `bun run typecheck` và `bun test:unit`.
- Tuân thủ nghiêm ngặt quy tắc Module Architecture: Mọi folder con đều có `index.ts`, không import file nội bộ từ bên ngoài module.
- Tái sử dụng các UI primitives từ `components/ui/` (`Dialog`, `Button`, `Tabs`, `DropdownMenu`, `RadioGroup`, `Label`, `Input`, `Tooltip`) và icon chuẩn `hugeicons:` (nếu không có thì dùng `lucide:`).

---

### Task 1: Xóa Table View Mode & Dọn dẹp Code thừa

**Files:**
- Delete: `components/modules/quick-query/mongodb/components/MongoCollectionTableView.vue`
- Delete: `components/modules/quick-query/mongodb/utils/buildMongoColumnDefs.ts`
- Delete: `test/unit/components/modules/quick-query/mongodb/buildMongoColumnDefs.spec.ts`
- Modify: `components/modules/quick-query/mongodb/types/mongo-quick-query.types.ts`
- Modify: `components/modules/quick-query/mongodb/components/MongoViewModeSwitcher.vue`
- Modify: `components/modules/quick-query/mongodb/containers/MongoCollectionDetail.vue`
- Modify: `components/modules/quick-query/mongodb/components/index.ts`
- Modify: `components/modules/quick-query/mongodb/utils/index.ts`
- Test: `test/nuxt/components/modules/quick-query/mongodb/MongoViewModeSwitcher.test.ts`
- Test: `test/nuxt/components/modules/quick-query/mongodb/MongoCollectionDetail.test.ts`

**Interfaces:**
- Consumes: `MongoCollectionViewMode` enum
- Produces: `MongoCollectionViewMode` updated without `Table` variant (`List = 'list'`, `Info = 'info'`)

- [ ] **Step 1: Cập nhật failing test cho `MongoViewModeSwitcher` và `MongoCollectionDetail`**

Sửa `test/nuxt/components/modules/quick-query/mongodb/MongoViewModeSwitcher.test.ts` để kiểm tra chỉ còn 2 tab (`List` và `Info`):
```typescript
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import MongoViewModeSwitcher from '~/components/modules/quick-query/mongodb/components/MongoViewModeSwitcher.vue';
import { MongoCollectionViewMode } from '~/components/modules/quick-query/mongodb/types';

describe('MongoViewModeSwitcher', () => {
  it('emits update:modelValue with the clicked mode', async () => {
    const wrapper = mount(MongoViewModeSwitcher, {
      props: { modelValue: MongoCollectionViewMode.Info },
    });

    await wrapper
      .get('[data-testid="mongo-view-mode-list"]')
      .trigger('mousedown', { button: 0 });

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([
      MongoCollectionViewMode.List,
    ]);
  });

  it('marks the active mode tab as selected', () => {
    const wrapper = mount(MongoViewModeSwitcher, {
      props: { modelValue: MongoCollectionViewMode.Info },
    });

    expect(
      wrapper
        .get('[data-testid="mongo-view-mode-info"]')
        .attributes('aria-selected')
    ).toBe('true');
  });

  it('does not render table view tab', () => {
    const wrapper = mount(MongoViewModeSwitcher, {
      props: { modelValue: MongoCollectionViewMode.List },
    });

    expect(wrapper.find('[data-testid="mongo-view-mode-table"]').exists()).toBe(false);
  });
});
```

Sửa `test/nuxt/components/modules/quick-query/mongodb/MongoCollectionDetail.test.ts` để kiểm tra chuyển sang `Info` mode thay vì `Table`:
```typescript
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import MongoCollectionDetail from '~/components/modules/quick-query/mongodb/containers/MongoCollectionDetail.vue';
import { MongoCollectionViewMode } from '~/components/modules/quick-query/mongodb/types';
import TooltipProvider from '~/components/ui/tooltip/TooltipProvider.vue';

const mockFetch = vi.fn().mockResolvedValue({
  documents: [{ _id: '1', name: 'Alice' }],
  total: 1,
  queryTime: 1,
});
vi.stubGlobal('$fetch', mockFetch);

describe('MongoCollectionDetail', () => {
  it('renders the list view by default and switches to info view on mode change', async () => {
    const wrapper = mount(
      {
        components: { MongoCollectionDetail, TooltipProvider },
        template: `<TooltipProvider><MongoCollectionDetail v-bind="$attrs" /></TooltipProvider>`,
      },
      {
        attrs: {
          connectionId: 'c1',
          workspaceId: 'w1',
          databaseName: 'shop',
          collectionName: 'users',
        },
      }
    );
    await flushPromises();

    expect(
      wrapper.findComponent({ name: 'MongoCollectionListView' }).exists()
    ).toBe(true);

    const switcher = wrapper.findComponent({ name: 'MongoViewModeSwitcher' });
    switcher.vm.$emit('update:modelValue', MongoCollectionViewMode.Info);
    await flushPromises();

    expect(
      wrapper.findComponent({ name: 'MongoCollectionListView' }).exists()
    ).toBe(false);
    expect(
      wrapper.findComponent({ name: 'MongoCollectionInfoView' }).exists()
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Chạy test để kiểm tra failing**
```bash
bun test:nuxt test/nuxt/components/modules/quick-query/mongodb/MongoViewModeSwitcher.test.ts
```
Expected: FAIL vì `[data-testid="mongo-view-mode-table"]` vẫn đang tồn tại.

- [ ] **Step 3: Cập nhật `MongoCollectionViewMode` enum**
Mở `components/modules/quick-query/mongodb/types/mongo-quick-query.types.ts`:
```typescript
export enum MongoCollectionViewMode {
  List = 'list',
  Info = 'info',
}
```

- [ ] **Step 4: Cập nhật `MongoViewModeSwitcher.vue`**
Mở `components/modules/quick-query/mongodb/components/MongoViewModeSwitcher.vue`:
```vue
<script setup lang="ts">
import { MongoCollectionViewMode } from '../types';

defineProps<{ modelValue: MongoCollectionViewMode }>();
const emit = defineEmits<{ 'update:modelValue': [MongoCollectionViewMode] }>();
</script>

<template>
  <Tabs
    :model-value="modelValue"
    @update:model-value="
      emit('update:modelValue', $event as MongoCollectionViewMode)
    "
  >
    <TabsList size="xxs" class="grid w-full grid-cols-2">
      <TabsTrigger
        size="xxs"
        :value="MongoCollectionViewMode.List"
        data-testid="mongo-view-mode-list"
        class="font-medium cursor-pointer text-primary/80"
      >
        List
      </TabsTrigger>
      <TabsTrigger
        size="xxs"
        :value="MongoCollectionViewMode.Info"
        data-testid="mongo-view-mode-info"
        class="font-medium cursor-pointer text-primary/80"
      >
        Info
      </TabsTrigger>
    </TabsList>
  </Tabs>
</template>
```

- [ ] **Step 5: Cập nhật `MongoCollectionDetail.vue`**
Xóa import `MongoCollectionTableView`, template ref `tableViewRef`, lệnh `tableViewRef.value?.scrollToTop()` trong watch `skip`, và nhánh render `MongoCollectionTableView`:
```vue
<!-- Trong template phần render viewMode -->
      <MongoCollectionInfoView
        v-if="viewMode === MongoCollectionViewMode.Info"
        :connection="connection"
        :collection-name="collectionName"
        :database-name="databaseName"
      />
      <template v-else>
        <BaseEmpty
          v-if="isEmpty && !error"
          title="No documents found"
          desc="This collection has no documents matching the current query."
        />
        <div
          v-else-if="error"
          class="flex flex-col items-center justify-center h-full gap-2 p-4"
        >
          <Icon name="hugeicons:alert-02" class="text-destructive size-8" />
          <p class="text-sm font-medium text-destructive">Query Error</p>
          <p
            class="text-xs text-muted-foreground text-center max-w-md break-all"
          >
            {{ error }}
          </p>
          <Button size="sm" variant="outline" @click="openErrorModal = true"
            >View Details</Button
          >
        </div>
        <MongoCollectionListView
          v-else
          ref="listViewRef"
          :documents="documents"
          :saving-doc-id="savingDocId"
          :deleting-doc-id="deletingDocId"
          @update-document="handleUpdateDocument"
          @delete-document="onRequestDeleteDocument"
        />
      </template>
```

- [ ] **Step 6: Xoá các file thừa và dọn re-export**
Xoá các file:
- `components/modules/quick-query/mongodb/components/MongoCollectionTableView.vue`
- `components/modules/quick-query/mongodb/utils/buildMongoColumnDefs.ts`
- `test/unit/components/modules/quick-query/mongodb/buildMongoColumnDefs.spec.ts`

Trong `components/modules/quick-query/mongodb/components/index.ts`:
Xoá dòng `export { default as MongoCollectionTableView } from './MongoCollectionTableView.vue';`.

Trong `components/modules/quick-query/mongodb/utils/index.ts`:
Xoá dòng `export * from './buildMongoColumnDefs';`.

- [ ] **Step 7: Chạy test xác minh Task 1**
```bash
bun run typecheck
bun test:nuxt test/nuxt/components/modules/quick-query/mongodb/MongoViewModeSwitcher.test.ts
bun test:nuxt test/nuxt/components/modules/quick-query/mongodb/MongoCollectionDetail.test.ts
```
Expected: PASS toàn bộ.

---

### Task 2: Khôi phục cột '#' trong MongoDatabaseOverview

**Files:**
- Modify: `components/modules/quick-query/mongodb/containers/MongoDatabaseOverview.vue`
- Modify: `test/nuxt/components/modules/quick-query/mongodb/MongoDatabaseOverview.test.ts`

**Interfaces:**
- Consumes: `createHashIndexColumnDef` from `~/components/base/data-grid/utils/gridColumnDefs`
- Produces: `columnDefs` with `#` row number column at index 0

- [ ] **Step 1: Viết failing test kiểm tra cột '#' trong `MongoDatabaseOverview.test.ts`**

Mở `test/nuxt/components/modules/quick-query/mongodb/MongoDatabaseOverview.test.ts`:
```typescript
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import MongoDatabaseOverview from '~/components/modules/quick-query/mongodb/containers/MongoDatabaseOverview.vue';
import { HASH_INDEX_HEADER, HASH_INDEX_ID } from '~/components/base/data-grid/constants';

const openMongoCollectionTab = vi.fn();
vi.mock('~/core/composables/useTabManagement', () => ({
  useTabManagement: () => ({ openMongoCollectionTab }),
}));

const usersSummary = {
  name: 'users',
  properties: [],
  documentCount: 3,
  storageSize: 4096,
  dataSize: 2048,
  avgDocumentSize: 100,
  indexCount: 1,
  totalIndexSize: 512,
};

vi.stubGlobal(
  '$fetch',
  vi.fn().mockResolvedValue({
    collections: [usersSummary],
  })
);

describe('MongoDatabaseOverview', () => {
  it('lists collections and opens a Collection Detail tab on row click', async () => {
    const wrapper = mount(MongoDatabaseOverview, {
      props: { connectionId: 'c1', workspaceId: 'w1', databaseName: 'shop' },
    });
    await flushPromises();

    const grid = wrapper.findComponent({ name: 'BaseDataGrid' });
    expect(grid.props('rowData')).toEqual([usersSummary]);

    grid.vm.$emit('rowClicked', { data: usersSummary });

    expect(openMongoCollectionTab).toHaveBeenCalledWith({
      databaseName: 'shop',
      collectionName: 'users',
    });
  });

  it('includes hash index column # at first position in columnDefs', async () => {
    const wrapper = mount(MongoDatabaseOverview, {
      props: { connectionId: 'c1', workspaceId: 'w1', databaseName: 'shop' },
    });
    await flushPromises();

    const grid = wrapper.findComponent({ name: 'BaseDataGrid' });
    const columnDefs = grid.props('columnDefs') as any[];
    expect(columnDefs[0].colId).toBe(HASH_INDEX_ID);
    expect(columnDefs[0].headerName).toBe(HASH_INDEX_HEADER);
  });
});
```

- [ ] **Step 2: Chạy test để verify test fail**
```bash
bun test:nuxt test/nuxt/components/modules/quick-query/mongodb/MongoDatabaseOverview.test.ts
```
Expected: FAIL vì `columnDefs[0].colId` đang là `'name'` thay vì `HASH_INDEX_ID`.

- [ ] **Step 3: Cập nhật `columnDefs` trong `MongoDatabaseOverview.vue`**
Mở `components/modules/quick-query/mongodb/containers/MongoDatabaseOverview.vue`:
```typescript
import { createHashIndexColumnDef } from '~/components/base/data-grid/utils/gridColumnDefs';

// ...
const columnDefs: ColDef<MongoCollectionSummary>[] = [
  createHashIndexColumnDef({
    valueGetter: params =>
      params.node?.rowIndex != null ? params.node.rowIndex + 1 : '',
  }),
  {
    field: 'name',
    headerName: 'Collection name',
    sortable: true,
    filter: 'agTextColumnFilter',
  },
  // ... các cột còn lại giữ nguyên
];
```

- [ ] **Step 4: Chạy test để verify pass**
```bash
bun test:nuxt test/nuxt/components/modules/quick-query/mongodb/MongoDatabaseOverview.test.ts
```
Expected: PASS.

---

### Task 3: Thêm Button '+ Insert' & Modal Insert Document / Import File

**Files:**
- Create: `components/modules/quick-query/mongodb/components/MongoInsertModal.vue`
- Create: `server/api/mongodb/import-collection.post.ts`
- Modify: `components/modules/quick-query/mongodb/components/MongoQuickQueryControlBar.vue`
- Modify: `components/modules/quick-query/mongodb/containers/MongoCollectionDetail.vue`
- Modify: `components/modules/quick-query/mongodb/components/index.ts`
- Test: `test/nuxt/components/modules/quick-query/mongodb/MongoInsertModal.test.ts`

**Interfaces:**
- Consumes: `/api/mongodb/quick-query-mutation` with `operation: 'insert'`, `/api/mongodb/import-collection`
- Produces: `MongoInsertModal.vue`, `onInsertClick` event on `MongoQuickQueryControlBar`

- [ ] **Step 1: Viết test cho `MongoInsertModal.vue`**
Tạo `test/nuxt/components/modules/quick-query/mongodb/MongoInsertModal.test.ts`:
```typescript
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import MongoInsertModal from '~/components/modules/quick-query/mongodb/components/MongoInsertModal.vue';

describe('MongoInsertModal', () => {
  it('renders tabs for Insert Document and Import File', () => {
    const wrapper = mount(MongoInsertModal, {
      props: {
        open: true,
        databaseName: 'shop',
        collectionName: 'users',
        connection: { id: 'c1', family: 'mongodb', name: 'Mongo' } as any,
      },
    });

    expect(wrapper.text()).toContain('Insert Document');
    expect(wrapper.text()).toContain('Import JSON or CSV file');
  });

  it('initializes document editor with ObjectId template', () => {
    const wrapper = mount(MongoInsertModal, {
      props: {
        open: true,
        databaseName: 'shop',
        collectionName: 'users',
        connection: { id: 'c1', family: 'mongodb', name: 'Mongo' } as any,
      },
    });

    const editor = wrapper.findComponent({ name: 'BaseCodeEditor' });
    expect(editor.exists()).toBe(true);
    expect(editor.props('modelValue')).toContain('_id: ObjectId(');
  });
});
```

- [ ] **Step 2: Chạy test để verify fail**
```bash
bun test:nuxt test/nuxt/components/modules/quick-query/mongodb/MongoInsertModal.test.ts
```
Expected: FAIL vì `MongoInsertModal.vue` chưa tồn tại.

- [ ] **Step 3: Tạo server endpoint `server/api/mongodb/import-collection.post.ts`**
Tạo file `server/api/mongodb/import-collection.post.ts`:
```typescript
import { createError, defineEventHandler, readMultipartFormData } from 'h3';
import { BSON } from 'mongodb';
import { withMongoDatabase } from '~/server/infrastructure/nosql/mongodb/mongodb.client';

export default defineEventHandler(async event => {
  const parts = await readMultipartFormData(event);
  if (!parts?.length) {
    throw createError({ statusCode: 400, message: 'No file or form data uploaded' });
  }

  let connectionId = '';
  let databaseName = '';
  let collectionName = '';
  let fileBuffer: Buffer | null = null;
  let fileName = '';

  for (const part of parts) {
    if (part.name === 'connectionId') connectionId = part.data.toString('utf-8');
    if (part.name === 'database') databaseName = part.data.toString('utf-8');
    if (part.name === 'collection') collectionName = part.data.toString('utf-8');
    if (part.name === 'file' && part.filename) {
      fileBuffer = part.data;
      fileName = part.filename;
    }
  }

  if (!collectionName || !fileBuffer) {
    throw createError({
      statusCode: 400,
      message: 'collection and file are required',
    });
  }

  const fileContent = fileBuffer.toString('utf-8');
  let docsToInsert: Record<string, unknown>[] = [];

  if (fileName.endsWith('.json')) {
    try {
      const parsed = BSON.EJSON.parse(fileContent);
      docsToInsert = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      // Thử parse dạng newline-delimited JSON (NDJSON)
      const lines = fileContent.split('\n').filter(l => l.trim().length > 0);
      docsToInsert = lines.map(line => BSON.EJSON.parse(line));
    }
  } else if (fileName.endsWith('.csv')) {
    const lines = fileContent.split('\n').filter(l => l.trim().length > 0);
    if (lines.length > 1) {
      const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
        const doc: Record<string, unknown> = {};
        headers.forEach((header, index) => {
          doc[header] = row[index] ?? null;
        });
        docsToInsert.push(doc);
      }
    }
  } else {
    throw createError({ statusCode: 400, message: 'Only .json and .csv files are supported' });
  }

  if (!docsToInsert.length) {
    throw createError({ statusCode: 400, message: 'No documents found in uploaded file' });
  }

  return await withMongoDatabase(
    { connectionId, database: databaseName } as any,
    async database => {
      const collection = database.collection(collectionName);
      const result = await collection.insertMany(docsToInsert as any, { ordered: false });
      return { success: true, insertedCount: result.insertedCount };
    }
  );
});
```

- [ ] **Step 4: Tạo Component `MongoInsertModal.vue`**
Tạo file `components/modules/quick-query/mongodb/components/MongoInsertModal.vue`:
```vue
<script setup lang="ts">
import { useDropZone } from '@vueuse/core';
import { computed, ref, useTemplateRef, watch } from 'vue';
import { toast } from 'vue-sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BaseCodeEditor from '~/components/base/code-editor/BaseCodeEditor.vue';
import { getConnectionParams } from '~/core/helpers/connection-helper';
import type { Connection } from '~/core/stores';
import { getMongoErrorMessage } from '../utils';

const props = defineProps<{
  open: boolean;
  connection: Connection | undefined;
  databaseName: string;
  collectionName: string;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  inserted: [];
}>();

function generateRandomMongoObjectId(): string {
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  const randomHex = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  return timestamp + randomHex;
}

const activeTab = ref<'document' | 'import'>('document');
const editorContent = ref('');
const stagedFile = ref<File | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const isLoading = ref(false);

const resetState = () => {
  editorContent.value = `{\n  _id: ObjectId('${generateRandomMongoObjectId()}')\n}`;
  stagedFile.value = null;
  activeTab.value = 'document';
  if (fileInputRef.value) fileInputRef.value.value = '';
};

watch(
  () => props.open,
  isOpen => {
    if (isOpen) resetState();
  },
  { immediate: true }
);

const dropZoneRef = useTemplateRef<HTMLDivElement>('dropZoneRef');
const { isOverDropZone } = useDropZone(dropZoneRef, {
  onDrop(files) {
    if (!files?.length || isLoading.value) return;
    const file = files[0];
    if (!file.name.endsWith('.json') && !file.name.endsWith('.csv')) {
      toast.error('Please select a valid .json or .csv file');
      return;
    }
    stagedFile.value = file;
  },
});

const handleFileSelect = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (!file.name.endsWith('.json') && !file.name.endsWith('.csv')) {
    toast.error('Please select a valid .json or .csv file');
    return;
  }
  stagedFile.value = file;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const handleInsertDocument = async () => {
  isLoading.value = true;
  try {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(editorContent.value);
    } catch {
      // Hỗ trợ literal _id: ObjectId('...')
      const sanitized = editorContent.value.replace(
        /ObjectId\((['"])([0-9a-fA-F]{24})\1\)/g,
        '"$2"'
      );
      parsed = JSON.parse(sanitized);
    }

    await $fetch('/api/mongodb/quick-query-mutation', {
      method: 'POST',
      body: {
        ...getConnectionParams(props.connection),
        database: props.databaseName,
        collection: props.collectionName,
        operation: 'insert',
        document: parsed,
      },
    });

    toast.success('Document inserted successfully!');
    emit('inserted');
    emit('update:open', false);
  } catch (err) {
    toast.error(getMongoErrorMessage(err));
  } finally {
    isLoading.value = false;
  }
};

const handleImportFile = async () => {
  if (!stagedFile.value) return;
  isLoading.value = true;
  try {
    const formData = new FormData();
    formData.append('connectionId', props.connection?.id ?? '');
    formData.append('database', props.databaseName);
    formData.append('collection', props.collectionName);
    formData.append('file', stagedFile.value);

    const res = await $fetch<{ success: boolean; insertedCount: number }>(
      '/api/mongodb/import-collection',
      {
        method: 'POST',
        body: formData,
      }
    );

    toast.success(`Successfully imported ${res.insertedCount} documents!`);
    emit('inserted');
    emit('update:open', false);
  } catch (err) {
    toast.error(getMongoErrorMessage(err));
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <Dialog :open="open" @update:open="val => emit('update:open', val)">
    <DialogContent class="sm:max-w-xl">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <Icon name="hugeicons:plus-sign" class="size-4" />
          <span>Insert into {{ props.collectionName }}</span>
        </DialogTitle>
      </DialogHeader>

      <Tabs v-model="activeTab" class="w-full">
        <TabsList class="grid w-full grid-cols-2">
          <TabsTrigger value="document">Insert Document</TabsTrigger>
          <TabsTrigger value="import">Import JSON or CSV file</TabsTrigger>
        </TabsList>

        <TabsContent value="document" class="space-y-4 pt-2">
          <div class="border rounded-md overflow-hidden h-60">
            <BaseCodeEditor
              v-model="editorContent"
              class="h-full w-full"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" @click="emit('update:open', false)">
              Cancel
            </Button>
            <Button size="sm" :disabled="isLoading" @click="handleInsertDocument">
              <Icon v-if="isLoading" name="hugeicons:loading-03" class="size-4 animate-spin mr-1.5" />
              <span>Insert</span>
            </Button>
          </DialogFooter>
        </TabsContent>

        <TabsContent value="import" class="space-y-4 pt-2">
          <input
            ref="fileInputRef"
            type="file"
            accept=".json,.csv"
            class="hidden"
            @change="handleFileSelect"
          />

          <div
            ref="dropZoneRef"
            class="border-2 border-dashed rounded-lg p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors"
            :class="[
              isOverDropZone ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
              isLoading ? 'opacity-50 pointer-events-none' : ''
            ]"
            @click="fileInputRef?.click()"
          >
            <Icon name="hugeicons:upload-cloud-01" class="size-10 text-muted-foreground" />
            <div class="text-center">
              <p class="text-sm font-medium">Drop file here or click to browse</p>
              <p class="text-xs text-muted-foreground mt-0.5">Supports .json and .csv files</p>
            </div>
          </div>

          <div
            v-if="stagedFile"
            class="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2"
          >
            <Icon name="hugeicons:file-01" class="size-5 text-muted-foreground" />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">{{ stagedFile.name }}</p>
              <p class="text-xs text-muted-foreground">{{ formatFileSize(stagedFile.size) }}</p>
            </div>
            <Button variant="ghost" size="xs" @click="stagedFile = null">
              <Icon name="hugeicons:cancel-01" class="size-3.5" />
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" @click="emit('update:open', false)">
              Cancel
            </Button>
            <Button
              size="sm"
              :disabled="isLoading || !stagedFile"
              @click="handleImportFile"
            >
              <Icon v-if="isLoading" name="hugeicons:loading-03" class="size-4 animate-spin mr-1.5" />
              <span>Import</span>
            </Button>
          </DialogFooter>
        </TabsContent>
      </Tabs>
    </DialogContent>
  </Dialog>
</template>
```

- [ ] **Step 5: Tích hợp vào `MongoQuickQueryControlBar.vue` & `MongoCollectionDetail.vue`**
- Trong `MongoQuickQueryControlBar.vue`:
  - Thêm `emit('onInsertClick')`.
  - Thêm button `+ Insert`:
    ```vue
    <Button variant="outline" size="xxs" class="gap-1 h-7" @click="emit('onInsertClick')">
      <Icon name="hugeicons:plus-sign" class="size-3.5" />
      <span>Insert</span>
    </Button>
    ```
- Trong `MongoCollectionDetail.vue`:
  - Thêm `const isInsertModalOpen = ref(false);`.
  - Truyền `@on-insert-click="isInsertModalOpen = true"`.
  - Thêm `<MongoInsertModal v-model:open="isInsertModalOpen" :connection="connection" :database-name="databaseName" :collection-name="collectionName" @inserted="fetchDocuments" />`.
- Trong `components/modules/quick-query/mongodb/components/index.ts`:
  - Export `MongoInsertModal`.

- [ ] **Step 6: Chạy test verify Task 3**
```bash
bun run typecheck
bun test:nuxt test/nuxt/components/modules/quick-query/mongodb/MongoInsertModal.test.ts
```
Expected: PASS.

---

### Task 4: Thêm Button 'Export Data' & Modal Cấu hình Export

**Files:**
- Create: `components/modules/quick-query/mongodb/components/MongoExportModal.vue`
- Create: `server/api/mongodb/export-collection.post.ts`
- Modify: `components/modules/quick-query/mongodb/components/MongoQuickQueryControlBar.vue`
- Modify: `components/modules/quick-query/mongodb/containers/MongoCollectionDetail.vue`
- Modify: `components/modules/quick-query/mongodb/components/index.ts`
- Test: `test/nuxt/components/modules/quick-query/mongodb/MongoExportModal.test.ts`

**Interfaces:**
- Consumes: `server/api/mongodb/export-collection.post.ts`
- Produces: `openExport` event on `MongoQuickQueryControlBar`, `MongoExportModal.vue`

- [ ] **Step 1: Viết test cho `MongoExportModal.vue`**
Tạo file `test/nuxt/components/modules/quick-query/mongodb/MongoExportModal.test.ts`:
```typescript
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import MongoExportModal from '~/components/modules/quick-query/mongodb/components/MongoExportModal.vue';

describe('MongoExportModal', () => {
  it('shows query preview when exportScope is current', () => {
    const wrapper = mount(MongoExportModal, {
      props: {
        open: true,
        exportScope: 'current',
        databaseName: 'shop',
        collectionName: 'roles',
        activeFilterPayload: { name: 'admin' },
      },
    });

    expect(wrapper.text()).toContain('Export results from the query below');
    expect(wrapper.text()).toContain("db.getCollection('roles').find(");
  });

  it('hides query preview when exportScope is full', () => {
    const wrapper = mount(MongoExportModal, {
      props: {
        open: true,
        exportScope: 'full',
        databaseName: 'shop',
        collectionName: 'roles',
      },
    });

    expect(wrapper.text()).not.toContain('Export results from the query below');
  });

  it('shows Advanced JSON Format with 3 options when JSON is selected', () => {
    const wrapper = mount(MongoExportModal, {
      props: {
        open: true,
        exportScope: 'current',
        databaseName: 'shop',
        collectionName: 'roles',
      },
    });

    expect(wrapper.text()).toContain('Default Extended JSON');
    expect(wrapper.text()).toContain('Relaxed Extended JSON');
    expect(wrapper.text()).toContain('Canonical Extended JSON');
  });
});
```

- [ ] **Step 2: Chạy test để verify fail**
```bash
bun test:nuxt test/nuxt/components/modules/quick-query/mongodb/MongoExportModal.test.ts
```
Expected: FAIL vì `MongoExportModal.vue` chưa tồn tại.

- [ ] **Step 3: Tạo server endpoint `server/api/mongodb/export-collection.post.ts`**
Tạo file `server/api/mongodb/export-collection.post.ts`:
```typescript
import { createError, defineEventHandler, readBody, setHeader } from 'h3';
import { BSON } from 'mongodb';
import type { DatabaseMetadataRequestParams } from '~/core/types/database-schemas.types';
import { normalizeMongoFilter } from '~/server/infrastructure/nosql/mongodb/mongodb-quick-query';
import { withMongoDatabase } from '~/server/infrastructure/nosql/mongodb/mongodb.client';

interface ExportRequestBody extends DatabaseMetadataRequestParams {
  collection: string;
  scope: 'current' | 'full';
  filter?: Record<string, unknown>;
  format: 'csv' | 'json';
  jsonFormat?: 'default' | 'relaxed' | 'canonical';
}

export default defineEventHandler(async event => {
  const body = await readBody<ExportRequestBody>(event);
  if (!body.collection || !body.format) {
    throw createError({ statusCode: 400, message: 'collection and format are required' });
  }

  return await withMongoDatabase(body, async database => {
    const collection = database.collection(body.collection);
    const queryFilter =
      body.scope === 'current' && body.filter
        ? normalizeMongoFilter(body.filter)
        : {};

    const docs = await collection.find(queryFilter).toArray();

    if (body.format === 'json') {
      const isRelaxed = body.jsonFormat === 'relaxed';
      const output = BSON.EJSON.stringify(docs, undefined, 2, { relaxed: isRelaxed });
      setHeader(event, 'Content-Type', 'application/json');
      setHeader(
        event,
        'Content-Disposition',
        `attachment; filename="${body.collection}_export.json"`
      );
      return output;
    }

    // CSV format
    const allKeys = Array.from(
      new Set(docs.flatMap(d => Object.keys(d)))
    );
    const headerRow = allKeys.join(',');
    const rows = docs.map(doc => {
      return allKeys
        .map(key => {
          const val = doc[key];
          if (val === undefined || val === null) return '';
          const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(',');
    });

    const csvOutput = [headerRow, ...rows].join('\n');
    setHeader(event, 'Content-Type', 'text/csv');
    setHeader(
      event,
      'Content-Disposition',
      `attachment; filename="${body.collection}_export.csv"`
    );
    return csvOutput;
  });
});
```

- [ ] **Step 4: Tạo Component `MongoExportModal.vue`**
Tạo file `components/modules/quick-query/mongodb/components/MongoExportModal.vue`:
```vue
<script setup lang="ts">
import { computed, ref } from 'vue';
import { toast } from 'vue-sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { getConnectionParams } from '~/core/helpers/connection-helper';
import type { Connection } from '~/core/stores';

const props = defineProps<{
  open: boolean;
  exportScope: 'current' | 'full';
  databaseName: string;
  collectionName: string;
  activeFilterPayload?: Record<string, unknown>;
  connection?: Connection;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

const exportType = ref<'csv' | 'json'>('json');
const jsonFormat = ref<'default' | 'relaxed' | 'canonical'>('default');
const isExporting = ref(false);

const queryPreviewText = computed(() => {
  const filterStr = props.activeFilterPayload
    ? JSON.stringify(props.activeFilterPayload, null, 2)
    : '{}';
  return `Export results from the query below\n\ndb.getCollection('${props.collectionName}').find(${filterStr});`;
});

const handleExport = async () => {
  isExporting.value = true;
  try {
    const response = await $fetch.raw('/api/mongodb/export-collection', {
      method: 'POST',
      body: {
        ...getConnectionParams(props.connection),
        database: props.databaseName,
        collection: props.collectionName,
        scope: props.exportScope,
        filter: props.activeFilterPayload,
        format: exportType.value,
        jsonFormat: jsonFormat.value,
      },
      responseType: 'blob',
    });

    const blob = new Blob([response._data as any], {
      type: exportType.value === 'json' ? 'application/json' : 'text/csv',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${props.collectionName}_export.${exportType.value}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Export completed successfully!');
    emit('update:open', false);
  } catch {
    toast.error('Failed to export data');
  } finally {
    isExporting.value = false;
  }
};
</script>

<template>
  <Dialog :open="open" @update:open="val => emit('update:open', val)">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <Icon name="hugeicons:file-download" class="size-4" />
          <span>Export Data - {{ props.collectionName }}</span>
        </DialogTitle>
      </DialogHeader>

      <div class="space-y-4 py-2">
        <div
          v-if="props.exportScope === 'current'"
          class="rounded-md bg-muted/60 p-3 text-xs font-mono whitespace-pre-wrap border border-border text-primary/90"
        >
          {{ queryPreviewText }}
        </div>

        <div class="space-y-2">
          <Label class="text-sm font-semibold">Export Format</Label>
          <RadioGroup v-model="exportType" class="flex gap-4">
            <div class="flex items-center gap-2">
              <RadioGroupItem id="export-json" value="json" />
              <Label for="export-json" class="cursor-pointer">JSON</Label>
            </div>
            <div class="flex items-center gap-2">
              <RadioGroupItem id="export-csv" value="csv" />
              <Label for="export-csv" class="cursor-pointer">CSV</Label>
            </div>
          </RadioGroup>
        </div>

        <div v-if="exportType === 'json'" class="space-y-3 pt-2 border-t border-border">
          <Label class="text-sm font-semibold">Advanced JSON Format</Label>
          <RadioGroup v-model="jsonFormat" class="space-y-3">
            <div class="flex items-start gap-2.5">
              <RadioGroupItem id="format-default" value="default" class="mt-1" />
              <div>
                <Label for="format-default" class="font-medium cursor-pointer">Default Extended JSON</Label>
                <p class="text-xs text-muted-foreground mt-0.5">
                  Example: { "fortyTwo": 42, "oneHalf": 0.5, "bignumber": { "$numberLong": "5000000000" } }
                </p>
              </div>
            </div>

            <div class="flex items-start gap-2.5">
              <RadioGroupItem id="format-relaxed" value="relaxed" class="mt-1" />
              <div>
                <Label for="format-relaxed" class="font-medium cursor-pointer">Relaxed Extended JSON</Label>
                <p class="text-xs text-muted-foreground mt-0.5">
                  Example: { "fortyTwo": 42, "oneHalf": 0.5, "bignumber": 5000000000 }. Large numbers (>= 2^^53) will change with this format.
                </p>
              </div>
            </div>

            <div class="flex items-start gap-2.5">
              <RadioGroupItem id="format-canonical" value="canonical" class="mt-1" />
              <div>
                <Label for="format-canonical" class="font-medium cursor-pointer">Canonical Extended JSON</Label>
                <p class="text-xs text-muted-foreground mt-0.5">
                  Example: { "fortyTwo": { "$numberInt": "42" }, "oneHalf": { "$numberDouble": "0.5" }, "bignumber": { "$numberLong": "5000000000" } }
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" size="sm" @click="emit('update:open', false)">
          Cancel
        </Button>
        <Button size="sm" :disabled="isExporting" @click="handleExport">
          <Icon v-if="isExporting" name="hugeicons:loading-03" class="size-4 animate-spin mr-1.5" />
          <span>Export</span>
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
```

- [ ] **Step 5: Tích hợp vào `MongoQuickQueryControlBar.vue` & `MongoCollectionDetail.vue`**
- Trong `MongoQuickQueryControlBar.vue`:
  - Thêm `emit('openExport', scope: 'current' | 'full')`.
  - Thêm DropdownMenu bên phải `MongoViewModeSwitcher`:
    ```vue
    <div class="flex items-center gap-1">
      <MongoViewModeSwitcher
        :model-value="props.viewMode"
        @update:model-value="mode => emit('update:viewMode', mode)"
      />

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="outline" size="xxs" class="gap-1 h-7">
            <Icon name="hugeicons:file-download" class="size-3.5" />
            <span>Export</span>
            <Icon name="lucide:chevron-down" class="size-3 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem @click="emit('openExport', 'current')">
            Current results
          </DropdownMenuItem>
          <DropdownMenuItem @click="emit('openExport', 'full')">
            Full collections
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
    ```
- Trong `MongoCollectionDetail.vue`:
  - Thêm state: `const exportModalState = ref<{ open: boolean; scope: 'current' | 'full' }>({ open: false, scope: 'current' });`.
  - Lắng nghe `@open-export="scope => { exportModalState = { open: true, scope } }"`.
  - Đặt `<MongoExportModal v-model:open="exportModalState.open" :export-scope="exportModalState.scope" :database-name="databaseName" :collection-name="collectionName" :active-filter-payload="activeFilterPayload" :connection="connection" />`.
- Trong `components/modules/quick-query/mongodb/components/index.ts`:
  - Export `MongoExportModal`.

- [ ] **Step 6: Chạy test xác minh toàn diện**
```bash
bun run typecheck
bun test:nuxt test/nuxt/components/modules/quick-query/mongodb/MongoExportModal.test.ts
bun test:unit
```
Expected: PASS toàn bộ.
