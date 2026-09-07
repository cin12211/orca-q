# MongoDB Compass-Style Document Editing in List View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to edit MongoDB documents in List View (`MongoCollectionListView.vue`) using a MongoDB Compass-style interaction: clicking an Edit button switches the card into a CodeMirror JSON editor, shows a Save button in the card header only when dirty, and saves updates directly to MongoDB via `/api/mongodb/quick-query-mutation` with in-place reactive reflection.

**Architecture:** Decomposed into a reusable document item component `MongoCollectionListItem.vue` (UI, dirty detection, JSON editor toggle), a mutation hook `useMongoDocumentMutation.ts` (API call, in-place reactive document updates, toast feedback), and coordinated by `MongoCollectionListView.vue` (single active editor, TanStack virtual height recalculation) inside `MongoCollectionDetail.vue`.

**Tech Stack:** Nuxt 3, Vue 3 `<script setup lang="ts">`, `@tanstack/vue-virtual`, `BaseCodeEditor` (CodeMirror with `@codemirror/lang-json`), `VueJsonPretty`, `vue-sonner` (toasts), Hugeicons, Vitest with `@nuxt/test-utils`.

## Global Constraints

- Follow `components/modules/quick-query/mongodb/` flat sub-module architecture; every folder must have an `index.ts`.
- Prefer Hugeicons (`hugeicons:` collection); verified icons: `hugeicons:pencil-edit-02` (edit), `hugeicons:cancel-01` (cancel), `hugeicons:floppy-disk` (save), `hugeicons:files-01` (doc id), `hugeicons:unfold-more` / `hugeicons:unfold-less` (expand/collapse), `hugeicons:copy-01` (copy).
- Immutable `_id` protection: Never send modified `_id` in update `$set` payload; always use the original document `_id` as the selector.
- Single active editor at a time: Entering edit mode on document B cancels/closes editing on document A.
- All code changes must pass `bun run typecheck` + `bun test:unit` + `bun test:nuxt`.

---

### Task 1: Create `useMongoDocumentMutation` Hook and Unit Tests

**Files:**

- Create: `components/modules/quick-query/mongodb/hooks/useMongoDocumentMutation.ts`
- Modify: `components/modules/quick-query/mongodb/hooks/index.ts`
- Create: `test/nuxt/components/modules/quick-query/mongodb/useMongoDocumentMutation.test.ts`

**Interfaces:**

- Consumes:
  - `Connection` from `~/core/stores`
  - `getConnectionParams` from `~/core/helpers/connection-helper`
  - `toast` from `vue-sonner`
  - `MongoDocument` from `../types`
- Produces:

  - `useMongoDocumentMutation(params: { connection: Ref<Connection | undefined>; databaseName?: Ref<string | undefined>; collectionName: Ref<string>; documents: Ref<MongoDocument[]> })`: returns `{ isMutating, savingDocId, updateDocument }`

- [ ] **Step 1: Write the failing test**

Create `test/nuxt/components/modules/quick-query/mongodb/useMongoDocumentMutation.test.ts`:

