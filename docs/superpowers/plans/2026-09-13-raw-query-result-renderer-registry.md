# Raw Query Result Renderer Registry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hard-coded raw-query result navigation and renderer branches with an exhaustive, per-`DatabaseClientType` registry.

**Architecture:** `RawQueryResultTabs.vue` continues to own horizontal query history, layout, and prepared result data. A static exhaustive registry supplies ordered view definitions, configurable availability policies, and dynamic renderer components; every renderer receives one shared context prop.

**Tech Stack:** Nuxt 3, Vue 3 Composition API with `<script setup lang="ts">`, TypeScript, Pinia, Vitest, Vue Test Utils, Bun.

**Spec:** `docs/superpowers/specs/2026-09-13-raw-query-result-renderer-registry-design.md`

## Global Constraints

- Keep this phase render-only: do not move schema loading, column mapping, row normalization, caching, or execution dispatch into registry adapters.
- Register every current `DatabaseClientType` explicitly with `satisfies Record<DatabaseClientType, RawQueryResultProfile>`.
- Use the registry as the single source for vertical view order, visibility, availability, and content renderer selection.
- Unsupported views are omitted from a database profile; temporarily unavailable views remain visible and disabled with a reason.
- Availability behavior is configured per view through `always`, `success-only`, `error-only`, and an optional predicate.
- All top-level registered renderers accept exactly one `context: RawQueryResultViewContext` prop.
- Preserve the horizontal result tabs, close actions, fullscreen behavior, schema loading, and formatted-data cache.
- Set `ExecutedResultItem.metadata.connection` when SQL or Redis result tabs are created so the registry has a database type during loading.
- Use `text-xxs` for 10px text and `size="xxs"` for 24px controls; do not introduce arbitrary 10px classes or custom compact-control height overrides.
- Do not add new icons unless necessary. If a Hugeicons name changes, verify it in `node_modules/@iconify-json/hugeicons/icons.json`.
- The referenced `.github/skills/testing-orcaq/SKILL.md` file is absent; use the verification commands documented in repository `AGENTS.md`.
- After source changes, run `bun run typecheck`, `bun test:unit`, and `graphify update .` before claiming completion.

---

## File Structure

### Create

- `components/modules/raw-query/registry/rawQueryResult.types.ts` — shared renderer context and registry contracts.
- `components/modules/raw-query/registry/rawQueryResultDefaults.ts` — default labels/renderers, profile factory, availability resolution, and active-view fallback.
- `components/modules/raw-query/registry/rawQueryResultRegistry.ts` — exhaustive database profiles and profile lookup.
- `components/modules/raw-query/components/result-tab/adapters/ResultTabChartRenderer.vue` — adapts shared context to Chart Builder props.
- `components/modules/raw-query/components/result-tab/adapters/ResultTabExplainRenderer.vue` — adapts shared context to Explain Query props.
- `components/modules/raw-query/components/result-tab/adapters/MongoResultTabRenderer.vue` — adapts shared context to Mongo document renderer props.
- `components/modules/raw-query/components/result-tab/adapters/MongoConsoleTabRenderer.vue` — adapts shared context to Mongo console props.
- `test/nuxt/components/modules/raw-query/rawQueryResultDefaults.test.ts` — factory, availability, and fallback unit coverage.
- `test/nuxt/components/modules/raw-query/rawQueryResultRegistry.test.ts` — exhaustive database profile coverage.
- `test/nuxt/components/modules/raw-query/RawQueryResultRenderers.test.ts` — shared context and adapter behavior.

### Modify

- `components/modules/raw-query/components/RawQueryResultTabs.vue` — consume registry for vertical navigation and dynamic content.
- `components/modules/raw-query/components/result-tab/ResultTabResultView.vue` — replace individual props with shared context.
- `components/modules/raw-query/components/result-tab/ResultTabRawView.vue` — replace individual props with shared context.
- `components/modules/raw-query/components/result-tab/ResultTabInfoView.vue` — replace `activeTab` prop with context and remove Mongo console.
- `components/modules/raw-query/components/result-tab/ResultTabErrorView.vue` — replace `activeTab` prop with context and remove stale emit/imports.
- `components/modules/raw-query/components/result-tab/index.ts` — export registry-compatible renderers and adapters where useful.
- `components/modules/raw-query/hooks/useQueryExecution.ts` — attach the selected connection to a result item before registering it.
- `test/nuxt/components/modules/raw-query/ResultTabResultView.test.ts` — construct the shared context prop.
- `test/nuxt/components/modules/raw-query/RawQueryResultTabs.test.ts` — cover per-database navigation and dynamic renderer behavior.
- `test/nuxt/components/modules/raw-query/useQueryExecution.test.ts` — cover connection availability on the initial result item.

---

### Task 1: Add Registry Contracts and Pure Resolution Rules

**Files:**

- Create: `components/modules/raw-query/registry/rawQueryResult.types.ts`
- Create: `components/modules/raw-query/registry/rawQueryResultDefaults.ts`
- Create: `test/nuxt/components/modules/raw-query/rawQueryResultDefaults.test.ts`

**Interfaces:**

- Produces: `RawQueryResultViewContext`, `RawQueryResultExecutionPolicy`, `RawQueryResultViewAvailability`, `RawQueryResultViewDefinition`, `ResolvedRawQueryResultViewDefinition`, and `RawQueryResultProfile`.
- Produces: `defineRawQueryResultView()`, `defineRawQueryResultProfile()`, `resolveRawQueryResultViewAvailability()`, `resolveRawQueryResultViews()`, and `resolveActiveRawQueryResultView()`.
- Consumes: existing `DatabaseClientType`, `ViewMode`, `ExecutedResultItem`, and `MappedRawColumn` types.

- [ ] **Step 1: Write failing tests for the view factory and availability policies**

Create `test/nuxt/components/modules/raw-query/rawQueryResultDefaults.test.ts` with focused fixtures:

```ts
import { describe, expect, it } from 'vitest';
import { ViewMode } from '~/components/modules/raw-query/interfaces';
import type { RawQueryResultViewContext } from '~/components/modules/raw-query/registry/rawQueryResult.types';
import {
  defineRawQueryResultProfile,
  defineRawQueryResultView,
  resolveActiveRawQueryResultView,
  resolveRawQueryResultViewAvailability,
  resolveRawQueryResultViews,
} from '~/components/modules/raw-query/registry/rawQueryResultDefaults';
import { DatabaseClientType } from '~/core/constants/database-client-type';

const createContext = (
  overrides: Partial<RawQueryResultViewContext> = {}
): RawQueryResultViewContext => ({
  activeTab: {
    id: 'result-1',
    metadata: {
      queryTime: 10,
      statementQuery: 'SELECT 1',
      executedAt: new Date('2026-09-13T00:00:00.000Z'),
      executeErrors: undefined,
      connection: {
        id: 'connection-1',
        workspaceId: 'workspace-1',
        type: DatabaseClientType.POSTGRES,
      } as RawQueryResultViewContext['activeTab']['metadata']['connection'],
    },
    result: [{ value: 1 }],
    seqIndex: 1,
    view: ViewMode.RESULT,
  },
  databaseType: DatabaseClientType.POSTGRES,
  activeTabColumns: [],
  formattedData: [{ value: 1 }],
  executeLoading: false,
  isStreaming: false,
  changeView: () => undefined,
  ...overrides,
});

describe('raw query result defaults', () => {
  it('rejects a configured mode without a default or override renderer', () => {
    expect(() => defineRawQueryResultView(ViewMode.CONSOLE)).toThrow(
      'No renderer registered for raw-query view "console"'
    );
  });

  it('rejects an empty result profile', () => {
    expect(() => defineRawQueryResultProfile([])).toThrow(
      'Raw-query result profile must contain at least one view'
    );
  });

  it.each([
    ['always', false, true],
    ['always', true, true],
    ['success-only', false, true],
    ['success-only', true, false],
    ['error-only', false, false],
    ['error-only', true, true],
  ] as const)(
    'resolves %s with hasError=%s to enabled=%s',
    (execution, hasError, enabled) => {
      const definition = defineRawQueryResultView(ViewMode.RESULT, {
        availability: {
          execution,
          disabledReason: 'Unavailable for this execution',
        },
      });
      const context = createContext();
      context.activeTab.metadata.executeErrors = hasError
        ? { message: 'boom', data: { message: 'boom' } }
        : undefined;

      expect(
        resolveRawQueryResultViewAvailability(definition, context)
      ).toMatchObject({ enabled });
    }
  );

  it('applies the custom predicate after execution policy passes', () => {
    const definition = defineRawQueryResultView(ViewMode.EXPLAIN, {
      availability: {
        execution: 'success-only',
        when: context =>
          context.activeTab.metadata.statementQuery.startsWith('EXPLAIN')
            ? { enabled: true }
            : { enabled: false, reason: 'Not an EXPLAIN statement' },
      },
    });

    expect(
      resolveRawQueryResultViewAvailability(definition, createContext())
    ).toEqual({ enabled: false, reason: 'Not an EXPLAIN statement' });
  });
});
```

- [ ] **Step 2: Add failing tests for resolved views and active-view fallback**

Append tests that make the expected fallback order explicit:

```ts
it('prefers the enabled error view when execution failed', () => {
  const context = createContext();
  context.activeTab.metadata.executeErrors = {
    message: 'boom',
    data: { message: 'boom' },
  };
  const profile = defineRawQueryResultProfile([
    defineRawQueryResultView(ViewMode.RESULT, {
      availability: { execution: 'success-only' },
    }),
    defineRawQueryResultView(ViewMode.INFO),
    defineRawQueryResultView(ViewMode.ERROR, {
      availability: { execution: 'error-only' },
    }),
  ]);
  const views = resolveRawQueryResultViews(profile, context);

  expect(
    resolveActiveRawQueryResultView(views, ViewMode.RESULT, true)?.mode
  ).toBe(ViewMode.ERROR);
});

it('falls back to Result and then the first enabled view', () => {
  const context = createContext();
  const profile = defineRawQueryResultProfile([
    defineRawQueryResultView(ViewMode.INFO),
    defineRawQueryResultView(ViewMode.RESULT),
  ]);
  const views = resolveRawQueryResultViews(profile, context);

  expect(
    resolveActiveRawQueryResultView(views, ViewMode.CONSOLE, false)?.mode
  ).toBe(ViewMode.RESULT);
});
```

- [ ] **Step 3: Run the focused test and verify the missing modules fail**

Run:

```bash
bun run test:nuxt -- test/nuxt/components/modules/raw-query/rawQueryResultDefaults.test.ts
```

Expected: FAIL because `rawQueryResult.types.ts` and `rawQueryResultDefaults.ts` do not exist.

- [ ] **Step 4: Implement the registry contracts**

Create `components/modules/raw-query/registry/rawQueryResult.types.ts`:

```ts
import type { Component } from 'vue';
import type { DatabaseClientType } from '~/core/constants/database-client-type';
import type { ExecutedResultItem, MappedRawColumn } from '../interfaces';
import type { ViewMode } from '../interfaces';

export interface RawQueryResultViewContext {
  activeTab: ExecutedResultItem;
  databaseType: DatabaseClientType;
  activeTabColumns: MappedRawColumn[];
  formattedData: Record<string, unknown>[];
  executeLoading: boolean;
  isStreaming: boolean;
  changeView(view: ViewMode): void;
}

export type RawQueryResultExecutionPolicy =
  | 'always'
  | 'success-only'
  | 'error-only';

export interface RawQueryResultViewAvailability {
  enabled: boolean;
  reason?: string;
}

export interface RawQueryResultViewAvailabilityConfig {
  execution?: RawQueryResultExecutionPolicy;
  when?: (context: RawQueryResultViewContext) => RawQueryResultViewAvailability;
  disabledReason?: string;
}

export interface RawQueryResultViewDefinition {
  mode: ViewMode;
  label: string;
  renderer: Component;
  availability?: RawQueryResultViewAvailabilityConfig;
}

export interface ResolvedRawQueryResultViewDefinition
  extends RawQueryResultViewDefinition {
  availabilityState: RawQueryResultViewAvailability;
}

export interface RawQueryResultProfile {
  views: readonly RawQueryResultViewDefinition[];
}
```

- [ ] **Step 5: Implement default renderers, factories, and pure resolvers**

Create `components/modules/raw-query/registry/rawQueryResultDefaults.ts`. Import the existing eager Result, Raw, Info, and Error components. Define labels for every current `ViewMode`, but leave Console without a default renderer:

```ts
import type { Component } from 'vue';
import ResultTabErrorView from '../components/result-tab/ResultTabErrorView.vue';
import ResultTabInfoView from '../components/result-tab/ResultTabInfoView.vue';
import ResultTabRawView from '../components/result-tab/ResultTabRawView.vue';
import ResultTabResultView from '../components/result-tab/ResultTabResultView.vue';
import { ViewMode } from '../interfaces';
import type {
  RawQueryResultProfile,
  RawQueryResultViewAvailability,
  RawQueryResultViewContext,
  RawQueryResultViewDefinition,
  ResolvedRawQueryResultViewDefinition,
} from './rawQueryResult.types';

export const RAW_QUERY_RESULT_VIEW_LABELS: Record<ViewMode, string> = {
  [ViewMode.RESULT]: 'Result',
  [ViewMode.ERROR]: 'Errors',
  [ViewMode.INFO]: 'Info',
  [ViewMode.RAW]: 'Raw',
  [ViewMode.EXPLAIN]: 'Explain',
  [ViewMode.CHART]: 'Chart',
  [ViewMode.CONSOLE]: 'Console',
};

export const DEFAULT_RAW_QUERY_RESULT_RENDERERS: Partial<
  Record<ViewMode, Component>
> = {
  [ViewMode.RESULT]: ResultTabResultView,
  [ViewMode.RAW]: ResultTabRawView,
  [ViewMode.INFO]: ResultTabInfoView,
  [ViewMode.ERROR]: ResultTabErrorView,
};

export function defineRawQueryResultView(
  mode: ViewMode,
  options: Partial<Omit<RawQueryResultViewDefinition, 'mode'>> = {}
): RawQueryResultViewDefinition {
  const renderer = options.renderer ?? DEFAULT_RAW_QUERY_RESULT_RENDERERS[mode];
  if (!renderer) {
    throw new Error(`No renderer registered for raw-query view "${mode}"`);
  }
  return {
    mode,
    label: options.label ?? RAW_QUERY_RESULT_VIEW_LABELS[mode],
    renderer,
    availability: options.availability,
  };
}

export function defineRawQueryResultProfile(
  views: readonly RawQueryResultViewDefinition[]
): RawQueryResultProfile {
  if (!views.length) {
    throw new Error('Raw-query result profile must contain at least one view');
  }
  return { views };
}
```

Implement the approved policy order and active-view fallback:

```ts
export function resolveRawQueryResultViews(
  profile: RawQueryResultProfile,
  context: RawQueryResultViewContext
): ResolvedRawQueryResultViewDefinition[] {
  return profile.views.map(view => ({
    ...view,
    availabilityState: resolveRawQueryResultViewAvailability(view, context),
  }));
}

export function resolveRawQueryResultViewAvailability(
  definition: RawQueryResultViewDefinition,
  context: RawQueryResultViewContext
): RawQueryResultViewAvailability {
  const config = definition.availability;
  const execution = config?.execution ?? 'always';
  const hasError = Boolean(context.activeTab.metadata.executeErrors);

  if (execution === 'success-only' && hasError) {
    return {
      enabled: false,
      reason:
        config?.disabledReason ?? 'This view requires a successful execution',
    };
  }

  if (execution === 'error-only' && !hasError) {
    return {
      enabled: false,
      reason: config?.disabledReason ?? 'This view requires an execution error',
    };
  }

  try {
    return config?.when?.(context) ?? { enabled: true };
  } catch (error) {
    if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
      throw error;
    }
    return { enabled: false, reason: 'This view is unavailable' };
  }
}

export function resolveActiveRawQueryResultView(
  views: readonly ResolvedRawQueryResultViewDefinition[],
  requestedMode: ViewMode,
  hasError: boolean
): ResolvedRawQueryResultViewDefinition | null {
  if (hasError) {
    const errorView = views.find(
      view => view.mode === ViewMode.ERROR && view.availabilityState.enabled
    );
    if (errorView) return errorView;
  }

  const requestedView = views.find(
    view => view.mode === requestedMode && view.availabilityState.enabled
  );
  if (requestedView) return requestedView;

  const resultView = views.find(
    view => view.mode === ViewMode.RESULT && view.availabilityState.enabled
  );
  if (resultView) return resultView;

  return views.find(view => view.availabilityState.enabled) ?? views[0] ?? null;
}
```

- [ ] **Step 6: Run the focused test**

Run:

```bash
bun run test:nuxt -- test/nuxt/components/modules/raw-query/rawQueryResultDefaults.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit the core registry contracts**

```bash
git add components/modules/raw-query/registry/rawQueryResult.types.ts components/modules/raw-query/registry/rawQueryResultDefaults.ts test/nuxt/components/modules/raw-query/rawQueryResultDefaults.test.ts
git commit -m "feat(raw-query): add result view registry contracts"
```

---

### Task 2: Standardize Renderer Context and Add Adapters

**Files:**

- Create: `components/modules/raw-query/components/result-tab/adapters/ResultTabChartRenderer.vue`
- Create: `components/modules/raw-query/components/result-tab/adapters/ResultTabExplainRenderer.vue`
- Create: `components/modules/raw-query/components/result-tab/adapters/MongoResultTabRenderer.vue`
- Create: `components/modules/raw-query/components/result-tab/adapters/MongoConsoleTabRenderer.vue`
- Create: `test/nuxt/components/modules/raw-query/RawQueryResultRenderers.test.ts`
- Modify: `components/modules/raw-query/components/result-tab/ResultTabResultView.vue`
- Modify: `components/modules/raw-query/components/result-tab/ResultTabRawView.vue`
- Modify: `components/modules/raw-query/components/result-tab/ResultTabInfoView.vue`
- Modify: `components/modules/raw-query/components/result-tab/ResultTabErrorView.vue`
- Modify: `components/modules/raw-query/components/result-tab/index.ts`
- Modify: `components/modules/raw-query/registry/rawQueryResultDefaults.ts`
- Modify: `test/nuxt/components/modules/raw-query/ResultTabResultView.test.ts`

**Interfaces:**

- Consumes: `RawQueryResultViewContext` from Task 1.
- Produces: four default context renderers and four context adapters.
- Produces: default Chart and Explain renderer entries in `DEFAULT_RAW_QUERY_RESULT_RENDERERS`.
- Preserves: `MongoRawQueryResultView.documents`, `MongoRawQueryConsole.logs`, `ChartBuilder` props, and `ExplainQuery.activeTab` public APIs.

- [ ] **Step 1: Convert the Result grid test fixture to the context contract and verify failure**

Replace `buildResultTabProps()` in `ResultTabResultView.test.ts` with a complete
context fixture. Add `ViewMode` to the existing import from the raw-query
interfaces:

```ts
const buildResultTabProps = () => {
  const activeTab = {
    id: 'query-1',
    metadata: {
      queryTime: 12,
      statementQuery: 'SELECT id, title FROM posts',
      executedAt: new Date('2026-05-21T00:00:00.000Z'),
      executeErrors: undefined,
      connection: {
        id: 'conn-1',
        workspaceId: 'workspace',
        type: DatabaseClientType.POSTGRES,
      },
      command: 'SELECT',
      rowCount: 1,
    },
    result: [{ id: 1, title: 'alpha' }],
    seqIndex: 1,
    view: ViewMode.RESULT,
  };

  const activeTabColumns = [
    {
      originalName: 'id',
      aliasFieldName: 'id',
      queryFieldName: 'id',
      isPrimaryKey: true,
      isForeignKey: false,
      tableName: 'posts',
      schemaName: 'public',
      sourceColumnName: 'id',
      type: 'integer',
      short_type_name: 'int4',
    },
    {
      originalName: 'title',
      aliasFieldName: 'title',
      queryFieldName: 'title',
      isPrimaryKey: false,
      isForeignKey: false,
      tableName: 'posts',
      schemaName: 'public',
      sourceColumnName: 'title',
      type: 'text',
      short_type_name: 'text',
    },
  ];

  return {
    context: {
      activeTab,
      databaseType: DatabaseClientType.POSTGRES,
      activeTabColumns,
      formattedData: [{ id: 1, title: 'alpha' }],
      executeLoading: false,
      isStreaming: false,
      changeView: vi.fn(),
    },
  };
};
```

Update overrides in the test to merge `context`, not removed top-level props. Run:

```bash
bun run test:nuxt -- test/nuxt/components/modules/raw-query/ResultTabResultView.test.ts
```

Expected: FAIL because `ResultTabResultView.vue` still requires the old prop set.

- [ ] **Step 2: Convert the four raw-query-owned renderers to `context`**

In each component use:

```ts
import type { RawQueryResultViewContext } from '../../registry/rawQueryResult.types';

const props = defineProps<{
  context: RawQueryResultViewContext;
}>();
```

For files under `components/result-tab/`, correct the relative import to `../../registry/rawQueryResult.types`.

In `ResultTabResultView.vue`, introduce computed aliases and replace every removed prop reference:

```ts
const activeTab = computed(() => props.context.activeTab);
const activeTabColumns = computed(() => props.context.activeTabColumns);
const formattedData = computed(() => props.context.formattedData);
const executeLoading = computed(() => props.context.executeLoading);
const isStreaming = computed(() => props.context.isStreaming);
```

Use `.value` in script and automatic unwrapping in the template. Preserve the existing mutation, selection, relation preview, export, and grid behavior.

In `ResultTabRawView.vue`, derive `displayData` from
`context.activeTab.metadata.rawResult ?? context.formattedData` and keep the
empty state based on formatted rows/loading/streaming.

In `ResultTabInfoView.vue`, derive all metadata from `context.activeTab` and
remove both the `MongoRawQueryConsole` import and the unconditional console
element. Keep mutation summary and truncation metadata because those are
optional fields on `ExecutedResultItem`.

In `ResultTabErrorView.vue`, derive the active tab from context. Remove the
unused `Button` import, unused `ref` import, unused emit definition, and unused
local `hasErrors()` helper if the template no longer needs it.

- [ ] **Step 3: Run the existing Result grid test**

Run:

```bash
bun run test:nuxt -- test/nuxt/components/modules/raw-query/ResultTabResultView.test.ts
```

Expected: PASS with all existing grid, edit, save, and discard assertions unchanged in meaning.

- [ ] **Step 4: Write failing adapter and shared-renderer tests**

Create `RawQueryResultRenderers.test.ts`. Mount adapters with a common context and stub their focused children. Assert the prop translation:

```ts
it('passes tabular context to Chart Builder', () => {
  const wrapper = mount(ResultTabChartRenderer, {
    props: { context },
    global: {
      stubs: {
        ChartBuilder: {
          name: 'ChartBuilder',
          props: ['activeTab', 'activeTabColumns', 'formattedData'],
          template: '<div />',
        },
      },
    },
  });

  const chart = wrapper.getComponent({ name: 'ChartBuilder' });
  expect(chart.props('activeTab')).toBe(context.activeTab);
  expect(chart.props('activeTabColumns')).toBe(context.activeTabColumns);
  expect(chart.props('formattedData')).toBe(context.formattedData);
});

it('passes Mongo logs to the focused console component', () => {
  const wrapper = mount(MongoConsoleTabRenderer, {
    props: { context: mongoContext },
    global: {
      stubs: {
        MongoRawQueryConsole: {
          name: 'MongoRawQueryConsole',
          props: ['logs'],
          template: '<div />',
        },
      },
    },
  });

  expect(
    wrapper.getComponent({ name: 'MongoRawQueryConsole' }).props('logs')
  ).toEqual(mongoContext.activeTab.metadata.logs);
});
```

Also mount `ResultTabInfoView` with a PostgreSQL context and assert the rendered text does not contain `MongoDB Raw Query`.

- [ ] **Step 5: Run the new renderer test and verify missing adapters fail**

Run:

```bash
bun run test:nuxt -- test/nuxt/components/modules/raw-query/RawQueryResultRenderers.test.ts
```

Expected: FAIL because the adapter components do not exist.

- [ ] **Step 6: Implement the four thin adapters**

Each adapter accepts exactly one context prop. For example:

```vue
<script setup lang="ts">
import { ChartBuilder } from '../../../modules/chart-builder';
import type { RawQueryResultViewContext } from '../../../registry/rawQueryResult.types';

defineProps<{ context: RawQueryResultViewContext }>();
</script>

