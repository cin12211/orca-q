# MongoDB Quick Query More Options Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "More options" button to `MongoQuickQueryControlBar.vue` next to `QuickPagination` that expands an advanced query options form (`MongoQueryMoreOptions.vue`) beneath the filter bar to configure `Project`, `Sort`, `Collation`, `Index Hint`, and `Max Time MS`.

**Architecture:** A standalone component `MongoQueryMoreOptions.vue` coordinates with `MongoQuickQueryControlBar.vue` through `MongoCollectionDetail.vue`. Parsed options are managed by `useMongoCollectionQuery.ts` and passed to `/api/mongodb/quick-query` which applies them to the MongoDB driver cursor.

**Tech Stack:** Nuxt 3, Vue 3, TypeScript, MongoDB Node.js Driver, Vitest, Vue Test Utils.

## Global Constraints

- Do not commit changes to git (`Không commit code lên git`).
- Any source-code modification must pass `bun run typecheck` and `bun test:unit`.
- Prefer Hugeicons icons if adding icons.
- Every folder in `mongodb/` must have an `index.ts`.
- Pure utilities must be placed in `utils/`.

---

### Task 1: Types & Utility Parser for More Options

**Files:**

- Modify: `components/modules/quick-query/mongodb/types/mongo-quick-query.types.ts`
- Create: `components/modules/quick-query/mongodb/utils/mongoMoreOptionsUtils.ts`
- Modify: `components/modules/quick-query/mongodb/utils/index.ts`
- Create: `test/unit/components/modules/quick-query/mongodb/mongoMoreOptionsUtils.spec.ts`

**Interfaces:**

- Consumes: `parseMongoDocumentInput` from `components/modules/quick-query/mongodb/utils/mongoEjsonUtils.ts`
- Produces: `MongoQueryMoreOptionsPayload`, `parseMongoMoreOptionsInput`

- [x] **Step 1: Write failing unit test for parseMongoMoreOptionsInput**

Create `test/unit/components/modules/quick-query/mongodb/mongoMoreOptionsUtils.spec.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { parseMongoMoreOptionsInput } from '~/components/modules/quick-query/mongodb/utils/mongoMoreOptionsUtils';

describe('parseMongoMoreOptionsInput', () => {
  it('parses valid JSON fields correctly', () => {
    const raw = {
      project: '{"name": 1, "email": 1}',
      sort: '{"createdAt": -1}',
      collation: '{"locale": "simple"}',
      hint: 'email_1',
      maxTimeMS: 5000,
    };
    const { payload, errors } = parseMongoMoreOptionsInput(raw);
    expect(errors).toEqual({});
    expect(payload.project).toEqual({ name: 1, email: 1 });
    expect(payload.sort).toEqual({ createdAt: -1 });
    expect(payload.collation).toEqual({ locale: 'simple' });
    expect(payload.hint).toBe('email_1');
    expect(payload.maxTimeMS).toBe(5000);
  });

  it('supports JSON object index hint', () => {
    const raw = {
      hint: '{"_id": 1}',
    };
    const { payload, errors } = parseMongoMoreOptionsInput(raw);
    expect(errors).toEqual({});
    expect(payload.hint).toEqual({ _id: 1 });
  });

  it('ignores empty, whitespace, and placeholder strings', () => {
    const raw = {
      project: '',
      sort: '   ',
      collation: '',
      hint: '—',
      maxTimeMS: '',
    };
    const { payload, errors } = parseMongoMoreOptionsInput(raw);
    expect(errors).toEqual({});
    expect(payload.project).toBeUndefined();
    expect(payload.sort).toBeUndefined();
    expect(payload.collation).toBeUndefined();
    expect(payload.hint).toBeUndefined();
    expect(payload.maxTimeMS).toBeUndefined();
  });

  it('reports errors for malformed JSON in fields', () => {
    const raw = {
      project: '{ invalid_json }',
      sort: '{"valid": 1}',
    };
    const { payload, errors } = parseMongoMoreOptionsInput(raw);
    expect(errors.project).toBeDefined();
    expect(payload.sort).toEqual({ valid: 1 });
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `bun test test/unit/components/modules/quick-query/mongodb/mongoMoreOptionsUtils.spec.ts`
Expected: FAIL (module not found)

- [x] **Step 3: Define types in `mongo-quick-query.types.ts`**

Add to `components/modules/quick-query/mongodb/types/mongo-quick-query.types.ts`:

```typescript
export interface MongoQueryMoreOptionsPayload {
  project?: Record<string, unknown>;
  sort?: Record<string, 1 | -1 | unknown>;
  collation?: Record<string, unknown>;
  hint?: string | Record<string, unknown>;
  maxTimeMS?: number;
}