```typescript
import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMongoDocumentMutation } from '~/components/modules/quick-query/mongodb/hooks/useMongoDocumentMutation';

const mockFetch = vi.fn();
vi.stubGlobal('$fetch', mockFetch);

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock('vue-sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

beforeEach(() => {
  mockFetch.mockReset();
  mockToastSuccess.mockReset();
  mockToastError.mockReset();
});

describe('useMongoDocumentMutation', () => {
  it('calls quick-query-mutation with operation update and updates document in-place', async () => {
    const documents = ref([
      { _id: 'doc-1', name: 'Alice', age: 25 },
      { _id: 'doc-2', name: 'Bob', age: 30 },
    ]);

    mockFetch.mockResolvedValueOnce({
      document: { _id: 'doc-1', name: 'Alice Smith', age: 26 },
    });

    const { isMutating, savingDocId, updateDocument } =
      useMongoDocumentMutation({
        connection: ref({ id: 'c1', type: 'mongodb' } as any),
        databaseName: ref('testdb'),
        collectionName: ref('users'),
        documents,
      });

    expect(isMutating.value).toBe(false);
    expect(savingDocId.value).toBeNull();

    const result = await updateDocument('doc-1', {
      name: 'Alice Smith',
      age: 26,
    });

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/mongodb/quick-query-mutation',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          database: 'testdb',
          collection: 'users',
          operation: 'update',
          id: 'doc-1',
          document: { name: 'Alice Smith', age: 26 },
        }),
      })
    );
    expect(documents.value[0]).toEqual({
      _id: 'doc-1',
      name: 'Alice Smith',
      age: 26,
    });
    expect(mockToastSuccess).toHaveBeenCalledWith(
      'Document updated successfully!'
    );
    expect(isMutating.value).toBe(false);
    expect(savingDocId.value).toBeNull();
  });

  it('handles error gracefully and does not modify documents', async () => {
    const documents = ref([{ _id: 'doc-1', name: 'Alice' }]);
    mockFetch.mockRejectedValueOnce(new Error('Network failure'));

    const { updateDocument } = useMongoDocumentMutation({
      connection: ref({ id: 'c1', type: 'mongodb' } as any),
      databaseName: ref('testdb'),
      collectionName: ref('users'),
      documents,
    });

    const result = await updateDocument('doc-1', { name: 'New Name' });

    expect(result).toBe(false);
    expect(documents.value[0]).toEqual({ _id: 'doc-1', name: 'Alice' });
    expect(mockToastError).toHaveBeenCalledWith('Network failure');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test:nuxt test/nuxt/components/modules/quick-query/mongodb/useMongoDocumentMutation.test.ts`
Expected: FAIL with "Cannot find module '~/components/modules/quick-query/mongodb/hooks/useMongoDocumentMutation'"

- [ ] **Step 3: Implement `useMongoDocumentMutation.ts` and update `hooks/index.ts`**

Create `components/modules/quick-query/mongodb/hooks/useMongoDocumentMutation.ts`:

```typescript
import { ref, type Ref } from 'vue';
import { toast } from 'vue-sonner';
import { getConnectionParams } from '~/core/helpers/connection-helper';
import type { Connection } from '~/core/stores';
import type { MongoDocument } from '../types';

interface MongoQuickQueryMutationResponse {
  document?: MongoDocument | null;
  id?: string;
  deletedCount?: number;
}

export function useMongoDocumentMutation(params: {
  connection: Ref<Connection | undefined>;
  databaseName?: Ref<string | undefined>;
  collectionName: Ref<string>;
  documents: Ref<MongoDocument[]>;
}) {
  const isMutating = ref(false);
  const savingDocId = ref<string | null>(null);

  const updateDocument = async (
    id: string,
    updatedDoc: Record<string, unknown>
  ): Promise<boolean> => {
    isMutating.value = true;
    savingDocId.value = id;

    // Omit _id from update payload so MongoDB does not reject immutable field changes
    const { _id: _ignored, ...updates } = updatedDoc;

    try {
      const response = await $fetch<MongoQuickQueryMutationResponse>(
        '/api/mongodb/quick-query-mutation',
        {
          method: 'POST',
          body: {
            ...getConnectionParams(params.connection.value),
            ...(params.databaseName?.value
              ? { database: params.databaseName.value }
              : {}),
            collection: params.collectionName.value,
            operation: 'update',
            id,
            document: updates,
          },
        }
      );

      const docIndex = params.documents.value.findIndex(
        doc => String(doc._id) === String(id)
      );

      if (docIndex !== -1) {
        const nextDoc: MongoDocument = response.document ?? {
          ...params.documents.value[docIndex],
          ...updates,
          _id: id,
        };
        const updatedList = [...params.documents.value];
        updatedList[docIndex] = nextDoc;
        params.documents.value = updatedList;
      }

      toast.success('Document updated successfully!');
      return true;
    } catch (fetchError) {
      const errorMessage =
        fetchError instanceof Error ? fetchError.message : 'Unknown error';
      toast.error(errorMessage);
      return false;
    } finally {
      isMutating.value = false;
      savingDocId.value = null;
    }
  };

  return {
    isMutating,
    savingDocId,
    updateDocument,
  };
}
```