<template>
  <ChartBuilder
    :active-tab="context.activeTab"
    :active-tab-columns="context.activeTabColumns"
    :formatted-data="context.formattedData"
  />
</template>
```

Implement the remaining translations exactly:

- Explain adapter: `context.activeTab` to `ExplainQuery.activeTab`.
- Mongo Result adapter: `context.formattedData` to `MongoRawQueryResultView.documents`.
- Mongo Console adapter: `context.activeTab.metadata.logs` to `MongoRawQueryConsole.logs`.

Do not add state, watchers, stores, or business rules to adapters.

- [ ] **Step 7: Register Chart and Explain as lazy defaults**

In `rawQueryResultDefaults.ts`:

```ts
import { defineAsyncComponent } from 'vue';

const ResultTabChartRenderer = defineAsyncComponent(
  () => import('../components/result-tab/adapters/ResultTabChartRenderer.vue')
);
const ResultTabExplainRenderer = defineAsyncComponent(
  () => import('../components/result-tab/adapters/ResultTabExplainRenderer.vue')
);

DEFAULT_RAW_QUERY_RESULT_RENDERERS[ViewMode.CHART] = ResultTabChartRenderer;
DEFAULT_RAW_QUERY_RESULT_RENDERERS[ViewMode.EXPLAIN] = ResultTabExplainRenderer;
```

Keep Console without a default so every Console-capable database must supply an explicit renderer.

- [ ] **Step 8: Export the result-tab components and run renderer tests**

Update `components/modules/raw-query/components/result-tab/index.ts` to export the four standard views and adapter components. Then run:

```bash
bun run test:nuxt -- test/nuxt/components/modules/raw-query/ResultTabResultView.test.ts test/nuxt/components/modules/raw-query/RawQueryResultRenderers.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit renderer contract migration**

```bash
git add components/modules/raw-query/components/result-tab components/modules/raw-query/registry/rawQueryResultDefaults.ts test/nuxt/components/modules/raw-query/ResultTabResultView.test.ts test/nuxt/components/modules/raw-query/RawQueryResultRenderers.test.ts
git commit -m "refactor(raw-query): standardize result renderer context"
```

---

### Task 3: Build the Exhaustive Per-Database Registry

**Files:**

- Create: `components/modules/raw-query/registry/rawQueryResultRegistry.ts`
- Create: `test/nuxt/components/modules/raw-query/rawQueryResultRegistry.test.ts`

**Interfaces:**

- Consumes: factories and contracts from Tasks 1-2.
- Produces: `RAW_QUERY_RESULT_REGISTRY` and `getRawQueryResultProfile(databaseType)`.
- Produces: explicit profiles for all 11 current `DatabaseClientType` values.

- [ ] **Step 1: Write the failing exhaustive registry test**

Create `rawQueryResultRegistry.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ViewMode } from '~/components/modules/raw-query/interfaces';
import { DEFAULT_RAW_QUERY_RESULT_RENDERERS } from '~/components/modules/raw-query/registry/rawQueryResultDefaults';
import {
  RAW_QUERY_RESULT_REGISTRY,
  getRawQueryResultProfile,
} from '~/components/modules/raw-query/registry/rawQueryResultRegistry';
import { DatabaseClientType } from '~/core/constants/database-client-type';

const modesFor = (databaseType: DatabaseClientType) =>
  getRawQueryResultProfile(databaseType).views.map(view => view.mode);

describe('raw query result registry', () => {
  it('registers every DatabaseClientType', () => {
    expect(Object.keys(RAW_QUERY_RESULT_REGISTRY).sort()).toEqual(
      Object.values(DatabaseClientType).sort()
    );
  });

  it('uses the approved PostgreSQL view order', () => {
    expect(modesFor(DatabaseClientType.POSTGRES)).toEqual([
      ViewMode.RESULT,
      ViewMode.EXPLAIN,
      ViewMode.RAW,
      ViewMode.INFO,
      ViewMode.CHART,
      ViewMode.ERROR,
    ]);
  });

  it('hides Explain and Chart for Redis', () => {
    expect(modesFor(DatabaseClientType.REDIS)).toEqual([
      ViewMode.RESULT,
      ViewMode.RAW,
      ViewMode.INFO,
      ViewMode.ERROR,
    ]);
  });

  it('uses Console instead of Chart for MongoDB', () => {
    expect(modesFor(DatabaseClientType.MONGODB)).toEqual([
      ViewMode.RESULT,
      ViewMode.RAW,
      ViewMode.INFO,
      ViewMode.CONSOLE,
      ViewMode.ERROR,
    ]);
  });

  it('reuses the default Raw renderer for MongoDB', () => {
    const raw = getRawQueryResultProfile(DatabaseClientType.MONGODB).views.find(
      view => view.mode === ViewMode.RAW
    );
    expect(raw?.renderer).toBe(
      DEFAULT_RAW_QUERY_RESULT_RENDERERS[ViewMode.RAW]
    );
  });
});
```

Add a table-driven assertion for MySQL, MySQL2, MariaDB, SQLite3,
Better SQLite3, MSSQL, Oracle, and Snowflake expecting
`[RESULT, RAW, INFO, CHART, ERROR]`.

- [ ] **Step 2: Run the registry test and verify failure**

Run:

```bash
bun run test:nuxt -- test/nuxt/components/modules/raw-query/rawQueryResultRegistry.test.ts
```

Expected: FAIL because `rawQueryResultRegistry.ts` does not exist.

- [ ] **Step 3: Implement reusable view-definition builders**

Inside `rawQueryResultRegistry.ts`, define fresh definitions rather than sharing mutable arrays:

```ts
const successOnly = {
  execution: 'success-only',
  disabledReason: 'The query execution contains an error',
} as const;

const errorOnly = {
  execution: 'error-only',
  disabledReason: 'This execution has no errors',
} as const;

const createSqlViews = (includeExplain: boolean) => [
  defineRawQueryResultView(ViewMode.RESULT, {
    availability: successOnly,
  }),
  ...(includeExplain
    ? [
        defineRawQueryResultView(ViewMode.EXPLAIN, {
          availability: {
            ...successOnly,
            when: context =>
              context.activeTab.metadata.statementQuery
                .trimStart()
                .toUpperCase()
                .startsWith('EXPLAIN')
                ? { enabled: true }
                : {
                    enabled: false,
                    reason: 'Available only for EXPLAIN queries',
                  },
          },
        }),
      ]
    : []),
  defineRawQueryResultView(ViewMode.RAW, { availability: successOnly }),
  defineRawQueryResultView(ViewMode.INFO),
  defineRawQueryResultView(ViewMode.CHART, { availability: successOnly }),
  defineRawQueryResultView(ViewMode.ERROR, { availability: errorOnly }),
];
```