export interface MongoQueryMoreOptionsRawInput {
  project?: string;
  sort?: string;
  collation?: string;
  hint?: string;
  maxTimeMS?: number | string;
}
```

- [x] **Step 4: Implement `mongoMoreOptionsUtils.ts`**

Create `components/modules/quick-query/mongodb/utils/mongoMoreOptionsUtils.ts`:

```typescript
import type {
  MongoQueryMoreOptionsPayload,
  MongoQueryMoreOptionsRawInput,
} from '../types';
import { parseMongoDocumentInput } from './mongoEjsonUtils';

export interface MongoMoreOptionsParseResult {
  payload: MongoQueryMoreOptionsPayload;
  errors: Partial<Record<keyof MongoQueryMoreOptionsRawInput, string>>;
}

export function parseMongoMoreOptionsInput(
  raw: MongoQueryMoreOptionsRawInput
): MongoMoreOptionsParseResult {
  const payload: MongoQueryMoreOptionsPayload = {};
  const errors: Partial<Record<keyof MongoQueryMoreOptionsRawInput, string>> =
    {};

  // Project
  const rawProject = raw.project?.trim();
  if (rawProject && rawProject !== '{}') {
    try {
      const parsed = parseMongoDocumentInput(rawProject);
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        !Array.isArray(parsed)
      ) {
        payload.project = parsed as Record<string, unknown>;
      } else {
        errors.project = 'Project must be a JSON object';
      }
    } catch (err: any) {
      errors.project = err?.message || 'Invalid JSON syntax';
    }
  }

  // Sort
  const rawSort = raw.sort?.trim();
  if (rawSort && rawSort !== '{}') {
    try {
      const parsed = parseMongoDocumentInput(rawSort);
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        !Array.isArray(parsed)
      ) {
        payload.sort = parsed as Record<string, 1 | -1 | unknown>;
      } else {
        errors.sort = 'Sort must be a JSON object';
      }
    } catch (err: any) {
      errors.sort = err?.message || 'Invalid JSON syntax';
    }
  }

  // Collation
  const rawCollation = raw.collation?.trim();
  if (rawCollation && rawCollation !== '{}') {
    try {
      const parsed = parseMongoDocumentInput(rawCollation);
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        !Array.isArray(parsed)
      ) {
        payload.collation = parsed as Record<string, unknown>;
      } else {
        errors.collation = 'Collation must be a JSON object';
      }
    } catch (err: any) {
      errors.collation = err?.message || 'Invalid JSON syntax';
    }
  }

  // Index Hint
  const rawHint = raw.hint?.trim();
  if (rawHint && rawHint !== '—' && rawHint !== '-') {
    if (rawHint.startsWith('{')) {
      try {
        const parsed = parseMongoDocumentInput(rawHint);
        if (typeof parsed === 'object' && parsed !== null) {
          payload.hint = parsed as Record<string, unknown>;
        } else {
          payload.hint = rawHint;
        }
      } catch (err: any) {
        errors.hint = err?.message || 'Invalid JSON syntax';
      }
    } else {
      payload.hint = rawHint;
    }
  }

  // Max Time MS
  if (raw.maxTimeMS !== undefined && raw.maxTimeMS !== '') {
    const num = Number(raw.maxTimeMS);
    if (!Number.isNaN(num) && num > 0) {
      payload.maxTimeMS = Math.floor(num);
    } else if (String(raw.maxTimeMS).trim() !== '') {
      errors.maxTimeMS = 'Max Time MS must be a positive number';
    }
  }

  return { payload, errors };
}
```

- [x] **Step 5: Export from `utils/index.ts`**

In `components/modules/quick-query/mongodb/utils/index.ts`, add:

```typescript
export * from './mongoMoreOptionsUtils';
```

- [x] **Step 6: Run test to verify it passes**

Run: `bun test test/unit/components/modules/quick-query/mongodb/mongoMoreOptionsUtils.spec.ts`
Expected: PASS (4 tests passed)

---

### Task 2: Backend API & Composable Updates

**Files:**

- Modify: `server/api/mongodb/quick-query.post.ts`
- Modify: `components/modules/quick-query/mongodb/hooks/useMongoCollectionQuery.ts`

**Interfaces:**

- Consumes: `MongoQueryMoreOptionsPayload` from `../types`
- Produces: API support for `project`, `sort`, `collation`, `hint`, `maxTimeMS`

- [x] **Step 1: Update `server/api/mongodb/quick-query.post.ts`**

Update `RequestBody` and cursor pipeline:

```typescript
interface RequestBody extends DatabaseMetadataRequestParams {
  collection: string;
  filter?: Record<string, unknown>;
  project?: Record<string, unknown>;
  sort?: Record<string, 1 | -1>;
  collation?: Record<string, unknown>;
  hint?: string | Record<string, unknown>;
  maxTimeMS?: number;
  limit?: number;
  skip?: number;
}
```

And inside `withMongoDatabase`:

```typescript
let cursor = collection.find(filter);