Update `components/modules/quick-query/mongodb/hooks/index.ts` to add:

```typescript
export * from './useMongoDocumentMutation';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test:nuxt test/nuxt/components/modules/quick-query/mongodb/useMongoDocumentMutation.test.ts`
Expected: PASS

- [ ] **Step 5: Commit Task 1**

```bash
git add components/modules/quick-query/mongodb/hooks/useMongoDocumentMutation.ts components/modules/quick-query/mongodb/hooks/index.ts test/nuxt/components/modules/quick-query/mongodb/useMongoDocumentMutation.test.ts
git commit -m "feat(mongodb): add useMongoDocumentMutation hook and unit tests"
```

---

### Task 2: Create `MongoCollectionListItem` Component and Unit Tests

**Files:**

- Create: `components/modules/quick-query/mongodb/components/MongoCollectionListItem.vue`
- Modify: `components/modules/quick-query/mongodb/components/index.ts`
- Create: `test/nuxt/components/modules/quick-query/mongodb/MongoCollectionListItem.test.ts`

**Interfaces:**

- Consumes:
  - `BaseCodeEditor` from `~/components/base/code-editor/BaseCodeEditor.vue`
  - `VueJsonPretty` from `vue-json-pretty`
  - `useCopyToClipboard` from `~/core/composables/useCopyToClipboard`
  - `Button`, `Tooltip`, `TooltipContent`, `TooltipTrigger` from `#components`
  - `json`, `jsonParseLinter` from `@codemirror/lang-json`
  - `linter`, `lintGutter` from `@codemirror/lint`
- Produces:

  - Component `MongoCollectionListItem` with props `{ document, isExpanded, isEditing, isSaving }` and emits `{ toggle-expand, start-edit, cancel-edit, save, resize }`

- [ ] **Step 1: Write the failing test**

Create `test/nuxt/components/modules/quick-query/mongodb/MongoCollectionListItem.test.ts`:

```typescript
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import VueJsonPretty from 'vue-json-pretty';
import MongoCollectionListItem from '~/components/modules/quick-query/mongodb/components/MongoCollectionListItem.vue';
import TooltipProvider from '~/components/ui/tooltip/TooltipProvider.vue';

const mockToastError = vi.fn();
vi.mock('vue-sonner', () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

beforeEach(() => {
  mockToastError.mockReset();
});

describe('MongoCollectionListItem', () => {
  const sampleDoc = {
    _id: 'doc-123',
    title: 'Sample Item',
    count: 42,
  };

  it('renders read mode with VueJsonPretty and edit button', async () => {
    const wrapper = mount({
      components: { MongoCollectionListItem, TooltipProvider },
      template: `
          <TooltipProvider>
            <MongoCollectionListItem
              :document="doc"
              :is-expanded="false"
              :is-editing="false"
              :is-saving="false"
            />
          </TooltipProvider>
        `,
      setup() {
        return { doc: sampleDoc };
      },
    });
    await flushPromises();

    expect(wrapper.text()).toContain('_id: doc-123');
    expect(wrapper.findComponent(VueJsonPretty).exists()).toBe(true);

    const editBtn = wrapper.find('[data-testid="btn-edit-document"]');
    expect(editBtn.exists()).toBe(true);
    await editBtn.trigger('click');

    const itemComponent = wrapper.findComponent(MongoCollectionListItem);
    expect(itemComponent.emitted('start-edit')).toBeTruthy();
  });

  it('shows Cancel and only shows Save button when content is dirty in edit mode', async () => {
    const wrapper = mount({
      components: { MongoCollectionListItem, TooltipProvider },
      template: `
          <TooltipProvider>
            <MongoCollectionListItem
              :document="doc"
              :is-expanded="false"
              :is-editing="true"
              :is-saving="false"
            />
          </TooltipProvider>
        `,
      setup() {
        return { doc: sampleDoc };
      },
    });
    await flushPromises();

    const cancelBtn = wrapper.find('[data-testid="btn-cancel-edit"]');
    expect(cancelBtn.exists()).toBe(true);

    // Initially pristine: save button should not exist
    expect(wrapper.find('[data-testid="btn-save-document"]').exists()).toBe(
      false
    );

    // Simulate modifying draft JSON
    const itemComponent = wrapper.findComponent(MongoCollectionListItem);
    (itemComponent.vm as any).draftJson = JSON.stringify(
      { ...sampleDoc, title: 'Updated Title' },
      null,
      2
    );
    await flushPromises();

    // Now dirty: save button must be visible
    const saveBtn = wrapper.find('[data-testid="btn-save-document"]');
    expect(saveBtn.exists()).toBe(true);

    await saveBtn.trigger('click');
    await flushPromises();

    expect(itemComponent.emitted('save')).toBeTruthy();
    expect(itemComponent.emitted('save')?.[0]?.[0]).toEqual({
      _id: 'doc-123',
      title: 'Updated Title',
      count: 42,
    });
  });

  it('prevents saving invalid JSON and shows error toast', async () => {
    const wrapper = mount({
      components: { MongoCollectionListItem, TooltipProvider },
      template: `
          <TooltipProvider>
            <MongoCollectionListItem
              :document="doc"
              :is-expanded="false"
              :is-editing="true"
              :is-saving="false"
            />
          </TooltipProvider>
        `,
      setup() {
        return { doc: sampleDoc };
      },
    });
    await flushPromises();

    const itemComponent = wrapper.findComponent(MongoCollectionListItem);
    (itemComponent.vm as any).draftJson = '{ invalid json : ';
    await flushPromises();

    const saveBtn = wrapper.find('[data-testid="btn-save-document"]');
    expect(saveBtn.exists()).toBe(true);

    await saveBtn.trigger('click');
    await flushPromises();

    expect(mockToastError).toHaveBeenCalledWith('Invalid JSON syntax');
    expect(itemComponent.emitted('save')).toBeFalsy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test:nuxt test/nuxt/components/modules/quick-query/mongodb/MongoCollectionListItem.test.ts`
Expected: FAIL with "Cannot find module '~/components/modules/quick-query/mongodb/components/MongoCollectionListItem.vue'"

- [ ] **Step 3: Implement `MongoCollectionListItem.vue` and update `components/index.ts`**

Create `components/modules/quick-query/mongodb/components/MongoCollectionListItem.vue`:

```vue
<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { Button, Tooltip, TooltipContent, TooltipTrigger } from '#components';
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { linter, lintGutter } from '@codemirror/lint';
import VueJsonPretty from 'vue-json-pretty';
import 'vue-json-pretty/lib/styles.css';
import { toast } from 'vue-sonner';
import BaseCodeEditor from '~/components/base/code-editor/BaseCodeEditor.vue';
import { useCopyToClipboard } from '~/core/composables/useCopyToClipboard';
import type { MongoDocument } from '../types';

const props = defineProps<{
  document: MongoDocument;
  isExpanded: boolean;
  isEditing: boolean;
  isSaving: boolean;
}>();

const emit = defineEmits<{
  (e: 'toggle-expand'): void;
  (e: 'start-edit'): void;
  (e: 'cancel-edit'): void;
  (e: 'save', updatedDoc: Record<string, unknown>): void;
  (e: 'resize'): void;
}>();

const { handleCopyWithKey, isCopied, getCopyIcon, getCopyTooltip } =
  useCopyToClipboard();

const onCopyDocument = () => {
  const jsonStr = JSON.stringify(props.document, null, 2);
  return handleCopyWithKey(props.document._id, jsonStr);
};

const formatDocumentJson = (doc: MongoDocument) => {
  return JSON.stringify(doc, null, 2);
};

const draftJson = ref(formatDocumentJson(props.document));

watch(
  () => props.document,
  newDoc => {
    if (!props.isEditing) {
      draftJson.value = formatDocumentJson(newDoc);
    }
  },
  { deep: true }
);

watch(
  () => props.isEditing,
  isEditing => {
    if (isEditing) {
      draftJson.value = formatDocumentJson(props.document);
    }
    nextTick(() => {
      emit('resize');
    });
  }
);

const isDirty = computed(() => {
  try {
    return draftJson.value.trim() !== formatDocumentJson(props.document).trim();
  } catch {
    return true;
  }
});

const editorExtensions = [json(), lintGutter(), linter(jsonParseLinter())];

const onCancel = () => {
  draftJson.value = formatDocumentJson(props.document);
  emit('cancel-edit');
};

const onSave = () => {
  try {
    const parsed = JSON.parse(draftJson.value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      toast.error('Document must be a valid JSON object');
      return;
    }
    emit('save', parsed as Record<string, unknown>);
  } catch {
    toast.error('Invalid JSON syntax');
  }
};
</script>

<template>
  <div class="rounded-md border border-border/60 bg-card shadow-xs mb-2">
    <!-- Header -->
    <div
      class="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b border-border/40 text-xs font-mono select-none"
    >
      <div class="flex items-center gap-2 font-medium">
        <Icon
          :name="isEditing ? 'hugeicons:pencil-edit-02' : 'hugeicons:files-01'"
          class="size-4!"
        />
        <span>_id: {{ document._id }}</span>
        <span
          v-if="isEditing"
          class="px-1.5 py-0.2 rounded text-[10px] bg-primary/10 text-primary border border-primary/20 font-sans font-medium"
        >
          Editing
        </span>
      </div>

      <div class="flex items-center gap-1">
        <!-- Edit Mode Actions -->
        <template v-if="isEditing">
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                variant="ghost"
                size="iconSm"
                class="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                data-testid="btn-cancel-edit"
                :disabled="isSaving"
                @click="onCancel"
              >
                <Icon name="hugeicons:cancel-01" class="size-3.5!" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Cancel changes</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip v-if="isDirty">
            <TooltipTrigger as-child>
              <Button
                variant="default"
                size="xs"
                class="h-6 gap-1 px-2 text-xs"
                data-testid="btn-save-document"
                :disabled="isSaving"
                @click="onSave"
              >
                <Icon
                  v-if="!isSaving"
                  name="hugeicons:floppy-disk"
                  class="size-3.5!"
                />
                <Icon
                  v-else
                  name="hugeicons:loading-03"
                  class="size-3.5! animate-spin"
                />
                <span>{{ isSaving ? 'Saving...' : 'Save' }}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Save changes to MongoDB</p>
            </TooltipContent>
          </Tooltip>
        </template>

        <!-- Read Mode Actions -->
        <template v-else>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                variant="ghost"
                size="iconSm"
                class="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                data-testid="btn-edit-document"
                @click="emit('start-edit')"
              >
                <Icon name="hugeicons:pencil-edit-02" class="size-3.5!" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Edit document</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                variant="ghost"
                size="iconSm"
                class="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                data-testid="btn-toggle-expand"
                @click="emit('toggle-expand')"
              >
                <Icon
                  :name="
                    isExpanded
                      ? 'hugeicons:unfold-less'
                      : 'hugeicons:unfold-more'
                  "
                  class="size-3.5!"
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {{
                  isExpanded ? 'Collapse nested keys' : 'Expand all nested keys'
                }}
              </p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                variant="ghost"
                size="iconSm"
                class="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                data-testid="btn-copy-document"
                @click="onCopyDocument"
              >
                <Icon
                  :name="getCopyIcon(isCopied(document._id))"
                  :class="[
                    'size-3.5',
                    isCopied(document._id) && 'text-emerald-500 font-bold',
                  ]"
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {{
                  getCopyTooltip(isCopied(document._id), 'Copy document JSON')
                }}
              </p>
            </TooltipContent>
          </Tooltip>
        </template>
      </div>
    </div>

    <!-- Body -->
    <div class="m-2 text-xs bg-background">
      <div
        v-if="isEditing"
        class="h-[260px] border border-border/50 rounded overflow-hidden"
      >
        <BaseCodeEditor
          v-model="draftJson"
          :extensions="editorExtensions"
          class="h-full"
        />
      </div>
      <div v-else class="overflow-x-auto">
        <VueJsonPretty
          :data="document"
          :deep="isExpanded ? 99 : 1"
          :show-double-quotes="true"
          :show-length="false"
          :show-line="false"
          :show-icon="true"
        />
      </div>
    </div>
  </div>
</template>
```