Load the Mongo adapters lazily:

```ts
const MongoResultTabRenderer = defineAsyncComponent(
  () => import('../components/result-tab/adapters/MongoResultTabRenderer.vue')
);
const MongoConsoleTabRenderer = defineAsyncComponent(
  () => import('../components/result-tab/adapters/MongoConsoleTabRenderer.vue')
);
```

Then define the complete Redis and Mongo view builders:

```ts
const createRedisViews = () => [
  defineRawQueryResultView(ViewMode.RESULT, {
    availability: successOnly,
  }),
  defineRawQueryResultView(ViewMode.RAW, {
    availability: successOnly,
  }),
  defineRawQueryResultView(ViewMode.INFO, {
    availability: { execution: 'always' },
  }),
  defineRawQueryResultView(ViewMode.ERROR, {
    availability: errorOnly,
  }),
];

const createMongoViews = () => [
  defineRawQueryResultView(ViewMode.RESULT, {
    renderer: MongoResultTabRenderer,
    availability: { execution: 'always' },
  }),
  defineRawQueryResultView(ViewMode.RAW, {
    availability: successOnly,
  }),
  defineRawQueryResultView(ViewMode.INFO, {
    availability: { execution: 'always' },
  }),
  defineRawQueryResultView(ViewMode.CONSOLE, {
    renderer: MongoConsoleTabRenderer,
    availability: { execution: 'always' },
  }),
  defineRawQueryResultView(ViewMode.ERROR, {
    availability: errorOnly,
  }),
];
```

- [ ] **Step 4: Implement all explicit database profiles**

Create a named profile for each enum value, even when it calls the same SQL
builder:

```ts
const postgresProfile = defineRawQueryResultProfile(createSqlViews(true));
const mysqlProfile = defineRawQueryResultProfile(createSqlViews(false));
const mysql2Profile = defineRawQueryResultProfile(createSqlViews(false));
const mariaDbProfile = defineRawQueryResultProfile(createSqlViews(false));
const redisProfile = defineRawQueryResultProfile(createRedisViews());
const mongoProfile = defineRawQueryResultProfile(createMongoViews());
const sqliteProfile = defineRawQueryResultProfile(createSqlViews(false));
const betterSqliteProfile = defineRawQueryResultProfile(createSqlViews(false));
const snowflakeProfile = defineRawQueryResultProfile(createSqlViews(false));
const mssqlProfile = defineRawQueryResultProfile(createSqlViews(false));
const oracleProfile = defineRawQueryResultProfile(createSqlViews(false));
```

Map all profiles with the exact exhaustive expression required by the spec.
Implement the lookup without an undefined fallback:

```ts
export function getRawQueryResultProfile(
  databaseType: DatabaseClientType
): RawQueryResultProfile {
  return RAW_QUERY_RESULT_REGISTRY[databaseType];
}
```

- [ ] **Step 5: Run registry and defaults tests**

Run:

```bash
bun run test:nuxt -- test/nuxt/components/modules/raw-query/rawQueryResultDefaults.test.ts test/nuxt/components/modules/raw-query/rawQueryResultRegistry.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit the exhaustive registry**

```bash
git add components/modules/raw-query/registry/rawQueryResultRegistry.ts test/nuxt/components/modules/raw-query/rawQueryResultRegistry.test.ts
git commit -m "feat(raw-query): register database result profiles"
```

---

### Task 4: Render Navigation and Content from the Registry

**Files:**

- Modify: `components/modules/raw-query/components/RawQueryResultTabs.vue`
- Modify: `test/nuxt/components/modules/raw-query/RawQueryResultTabs.test.ts`

**Interfaces:**

- Consumes: `getRawQueryResultProfile()`, `resolveRawQueryResultViews()`, `resolveActiveRawQueryResultView()`, and `RawQueryResultViewContext`.
- Produces: registry-driven vertical navigation and one dynamic content renderer.
- Preserves: all existing component emits and horizontal tab behavior.

- [ ] **Step 1: Update test fixtures to include explicit database types**

In `createExecutedResults()`, make the default connection PostgreSQL:

```ts
connection: {
  id: 'conn-1',
  workspaceId: 'workspace',
  type: DatabaseClientType.POSTGRES,
},
```

Add a helper that returns a tab for a requested database type and optional
view/error state. This prevents individual tests from mutating a loosely typed
fixture.

- [ ] **Step 2: Write failing navigation tests for PostgreSQL, Redis, and MongoDB**

Add assertions using stable `data-view-mode` attributes:

```ts
const viewModes = (wrapper: VueWrapper) =>
  wrapper
    .findAll('[data-view-mode]')
    .map(item => item.attributes('data-view-mode'));

expect(viewModes(postgresWrapper)).toEqual([
  ViewMode.RESULT,
  ViewMode.EXPLAIN,
  ViewMode.RAW,
  ViewMode.INFO,
  ViewMode.CHART,
  ViewMode.ERROR,
]);

expect(viewModes(redisWrapper)).toEqual([
  ViewMode.RESULT,
  ViewMode.RAW,
  ViewMode.INFO,
  ViewMode.ERROR,
]);

expect(viewModes(mongoWrapper)).toEqual([
  ViewMode.RESULT,
  ViewMode.RAW,
  ViewMode.INFO,
  ViewMode.CONSOLE,
  ViewMode.ERROR,
]);
```

- [ ] **Step 3: Write failing availability and interaction tests**

Cover configured behavior instead of checking mode-specific implementation:

```ts
it('does not emit view changes from a disabled registry view', async () => {
  const wrapper = mountResultTabs({
    databaseType: DatabaseClientType.POSTGRES,
    view: ViewMode.RESULT,
    executeErrors: { message: 'boom', data: { message: 'boom' } },
  });

  await wrapper.get('[data-view-mode="result"]').trigger('click');
  expect(wrapper.emitted('update:view')).toBeUndefined();
});