if (body.project && Object.keys(body.project).length > 0) {
  cursor = cursor.project(body.project);
}

if (body.sort && Object.keys(body.sort).length > 0) {
  cursor = cursor.sort(body.sort);
} else {
  cursor = cursor.sort({ _id: 1 });
}

if (body.collation && Object.keys(body.collation).length > 0) {
  cursor = cursor.collation(body.collation as any);
}

if (body.hint) {
  cursor = cursor.hint(body.hint as any);
}

if (body.maxTimeMS && body.maxTimeMS > 0) {
  cursor = cursor.maxTimeMS(body.maxTimeMS);
}

const [documents, total] = await Promise.all([
  cursor.skip(skip).limit(limit).toArray(),
  collection.countDocuments(filter),
]);
```

- [x] **Step 2: Update `useMongoCollectionQuery.ts`**

In `components/modules/quick-query/mongodb/hooks/useMongoCollectionQuery.ts`:

- Import `MongoQueryMoreOptionsPayload` from `../types`.
- Add state: `const activeMoreOptionsPayload = ref<MongoQueryMoreOptionsPayload | undefined>();`.
- In `fetchDocuments()`, include in request body:
  ```typescript
  project: activeMoreOptionsPayload.value?.project,
  sort: activeMoreOptionsPayload.value?.sort,
  collation: activeMoreOptionsPayload.value?.collation,
  hint: activeMoreOptionsPayload.value?.hint,
  maxTimeMS: activeMoreOptionsPayload.value?.maxTimeMS,
  ```
- Add method:
  ```typescript
  const applyMoreOptions = (options?: MongoQueryMoreOptionsPayload) => {
    activeMoreOptionsPayload.value = options;
    skip.value = 0;
    return fetchDocuments();
  };
  ```
- Return `activeMoreOptionsPayload` and `applyMoreOptions`.

- [x] **Step 3: Run unit tests to verify no regressions**

Run: `bun test:unit`
Expected: PASS

---

### Task 3: "More options" Button on `MongoQuickQueryControlBar.vue`

**Files:**

- Modify: `components/modules/quick-query/mongodb/components/MongoQuickQueryControlBar.vue`
- Modify: `test/nuxt/components/modules/quick-query/mongodb/MongoQuickQueryControlBar.test.ts`

**Interfaces:**

- Consumes: props `isShowMoreOptions?: boolean`
- Produces: emit `onToggleMoreOptions: []`

- [x] **Step 1: Write test for More options button**

In `test/nuxt/components/modules/quick-query/mongodb/MongoQuickQueryControlBar.test.ts`, add:

```typescript
it('renders More options button and emits onToggleMoreOptions when clicked', async () => {
  const wrapper = mountBar();
  const moreBtn = wrapper
    .findAll('button')
    .find(b => b.text().includes('More options'));
  expect(moreBtn?.exists()).toBe(true);

  await moreBtn!.trigger('click');
  expect(wrapper.emitted('onToggleMoreOptions')).toBeTruthy();
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `bun test:nuxt test/nuxt/components/modules/quick-query/mongodb/MongoQuickQueryControlBar.test.ts`
Expected: FAIL (button with 'More options' not found)

- [x] **Step 3: Add More options button to `MongoQuickQueryControlBar.vue`**

Add prop and emit:

```typescript
const props = defineProps<{
  totalRows: number;
  currentTotalRows: number;
  limit: number;
  skip: number;
  isLoading: boolean;
  viewMode: MongoCollectionViewMode;
  isShowFilters?: boolean;
  activeFilterCount?: number;
  isShowMoreOptions?: boolean;
}>();

const emit = defineEmits<{
  onNextPage: [];
  onPreviousPage: [];
  onRefresh: [];
  onToggleFilter: [];
  onToggleMoreOptions: [];
  onPaginate: [value: { limit: number; offset: number }];
  onInsertClick: [];
  openExport: [scope: MongoExportScope];
  'update:viewMode': [MongoCollectionViewMode];
}>();
```

In template, right beside `<QuickPagination ... />`:

```vue
<QuickPagination
  :limit="props.limit"
  :offset="props.skip"
  :total-rows="props.totalRows"
  @on-paginate="value => emit('onPaginate', value)"
/>

<Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="outline"
            size="xxs"
            :class="
              props.isShowMoreOptions ? 'bg-accent text-accent-foreground' : ''
            "
            class="font-normal"
            @click="emit('onToggleMoreOptions')"
          >
            <Icon name="hugeicons:settings-04" />
            <span>More options</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Toggle query options (Project, Sort, Collation, Hint, MaxTimeMS)</p>
        </TooltipContent>
      </Tooltip>
```

- [x] **Step 4: Run test to verify it passes**

Run: `bun test:nuxt test/nuxt/components/modules/quick-query/mongodb/MongoQuickQueryControlBar.test.ts`
Expected: PASS

---

### Task 4: Component `MongoQueryMoreOptions.vue`

**Files:**

- Create: `components/modules/quick-query/mongodb/components/MongoQueryMoreOptions.vue`
- Modify: `components/modules/quick-query/mongodb/components/index.ts`
- Create: `test/nuxt/components/modules/quick-query/mongodb/MongoQueryMoreOptions.test.ts`

**Interfaces:**

- Consumes: `parseMongoMoreOptionsInput` from `../utils`
- Produces: `MongoQueryMoreOptions.vue` component with 2-column inputs, validation, Apply and Reset actions.

- [x] **Step 1: Write test for `MongoQueryMoreOptions.vue`**

Create `test/nuxt/components/modules/quick-query/mongodb/MongoQueryMoreOptions.test.ts`:

```typescript
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import MongoQueryMoreOptions from '~/components/modules/quick-query/mongodb/components/MongoQueryMoreOptions.vue';

describe('MongoQueryMoreOptions', () => {
  it('renders all 5 fields with placeholders', () => {
    const wrapper = mount(MongoQueryMoreOptions);
    expect(wrapper.text()).toContain('Project');
    expect(wrapper.text()).toContain('Sort');
    expect(wrapper.text()).toContain('Collation');
    expect(wrapper.text()).toContain('Index Hint');
    expect(wrapper.text()).toContain('Max Time MS');
  });

  it('resets all fields when Reset is clicked', async () => {
    const wrapper = mount(MongoQueryMoreOptions);
    const projectInput = wrapper.find<HTMLInputElement>('input#more-project');
    await projectInput.setValue('{"name": 1}');
    expect(projectInput.element.value).toBe('{"name": 1}');

    const resetBtn = wrapper
      .findAll('button')
      .find(b => b.text().includes('Reset'));
    await resetBtn?.trigger('click');

    expect(projectInput.element.value).toBe('');
  });

  it('emits apply with parsed payload when Apply is clicked', async () => {
    const wrapper = mount(MongoQueryMoreOptions);
    await wrapper
      .find<HTMLInputElement>('input#more-sort')
      .setValue('{"createdAt": -1}');

    const applyBtn = wrapper
      .findAll('button')
      .find(b => b.text().includes('Apply'));
    await applyBtn?.trigger('click');

    const emitted = wrapper.emitted('apply');
    expect(emitted).toBeTruthy();
    expect(emitted![0][0]).toEqual({ sort: { createdAt: -1 } });
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `bun test:nuxt test/nuxt/components/modules/quick-query/mongodb/MongoQueryMoreOptions.test.ts`
Expected: FAIL (component not found)

- [x] **Step 3: Implement `MongoQueryMoreOptions.vue`**

Create `components/modules/quick-query/mongodb/components/MongoQueryMoreOptions.vue`:

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { Button, Icon } from '#components';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import type {
  MongoQueryMoreOptionsPayload,
  MongoQueryMoreOptionsRawInput,
} from '../types';
import { parseMongoMoreOptionsInput } from '../utils';

const props = defineProps<{
  isLoading?: boolean;
}>();

const emit = defineEmits<{
  apply: [payload: MongoQueryMoreOptionsPayload];
  reset: [];
  close: [];
}>();

const rawInput = ref<MongoQueryMoreOptionsRawInput>({
  project: '',
  sort: '',
  collation: '',
  hint: '',
  maxTimeMS: '',
});

const errors = ref<
  Partial<Record<keyof MongoQueryMoreOptionsRawInput, string>>
>({});

const handleApply = () => {
  const result = parseMongoMoreOptionsInput(rawInput.value);
  errors.value = result.errors;
  if (Object.keys(result.errors).length === 0) {
    emit('apply', result.payload);
  }
};

const handleReset = () => {
  rawInput.value = {
    project: '',
    sort: '',
    collation: '',
    hint: '',
    maxTimeMS: '',
  };
  errors.value = {};
  emit('reset');
  emit('apply', {});
};

const onKeydown = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    handleApply();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    emit('close');
  }
};
</script>

<template>
  <div
    class="p-2 border-b border-border/40 bg-muted/20 text-xs space-y-2.5 select-none"
    @keydown="onKeydown"
  >
    <div class="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
      <!-- Col 1 -->
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <Label
            for="more-project"
            class="text-[11px] font-medium text-muted-foreground w-20 shrink-0"
          >
            Project
          </Label>
          <div class="flex-1">
            <Input
              id="more-project"
              v-model="rawInput.project"
              placeholder="{}"
              class="h-7 px-2 text-xs font-mono w-full"
              :class="{ 'border-destructive': errors.project }"
              @keyup.enter="handleApply"
            />
            <p
              v-if="errors.project"
              class="text-[10px] text-destructive mt-0.5"
            >
              {{ errors.project }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <Label
            for="more-collation"
            class="text-[11px] font-medium text-muted-foreground w-20 shrink-0"
          >
            Collation
          </Label>
          <div class="flex-1">
            <Input
              id="more-collation"
              v-model="rawInput.collation"
              placeholder="{ locale: 'simple' }"
              class="h-7 px-2 text-xs font-mono w-full"
              :class="{ 'border-destructive': errors.collation }"
              @keyup.enter="handleApply"
            />
            <p
              v-if="errors.collation"
              class="text-[10px] text-destructive mt-0.5"
            >
              {{ errors.collation }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <Label
            for="more-hint"
            class="text-[11px] font-medium text-muted-foreground w-20 shrink-0"
          >
            Index Hint
          </Label>
          <div class="flex-1">
            <Input
              id="more-hint"
              v-model="rawInput.hint"
              placeholder="—"
              class="h-7 px-2 text-xs font-mono w-full"
              :class="{ 'border-destructive': errors.hint }"
              @keyup.enter="handleApply"
            />
            <p v-if="errors.hint" class="text-[10px] text-destructive mt-0.5">
              {{ errors.hint }}
            </p>
          </div>
        </div>
      </div>

      <!-- Col 2 -->
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <Label
            for="more-sort"
            class="text-[11px] font-medium text-muted-foreground w-20 shrink-0"
          >
            Sort
          </Label>
          <div class="flex-1">
            <Input
              id="more-sort"
              v-model="rawInput.sort"
              placeholder="{}"
              class="h-7 px-2 text-xs font-mono w-full"
              :class="{ 'border-destructive': errors.sort }"
              @keyup.enter="handleApply"
            />
            <p v-if="errors.sort" class="text-[10px] text-destructive mt-0.5">
              {{ errors.sort }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <Label
            for="more-maxtimems"
            class="text-[11px] font-medium text-muted-foreground w-20 shrink-0"
          >
            Max Time MS
          </Label>
          <div class="flex-1">
            <Input
              id="more-maxtimems"
              v-model="rawInput.maxTimeMS"
              type="number"
              placeholder="60000"
              class="h-7 px-2 text-xs font-mono w-full"
              :class="{ 'border-destructive': errors.maxTimeMS }"
              @keyup.enter="handleApply"
            />
            <p
              v-if="errors.maxTimeMS"
              class="text-[10px] text-destructive mt-0.5"
            >
              {{ errors.maxTimeMS }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Actions & Shortcuts -->
    <div
      class="flex items-center justify-between pt-1 border-t border-border/30"
    >
      <div class="text-[11px] text-muted-foreground flex items-center gap-2">
        <span><kbd class="font-mono text-foreground/80">⌘↵</kbd>: Apply</span>
        <span>•</span>
        <span><kbd class="font-mono text-foreground/80">Esc</kbd>: Close</span>
      </div>

      <div class="flex items-center gap-2">
        <Button
          variant="ghost"
          size="xs"
          class="h-6 px-2 text-xs"
          @click="handleReset"
        >
          Reset
        </Button>
        <Button
          size="xs"
          variant="secondary"
          class="h-6 px-2.5 text-xs font-medium"
          :disabled="props.isLoading"
          @click="handleApply"
        >
          <Icon
            v-if="props.isLoading"
            name="hugeicons:loading-03"
            class="size-3 mr-1 animate-spin"
          />
          <Icon v-else name="hugeicons:play" class="size-3 mr-1" />
          <span>Apply</span>
        </Button>
      </div>
    </div>
  </div>
</template>
```

- [x] **Step 4: Export from `components/index.ts`**

In `components/modules/quick-query/mongodb/components/index.ts`:

```typescript
export { default as MongoQueryMoreOptions } from './MongoQueryMoreOptions.vue';
```

- [x] **Step 5: Run component test to verify it passes**

Run: `bun test:nuxt test/nuxt/components/modules/quick-query/mongodb/MongoQueryMoreOptions.test.ts`
Expected: PASS

---

### Task 5: Integration in `MongoCollectionDetail.vue` & Verification

**Files:**

- Modify: `components/modules/quick-query/mongodb/containers/MongoCollectionDetail.vue`
- Verify with test suites and typecheck

- [x] **Step 1: Wire `isShowMoreOptions` in `MongoCollectionDetail.vue`**

In `MongoCollectionDetail.vue`:

1. Import `MongoQueryMoreOptions` from `../components/MongoQueryMoreOptions.vue`.
2. Add state: `const isShowMoreOptions = ref(false);`.
3. Extract `applyMoreOptions` from `useMongoCollectionQuery`.
4. Update template:

```vue
<MongoQuickQueryControlBar
  :total-rows="total"
  :current-total-rows="documents.length"
  :limit="limit"
  :skip="skip"
  :is-loading="isLoading"
  :view-mode="viewMode"
  :is-show-filters="isShowFilters"
  :is-show-more-options="isShowMoreOptions"
  :active-filter-count="activeFilterCount"
  @on-next-page="onNextPage"
  @on-previous-page="onPreviousPage"
  @on-refresh="onRefresh"
  @on-paginate="onPaginate"
  @on-insert-click="isInsertModalOpen = true"
  @open-export="scope => (exportModalState = { open: true, scope })"
  @on-toggle-filter="
    () => {
      isShowFilters = !isShowFilters;
      if (isShowFilters) {
        mongoFilterRef?.onShowSearch();
      }
    }
  "
  @on-toggle-more-options="isShowMoreOptions = !isShowMoreOptions"
  @update:view-mode="mode => (viewMode = mode)"
/>

<MongoCollectionFilter
  v-if="isShowFilters"
  ref="mongoFilterRef"
  v-model:is-show-filters="isShowFilters"
  :documents="documents"
  :is-loading="isLoading"
  :persist-key="filterPersistKey"
  :error="error"
  @apply-filter="applyFilter"
/>

<MongoQueryMoreOptions
  v-if="isShowMoreOptions"
  :is-loading="isLoading"
  @apply="applyMoreOptions"
  @close="isShowMoreOptions = false"
/>
```

- [x] **Step 2: Run Nuxt and Unit tests**

Run:

1. `bun test:nuxt test/nuxt/components/modules/quick-query/mongodb/MongoQuickQueryControlBar.test.ts`
2. `bun test:nuxt test/nuxt/components/modules/quick-query/mongodb/MongoQueryMoreOptions.test.ts`
3. `bun test:unit`

- [x] **Step 3: Run Typecheck**

Run: `bun run typecheck`
Expected: 0 errors

- [x] **Step 4: Update Knowledge Graph**

Run: `graphify update .`
Expected: AST extraction complete