Update `components/modules/quick-query/mongodb/components/index.ts` to add:

```typescript
export { default as MongoCollectionListItem } from './MongoCollectionListItem.vue';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test:nuxt test/nuxt/components/modules/quick-query/mongodb/MongoCollectionListItem.test.ts`
Expected: PASS

- [ ] **Step 5: Commit Task 2**

```bash
git add components/modules/quick-query/mongodb/components/MongoCollectionListItem.vue components/modules/quick-query/mongodb/components/index.ts test/nuxt/components/modules/quick-query/mongodb/MongoCollectionListItem.test.ts
git commit -m "feat(mongodb): add MongoCollectionListItem component and tests"
```

---

### Task 3: Refactor `MongoCollectionListView` to Integrate `MongoCollectionListItem`

**Files:**

- Modify: `components/modules/quick-query/mongodb/components/MongoCollectionListView.vue`
- Modify: `test/nuxt/components/modules/quick-query/mongodb/MongoCollectionListView.test.ts`

**Interfaces:**

- Consumes:
  - `MongoCollectionListItem` from `./MongoCollectionListItem.vue`
  - Props: `{ documents: MongoDocument[]; savingDocId?: string | null }`
  - Emits / Callbacks: `(e: 'update-document', payload: { id: string; document: Record<string, unknown> }): void`
- Produces:

  - Clean virtualized list delegating per-item rendering and dirty handling to `MongoCollectionListItem`, managing `activeEditDocId`, and adjusting row virtualizer sizes.

- [ ] **Step 1: Write the updated/failing test**

Update `test/nuxt/components/modules/quick-query/mongodb/MongoCollectionListView.test.ts`:

```typescript
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import MongoCollectionListItem from '~/components/modules/quick-query/mongodb/components/MongoCollectionListItem.vue';
import MongoCollectionListView from '~/components/modules/quick-query/mongodb/components/MongoCollectionListView.vue';
import TooltipProvider from '~/components/ui/tooltip/TooltipProvider.vue';

const mockMeasureElement = vi.fn();

vi.mock('@tanstack/vue-virtual', () => ({
  useVirtualizer: () => ({
    value: {
      getVirtualItems: () => [{ index: 0, key: 0, start: 0 }],
      getTotalSize: () => 120,
      measureElement: (el: any) => mockMeasureElement(el),
      measure: () => {},
      scrollToIndex: () => {},
    },
  }),
}));

describe('MongoCollectionListView', () => {
  it('renders items via MongoCollectionListItem and manages edit mode', async () => {
    const documents = [
      {
        _id: 'doc-1',
        name: 'John',
        address: { city: 'Hanoi', country: 'Vietnam' },
      },
    ];

    const wrapper = mount({
      components: { MongoCollectionListView, TooltipProvider },
      template: `
        <TooltipProvider>
          <MongoCollectionListView
            :documents="documents"
            @update-document="onUpdate"
          />
        </TooltipProvider>
      `,
      setup() {
        const onUpdate = vi.fn();
        return { documents, onUpdate };
      },
    });
    await flushPromises();

    const listItem = wrapper.findComponent(MongoCollectionListItem);
    expect(listItem.exists()).toBe(true);
    expect(listItem.props('isEditing')).toBe(false);

    // Trigger start-edit
    await listItem.vm.$emit('start-edit');
    await flushPromises();

    expect(listItem.props('isEditing')).toBe(true);

    // Save triggers update-document emit
    await listItem.vm.$emit('save', { name: 'John Doe' });
    await flushPromises();

    expect(
      wrapper.findComponent(MongoCollectionListView).emitted('update-document')
    ).toEqual([[{ id: 'doc-1', document: { name: 'John Doe' } }]]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test:nuxt test/nuxt/components/modules/quick-query/mongodb/MongoCollectionListView.test.ts`