it('emits a view change from an enabled registry view', async () => {
  const wrapper = mountResultTabs({
    databaseType: DatabaseClientType.POSTGRES,
    view: ViewMode.RESULT,
  });

  await wrapper.get('[data-view-mode="info"]').trigger('click');
  expect(wrapper.emitted('update:view')).toContainEqual([
    'query-1',
    ViewMode.INFO,
  ]);
});
```

Assert disabled items expose the registry reason through an accessible title or
tooltip content.

- [ ] **Step 4: Write failing dynamic renderer and reconciliation tests**

Stub registered renderers with named components and assert the current renderer
receives a `context` containing the active tab, database type, formatted rows,
columns, loading state, streaming state, and `changeView` callback.

Add a failed-execution test where the stored mode is Result. After one Vue tick,
assert the Error renderer is active and the component emitted:

```ts
expect(wrapper.emitted('update:view')).toContainEqual([
  'query-1',
  ViewMode.ERROR,
]);
```

Add a missing-database-type test that renders an explicit unsupported state and
does not display PostgreSQL views.

- [ ] **Step 5: Run the RawQueryResultTabs tests and verify failure**

Run:

```bash
bun run test:nuxt -- test/nuxt/components/modules/raw-query/RawQueryResultTabs.test.ts
```

Expected: FAIL because the component still uses `defaultViewModes`, Mongo
branches, and the content `v-else-if` chain.

- [ ] **Step 6: Replace hard-coded profile and renderer imports**

Remove direct imports of `DatabaseClientType`, Chart Builder, Explain Query,
Mongo result/console components, and individual result renderers from
`RawQueryResultTabs.vue`.

Import registry APIs and types:

```ts
import type { RawQueryResultViewContext } from '../registry/rawQueryResult.types';
import {
  resolveActiveRawQueryResultView,
  resolveRawQueryResultViews,
} from '../registry/rawQueryResultDefaults';
import { getRawQueryResultProfile } from '../registry/rawQueryResultRegistry';
```

Keep existing schema-store and formatted-data logic unchanged.

- [ ] **Step 7: Build the context, resolved views, and active view**

Use nullable computed values until both the active tab and database type exist:

```ts
const activeDatabaseType = computed(
  () => activeTab.value?.metadata.connection?.type
);

const resultViewContext = computed<RawQueryResultViewContext | null>(() => {
  const tab = activeTab.value;
  const databaseType = activeDatabaseType.value;
  if (!tab || !databaseType) return null;

  return {
    activeTab: tab,
    databaseType,
    activeTabColumns: activeTabColumns.value,
    formattedData: formattedData.value,
    executeLoading: props.executeLoading,
    isStreaming: props.isStreaming,
    changeView: setViewMode,
  };
});

const resolvedViews = computed(() => {
  const context = resultViewContext.value;
  if (!context) return [];
  return resolveRawQueryResultViews(
    getRawQueryResultProfile(context.databaseType),
    context
  );
});

const activeView = computed(() =>
  resolveActiveRawQueryResultView(
    resolvedViews.value,
    currentView.value,
    Boolean(activeTab.value?.metadata.executeErrors)
  )
);
```

- [ ] **Step 8: Synchronize fallback view state**

Watch only the resolved tab ID and mode, and guard against repeated emits:

```ts
watch(
  () => [props.activeTabId, activeView.value?.mode] as const,
  ([tabId, resolvedMode]) => {
    if (tabId && resolvedMode && activeTab.value?.view !== resolvedMode) {
      emit('update:view', tabId, resolvedMode);
    }
  },
  { immediate: true }
);
```

The owner remains responsible for mutating the stored result item through the
existing `update:view` event.

- [ ] **Step 9: Replace vertical navigation with resolved definitions**

Render one semantic button per resolved view. Keep the existing vertical
writing mode and visual classes, but derive active, disabled, cursor, and hover
states from `view.availabilityState.enabled`. Add
`data-view-mode="view.mode"` for stable tests.

Use the existing Tooltip components to show
`view.availabilityState.reason` for disabled views. The click handler must
return without emitting when the definition is disabled:

```ts
const selectView = (view: ResolvedRawQueryResultViewDefinition) => {
  if (!view.availabilityState.enabled) return;
  setViewMode(view.mode);
};
```

Because a disabled native button does not reliably receive pointer events,
place the button inside the tooltip trigger's neutral `<span>` wrapper. The
wrapper owns the tooltip interaction; the button retains the real `disabled`
attribute for keyboard and accessibility semantics:

```vue
<Tooltip v-for="view in resolvedViews" :key="view.mode">
  <TooltipTrigger as-child>
    <span>
      <button
        type="button"
        :data-view-mode="view.mode"
        :disabled="!view.availabilityState.enabled"
        @click="selectView(view)"
      >
        {{ view.label }}
      </button>
    </span>
  </TooltipTrigger>
  <TooltipContent v-if="view.availabilityState.reason">
    {{ view.availabilityState.reason }}
  </TooltipContent>
</Tooltip>
```

- [ ] **Step 10: Replace the content branch with one dynamic component**

Keep `BaseEmpty` for no active tab and add a distinct unsupported state when an
active tab has no database type. Keep the existing content border and loading
overlay.

Replace all mode-specific `v-else-if` branches with:

```vue
<component
  :is="activeView.renderer"
  v-else-if="activeView && resultViewContext"
  :key="`${resultViewContext.activeTab.id}:${activeView.mode}`"
  :context="resultViewContext"