Expected: FAIL (until MongoCollectionListView is updated)

- [ ] **Step 3: Update `MongoCollectionListView.vue`**

Update `components/modules/quick-query/mongodb/components/MongoCollectionListView.vue`:

```vue
<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { useVirtualizer } from '@tanstack/vue-virtual';
import type { MongoDocument } from '../types';
import MongoCollectionListItem from './MongoCollectionListItem.vue';

const props = withDefaults(
  defineProps<{
    documents: MongoDocument[];
    savingDocId?: string | null;
  }>(),
  {
    savingDocId: null,
  }
);

const emit = defineEmits<{
  (
    e: 'update-document',
    payload: { id: string; document: Record<string, unknown> }
  ): void;
}>();

const expandedDocIds = ref<Set<string | number>>(new Set());
const activeEditDocId = ref<string | null>(null);

const getDocId = (doc: MongoDocument, index: number): string | number => {
  return doc?._id !== undefined && doc?._id !== null ? String(doc._id) : index;
};

const isExpanded = (docId: string | number) => expandedDocIds.value.has(docId);

const toggleExpandDocument = (docId: string | number) => {
  const next = new Set(expandedDocIds.value);
  if (next.has(docId)) {
    next.delete(docId);
  } else {
    next.add(docId);
  }
  expandedDocIds.value = next;
};

const onStartEdit = (docId: string) => {
  activeEditDocId.value = docId;
};

const onCancelEdit = () => {
  activeEditDocId.value = null;
};

const onSaveDocument = (docId: string, updatedDoc: Record<string, unknown>) => {
  emit('update-document', { id: docId, document: updatedDoc });
};

const onExitEditMode = (docId: string) => {
  if (activeEditDocId.value === docId) {
    activeEditDocId.value = null;
  }
};

const parentRef = ref<HTMLElement | null>(null);
const itemRefs = ref<Record<string | number, HTMLElement | null>>({});

const setItemRef = (el: any, key: string | number) => {
  if (el) {
    itemRefs.value[key] = el;
    rowVirtualizer.value.measureElement(el);
  } else {
    delete itemRefs.value[key];
  }
};

const onItemResize = (key: string | number) => {
  nextTick(() => {
    const el = itemRefs.value[key];
    if (el) {
      rowVirtualizer.value.measureElement(el);
    }
  });
};

const rowVirtualizer = useVirtualizer({
  get count() {
    return props.documents.length;
  },
  getScrollElement: () => parentRef.value,
  estimateSize: () => 120,
  overscan: 5,
});

const virtualRows = computed(() => rowVirtualizer.value.getVirtualItems());
const totalSize = computed(() => rowVirtualizer.value.getTotalSize());

const scrollToTop = () => {
  rowVirtualizer.value.scrollToIndex(0);
  if (parentRef.value) {
    parentRef.value.scrollTop = 0;
  }
};

defineExpose({ scrollToTop, onExitEditMode });
</script>

<template>
  <div
    ref="parentRef"
    class="h-full overflow-auto contain-strict [overflow-anchor:none] p-2"
  >
    <div
      :style="{
        height: `${totalSize}px`,
        width: '100%',
        position: 'relative',
      }"
    >
      <div
        v-for="virtualRow in virtualRows"
        :key="virtualRow.key.toString()"
        :data-index="virtualRow.index"
        :ref="el => setItemRef(el, virtualRow.key)"
        class="[overflow-anchor:none]"
        :style="{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          transform: `translateY(${virtualRow.start}px)`,
        }"
      >
        <MongoCollectionListItem
          :document="documents[virtualRow.index]"
          :is-expanded="
            isExpanded(getDocId(documents[virtualRow.index], virtualRow.index))
          "
          :is-editing="
            activeEditDocId === String(documents[virtualRow.index]._id)
          "
          :is-saving="savingDocId === String(documents[virtualRow.index]._id)"
          @toggle-expand="
            toggleExpandDocument(
              getDocId(documents[virtualRow.index], virtualRow.index)
            )
          "
          @start-edit="onStartEdit(String(documents[virtualRow.index]._id))"
          @cancel-edit="onCancelEdit"
          @save="
            updatedDoc =>
              onSaveDocument(
                String(documents[virtualRow.index]._id),
                updatedDoc
              )
          "
          @resize="() => onItemResize(virtualRow.key)"
        />
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test:nuxt test/nuxt/components/modules/quick-query/mongodb/MongoCollectionListView.test.ts`
Expected: PASS

- [ ] **Step 5: Commit Task 3**

```bash
git add components/modules/quick-query/mongodb/components/MongoCollectionListView.vue test/nuxt/components/modules/quick-query/mongodb/MongoCollectionListView.test.ts
git commit -m "feat(mongodb): integrate MongoCollectionListItem into MongoCollectionListView"
```

---

### Task 4: Connect Mutation in `MongoCollectionDetail.vue` and Complete Verification

**Files:**

- Modify: `components/modules/quick-query/mongodb/containers/MongoCollectionDetail.vue`
- Test: `test/nuxt/components/modules/quick-query/mongodb/MongoCollectionDetail.test.ts`

**Interfaces:**

- Consumes:
  - `useMongoDocumentMutation` from `../hooks`
- Produces:

  - Handlers for `@update-document` on `MongoCollectionListView` passing to `updateDocument`, exiting edit mode on success.

- [ ] **Step 1: Inspect and update container test**

Review `test/nuxt/components/modules/quick-query/mongodb/MongoCollectionDetail.test.ts` and verify it continues passing.

- [ ] **Step 2: Update `MongoCollectionDetail.vue`**

In `components/modules/quick-query/mongodb/containers/MongoCollectionDetail.vue`:
Import `useMongoDocumentMutation`:

```typescript
import {
  useMongoCollectionQuery,
  useMongoCollectionShortcuts,
  useMongoDocumentMutation,
} from '../hooks';
```

Initialize mutation hook:

```typescript
const { savingDocId, updateDocument } = useMongoDocumentMutation({
  connection,
  databaseName,
  collectionName,
  documents,
});

const handleUpdateDocument = async (payload: {
  id: string;
  document: Record<string, unknown>;
}) => {
  const success = await updateDocument(payload.id, payload.document);
  if (success) {
    listViewRef.value?.onExitEditMode(payload.id);
  }
};
```

In template for `MongoCollectionListView`:

```vue
<MongoCollectionListView
  v-else-if="viewMode === MongoCollectionViewMode.List"
  ref="listViewRef"
  :documents="documents"
  :saving-doc-id="savingDocId"
  @update-document="handleUpdateDocument"
/>
```

- [ ] **Step 3: Run all targeted tests**

Run: `bun test:nuxt test/nuxt/components/modules/quick-query/mongodb/`
Expected: ALL 7 test files pass.

- [ ] **Step 4: Run full project verification**

Run: `bun run typecheck`
Expected: 0 type errors.

Run: `bun test:unit`
Expected: All unit tests pass.

- [ ] **Step 5: Commit Task 4**

```bash
git add components/modules/quick-query/mongodb/containers/MongoCollectionDetail.vue
git commit -m "feat(mongodb): wire document mutation into MongoCollectionDetail"
```

---