/>
```

- [ ] **Step 11: Run focused registry and component tests**

Run:

```bash
bun run test:nuxt -- test/nuxt/components/modules/raw-query/rawQueryResultDefaults.test.ts test/nuxt/components/modules/raw-query/rawQueryResultRegistry.test.ts test/nuxt/components/modules/raw-query/RawQueryResultRenderers.test.ts test/nuxt/components/modules/raw-query/ResultTabResultView.test.ts test/nuxt/components/modules/raw-query/RawQueryResultTabs.test.ts
```

Expected: PASS.

- [ ] **Step 12: Commit registry-driven rendering**

```bash
git add components/modules/raw-query/components/RawQueryResultTabs.vue test/nuxt/components/modules/raw-query/RawQueryResultTabs.test.ts
git commit -m "refactor(raw-query): render result views from registry"
```

---

### Task 5: Bind the Initial Result Tab to Its Connection

**Files:**

- Modify: `components/modules/raw-query/hooks/useQueryExecution.ts:244`
- Modify: `test/nuxt/components/modules/raw-query/useQueryExecution.test.ts`

**Interfaces:**

- Consumes: the existing `connection: Ref<Connection | undefined>` passed to `useQueryExecution()`.
- Produces: every newly registered SQL/Redis `ExecutedResultItem` has `metadata.connection` before the first response callback.

- [ ] **Step 1: Write the failing initial-connection assertion**

In the normal streaming test, use a complete PostgreSQL connection fixture and
inspect the first `addResultTab` call before invoking stream callbacks:

```ts
const connectionValue = {
  id: 'connection-1',
  workspaceId: 'workspace-1',
  type: DatabaseClientType.POSTGRES,
  connectionString: 'postgres://localhost/orcaq',
};
const connection = ref(connectionValue);

await executeCurrentStatement({
  currentStatements: [
    { text: 'SELECT * FROM users', from: 0, to: 18, type: 'Statement' },
  ],
});

expect(resultTabsMock.addResultTab).toHaveBeenCalledWith(
  expect.objectContaining({
    metadata: expect.objectContaining({
      connection: connectionValue,
    }),
  })
);
```

Add the same assertion to the Redis execution test to ensure Redis does not
temporarily receive a SQL profile while its request is pending.

- [ ] **Step 2: Run the focused execution test and verify failure**

Run:

```bash
bun run test:nuxt -- test/nuxt/components/modules/raw-query/useQueryExecution.test.ts
```

Expected: FAIL because the initial item currently sets `connection: undefined`.

- [ ] **Step 3: Set the connection during result item construction**

Change only the initial metadata field:

```ts
const executedResultItem: ExecutedResultItem = {
  id: uuidv4(),
  metadata: {
    queryTime: 0,
    statementQuery: executeQuery,
    executedAt: new Date(),
    executeErrors: undefined,
    fieldDefs: undefined,
    connection: connection.value,
  },
  result: [],
  view: executedResultView,
  seqIndex: seqIndex.value,
};
```

Do not change later metadata refreshes; they remain harmless and preserve the
current execution flow.

- [ ] **Step 4: Run execution and result-tab tests**

Run:

```bash
bun run test:nuxt -- test/nuxt/components/modules/raw-query/useQueryExecution.test.ts test/nuxt/components/modules/raw-query/RawQueryResultTabs.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the connection invariant**

```bash
git add components/modules/raw-query/hooks/useQueryExecution.ts test/nuxt/components/modules/raw-query/useQueryExecution.test.ts
git commit -m "fix(raw-query): bind result tabs to execution connection"
```

---

### Task 6: Run Required Verification and Refresh Graphify

**Files:**

- Potentially modify: `graphify-out/graph.json`
- Potentially modify: other tracked `graphify-out/` generated outputs changed by the incremental update.

**Interfaces:**

- Consumes: completed implementation from Tasks 1-5.
- Produces: repository-required type/unit verification and an updated knowledge graph.

- [ ] **Step 1: Run the complete raw-query Nuxt test set touched by the refactor**

Run:

```bash
bun run test:nuxt -- test/nuxt/components/modules/raw-query/rawQueryResultDefaults.test.ts test/nuxt/components/modules/raw-query/rawQueryResultRegistry.test.ts test/nuxt/components/modules/raw-query/RawQueryResultRenderers.test.ts test/nuxt/components/modules/raw-query/ResultTabResultView.test.ts test/nuxt/components/modules/raw-query/RawQueryResultTabs.test.ts test/nuxt/components/modules/raw-query/useQueryExecution.test.ts test/nuxt/components/modules/raw-query/MongoRawQueryResultView.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run mandatory type checking**

Run:

```bash
bun run typecheck
```

Expected: PASS. Stop and fix all errors before proceeding; the task cannot be
reported complete with a failing typecheck.

- [ ] **Step 3: Run the mandatory unit project**

Run:

```bash
bun test:unit
```

Expected: PASS. If a failure is unrelated, capture the exact failing test and
demonstrate that it also fails without the current implementation before
reporting it as unrelated.

- [ ] **Step 4: Check formatting for changed source and test files**

Run Prettier only on files changed by this implementation:

```bash
bunx prettier --check components/modules/raw-query/registry components/modules/raw-query/components/RawQueryResultTabs.vue components/modules/raw-query/components/result-tab components/modules/raw-query/hooks/useQueryExecution.ts test/nuxt/components/modules/raw-query
```

Expected: PASS. If it fails, run the same command with `--write`, inspect the
diff, and rerun the focused tests affected by formatting.

- [ ] **Step 5: Refresh the project knowledge graph**

Run:

```bash
graphify update .
```

Expected: the incremental update completes successfully and includes the new
registry files and relationships.

- [ ] **Step 6: Inspect the final diff and repository state**

Run:

```bash
git status --short
git diff --check
git log --oneline -6
```

Expected: no whitespace errors; only expected generated Graphify changes may
remain uncommitted.

- [ ] **Step 7: Commit Graphify outputs only if the update changed tracked files**

First list exact changed Graphify paths:

```bash
git status --short graphify-out
```

If tracked files changed, stage only those reported paths and commit:

```bash
git add graphify-out
git commit -m "chore(graphify): refresh raw query registry graph"
```

If no tracked Graphify files changed, skip this commit. Do not stage unrelated
user changes.

---

## Completion Criteria

- Every `DatabaseClientType` has an explicit registry profile.
- PostgreSQL exposes Result, Explain, Raw, Info, Chart, and Errors in that order.
- SQL clients other than PostgreSQL expose Result, Raw, Info, Chart, and Errors.
- Redis exposes Result, Raw, Info, and Errors.
- MongoDB exposes Result, Raw, Info, Console, and Errors.
- Navigation visibility, disabled state, reason, and content component all come from one registry definition.
- Mongo Result can remain enabled after an execution error through its profile config.
- Shared Info no longer renders the Mongo console.
- Missing database type produces an unsupported state rather than a PostgreSQL fallback.
- Initial SQL and Redis result items carry their connection before appearing in the UI.
- Focused Nuxt tests, `bun run typecheck`, and `bun test:unit` pass.
- `graphify update .` completes after source modifications.
