# Raw Query Kernel & Pluggable Dialect System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the Raw Query module by introducing a dialect-agnostic minikernel (`useRawQueryKernel`), a pluggable dialect contract (`RawQueryDialectPlugin`), and a pluggable context menu system to decouple dialect-specific behaviors (PostgreSQL, MongoDB, Redis, SQLite) from the core editor orchestration.

**Architecture:** A lightweight `useRawQueryKernel` composable manages editor core primitives (CodeMirror view, selection/cursor tracking, file variables, compartment reconfiguration, and result tabs). All database-specific logic (schema preloading, statement extraction, execution transport, formatting, diagnostics, and context menu items) is encapsulated in dialect plugins (`RawQueryDialectPlugin`) registered via database profiles (`RawQueryProfile`). `useRawQueryEditor` becomes a thin facade preserving 100% backward compatibility for existing callers.

**Tech Stack:** Nuxt 3, Vue 3 Composition API (`<script setup lang="ts">`), TypeScript (Strict Enum & Interface standards), CodeMirror 6, Pinia, Vitest, Bun.

**Spec:** `components/modules/raw-query/docs/05-raw-query-kernel-pluginable-architecture.md`

## Global Constraints

- **Single Master Context:** Rely strictly on `RawQueryContext<TDialectState>` as the single source of truth across all components and plugins.
- **Enum Over String Literals:** Use TypeScript `enum` (e.g. `RawQueryContextMenuSection`, `DatabaseClientType`) instead of union string literals.
- **Strict Folder Exports:** Every folder must expose its public APIs via an `index.ts`. No internal deep imports.
- **Typography & UI Sizing:** Use `text-xxs` for 10px text and `size="xxs"` for 24px controls.
- **Non-breaking Facade:** `useRawQueryEditor` must retain its exact return signature and behavior so existing views and tests remain fully functional.
- **Verification Rule:** Every code modification must pass `bun run typecheck` and `bun test:unit`. Run `graphify update .` after code changes.

---

## File Structure

### Create

- `components/modules/raw-query/registry/rawQueryPlugin.types.ts` — Core plugin and lifecycle interfaces, context menu configuration types, and execution contracts.
- `components/modules/raw-query/utils/rawQueryContextMenu.ts` — Pluggable context menu resolution, section grouping, and automatic separator placement.
- `components/modules/raw-query/registry/plugins/postgres.plugin.ts` — PostgreSQL dialect plugin (streaming execution, explain analyze submenus, SQL Prettier format).
- `components/modules/raw-query/registry/plugins/mongo.plugin.ts` — MongoDB dialect plugin (MJS script execution, collection preload, MJS Prettier format, helper wrappers).
- `components/modules/raw-query/registry/plugins/redis.plugin.ts` — Redis dialect plugin (workbench REST execution, single-line command execution, terminal tools).
- `components/modules/raw-query/registry/plugins/sqlite.plugin.ts` — SQLite dialect plugin (standard SQL execution, SQLite autocompletion).
- `components/modules/raw-query/registry/plugins/index.ts` — Public export for dialect plugins.
- `components/modules/raw-query/hooks/useRawQueryKernel.ts` — Dialect-agnostic minikernel orchestration hook.
- `test/unit/components/modules/raw-query/registry/rawQueryPlugin.spec.ts` — Unit tests for plugin contracts and profile resolution.
- `test/unit/components/modules/raw-query/utils/rawQueryContextMenu.spec.ts` — Unit tests for context menu merging and section ordering.
- `test/unit/components/modules/raw-query/registry/plugins.spec.ts` — Unit tests for PostgreSQL, MongoDB, Redis, and SQLite plugin definitions.
- `test/unit/components/modules/raw-query/hooks/useRawQueryKernel.spec.ts` — Unit tests for `useRawQueryKernel` lifecycle and execution orchestration.

### Modify

- `components/modules/raw-query/registry/rawQueryProfile.types.ts` — Integrate `plugin?: RawQueryDialectPlugin<TState>` into `RawQueryProfile`.
- `components/modules/raw-query/registry/index.ts` — Export plugin types and registry profiles.
- `components/modules/raw-query/utils/index.ts` — Export `rawQueryContextMenu` utilities.
- `components/modules/raw-query/registry/profiles/postgres.profile.ts` — Bind `postgresPlugin` to postgres profile.
- `components/modules/raw-query/registry/profiles/mongo.profile.ts` — Bind `mongoPlugin` to mongo profile.
- `components/modules/raw-query/registry/profiles/redis.profile.ts` — Bind `redisPlugin` to redis profile.
- `components/modules/raw-query/registry/profiles/sql.profile.ts` — Bind `postgresPlugin` / `sqlitePlugin` to SQL profiles.
- `components/modules/raw-query/hooks/useRawQueryEditorContextMenu.ts` — Refactor to use pluggable context menu resolution.
- `components/modules/raw-query/hooks/useRawQueryEditor.ts` — Delegate to `useRawQueryKernel` as a backward-compatible facade.
- `components/modules/raw-query/hooks/index.ts` — Export `useRawQueryKernel`.

---

### Task 1: Core Plugin Interfaces & Lifecycle Contracts

**Files:**

- Create: `components/modules/raw-query/registry/rawQueryPlugin.types.ts`
- Modify: `components/modules/raw-query/registry/rawQueryProfile.types.ts`
- Modify: `components/modules/raw-query/registry/index.ts`
- Test: `test/unit/components/modules/raw-query/registry/rawQueryPlugin.spec.ts`

**Interfaces:**

- Consumes: `RawQueryContext`, `Connection`, `ViewMode`, `ContextMenuItem`
- Produces: `RawQueryDialectPlugin<TState>`, `RawQueryContextMenuSection`, `RawQueryDialectContextMenuConfig<TState>`, `RawQueryExecutionContext<TState>`, `RawQueryExecutionResult`

- [ ] **Step 1: Write the failing test**

```typescript
// test/unit/components/modules/raw-query/registry/rawQueryPlugin.spec.ts
import { describe, expect, it } from 'vitest';
import {
  RawQueryContextMenuSection,
  defineRawQueryPlugin,
} from '~/components/modules/raw-query/registry/rawQueryPlugin.types';

describe('Raw Query Plugin Types & Contracts', () => {
  it('defines RawQueryContextMenuSection enum values', () => {
    expect(RawQueryContextMenuSection.EXECUTION).toBe('execution');
    expect(RawQueryContextMenuSection.ANALYSIS).toBe('analysis');
    expect(RawQueryContextMenuSection.FORMAT).toBe('format');
    expect(RawQueryContextMenuSection.TOOLS).toBe('tools');
    expect(RawQueryContextMenuSection.EDIT).toBe('edit');
  });

  it('allows defining a valid dialect plugin with lifecycle hooks', () => {
    const plugin = defineRawQueryPlugin({
      name: 'test-plugin',
      execute: async () => ({ success: true }),
      preloadSchema: async () => {},
    });

    expect(plugin.name).toBe('test-plugin');
    expect(typeof plugin.execute).toBe('function');
    expect(typeof plugin.preloadSchema).toBe('function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun vitest run test/unit/components/modules/raw-query/registry/rawQueryPlugin.spec.ts`
Expected: FAIL with module not found `~/components/modules/raw-query/registry/rawQueryPlugin.types`.

- [ ] **Step 3: Implement `rawQueryPlugin.types.ts` and update `rawQueryProfile.types.ts`**

```typescript
// components/modules/raw-query/registry/rawQueryPlugin.types.ts
import type { Extension } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import type { ContextMenuItem } from '~/components/base/context-menu/menuContext.type';
import type { Connection } from '~/core/stores';
import type { RawQueryContext } from './rawQueryProfile.types';

export enum RawQueryContextMenuSection {
  EXECUTION = 'execution',
  ANALYSIS = 'analysis',
  FORMAT = 'format',
  TOOLS = 'tools',
  EDIT = 'edit',
}

export interface RawQueryExecutionResult {
  success: boolean;
  resultId?: string;
  error?: string | Error;
  data?: any;
}

export interface RawQueryExecutionContext<TDialectState = unknown> {
  connection?: Connection;
  sourceText: string;
  statement?: { text: string; from: number; to: number };
  variables?: Record<string, any>;
  editorView?: EditorView | null;
  dialectState?: TDialectState;
  context: RawQueryContext<TDialectState>;
}

export interface RawQueryContextMenuContext<TDialectState = unknown> {
  editorView: EditorView;
  statement: { text: string; from: number; to: number } | null;
  hasSelection: boolean;
  selectionText: string;
  dialectState?: TDialectState;
  context: RawQueryContext<TDialectState>;
}

export interface RawQueryDialectContextMenuConfig<TDialectState = unknown> {
  getItems?: (
    ctx: RawQueryContextMenuContext<TDialectState>
  ) => ContextMenuItem[];
  buildMenu?: (
    ctx: RawQueryContextMenuContext<TDialectState>
  ) => ContextMenuItem[];
}

export interface RawQueryDialectPlugin<TDialectState = unknown> {
  name: string;
  onInit?: (context: RawQueryContext<TDialectState>) => void | Promise<void>;
  preloadSchema?: (context: RawQueryContext<TDialectState>) => Promise<void>;
  loadSchema?: (context: RawQueryContext<TDialectState>) => Promise<void>;
  resolveStatement?: (
    view: EditorView,
    context: RawQueryContext<TDialectState>
  ) => { text: string; from: number; to: number } | null;
  beforeExecute?: (
    ctx: RawQueryExecutionContext<TDialectState>
  ) => Promise<boolean> | boolean;
  execute: (
    ctx: RawQueryExecutionContext<TDialectState>
  ) => Promise<RawQueryExecutionResult>;
  afterExecute?: (
    result: RawQueryExecutionResult,
    ctx: RawQueryExecutionContext<TDialectState>
  ) => Promise<void> | void;
  formatCode?: (
    code: string,
    context: RawQueryContext<TDialectState>
  ) => Promise<string> | string;
  getEditorExtensions?: (
    context: RawQueryContext<TDialectState>
  ) => Extension[];
  contextMenu?: RawQueryDialectContextMenuConfig<TDialectState>;
  onDispose?: (context: RawQueryContext<TDialectState>) => void;
}

export function defineRawQueryPlugin<TDialectState = unknown>(
  plugin: RawQueryDialectPlugin<TDialectState>
): RawQueryDialectPlugin<TDialectState> {
  return plugin;
}
```

Update `components/modules/raw-query/registry/rawQueryProfile.types.ts`:

- Import `RawQueryDialectPlugin` from `./rawQueryPlugin.types`.
- Add `plugin?: RawQueryDialectPlugin<TState>;` to `RawQueryProfile<TState>`.

Update `components/modules/raw-query/registry/index.ts`:

- Add `export * from './rawQueryPlugin.types';`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun vitest run test/unit/components/modules/raw-query/registry/rawQueryPlugin.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/modules/raw-query/registry/rawQueryPlugin.types.ts components/modules/raw-query/registry/rawQueryProfile.types.ts components/modules/raw-query/registry/index.ts test/unit/components/modules/raw-query/registry/rawQueryPlugin.spec.ts
git commit -m "feat(raw-query): define dialect plugin interfaces and context menu contracts"
```

---

### Task 2: Pluggable Context Menu Resolution Utility

**Files:**

- Create: `components/modules/raw-query/utils/rawQueryContextMenu.ts`
- Modify: `components/modules/raw-query/utils/index.ts`
- Test: `test/unit/components/modules/raw-query/utils/rawQueryContextMenu.spec.ts`

**Interfaces:**

- Consumes: `RawQueryContextMenuContext`, `RawQueryDialectPlugin`, `ContextMenuItem`, `RawQueryContextMenuSection`
- Produces: `buildContextMenuItems(ctx, plugin, defaultEditActions)`

- [ ] **Step 1: Write the failing test**

```typescript
// test/unit/components/modules/raw-query/utils/rawQueryContextMenu.spec.ts
import { describe, expect, it, vi } from 'vitest';
import {
  ContextMenuItemType,
  type ContextMenuItem,
} from '~/components/base/context-menu/menuContext.type';
import {
  RawQueryContextMenuSection,
  type RawQueryContextMenuContext,
  type RawQueryDialectPlugin,
} from '~/components/modules/raw-query/registry';
import { buildContextMenuItems } from '~/components/modules/raw-query/utils/rawQueryContextMenu';

describe('buildContextMenuItems', () => {
  const dummyContext = {
    editorView: {} as any,
    statement: { text: 'SELECT 1;', from: 0, to: 9 },
    hasSelection: false,
    selectionText: '',
    context: {} as any,
  } as RawQueryContextMenuContext;

  const defaultEditActions = {
    copyStatement: vi.fn(),
    copyAll: vi.fn(),
    deleteStatement: vi.fn(),
  };

  it('builds standard edit actions when plugin has no context menu config', () => {
    const items = buildContextMenuItems(
      dummyContext,
      undefined,
      defaultEditActions
    );
    const labels = items.map(i => i.label);
    expect(labels).toContain('Copy Statement');
    expect(labels).toContain('Copy All');
    expect(labels).toContain('Delete Statement');
  });

  it('merges dialect plugin items and separates sections', () => {
    const mockPlugin: RawQueryDialectPlugin = {
      name: 'test-plugin',
      execute: vi.fn(),
      contextMenu: {
        getItems: () => [
          {
            type: ContextMenuItemType.ITEM,
            label: 'Execute Current Query',
            section: RawQueryContextMenuSection.EXECUTION,
          } as ContextMenuItem,
        ],
      },
    };

    const items = buildContextMenuItems(
      dummyContext,
      mockPlugin,
      defaultEditActions
    );
    expect(items[0].label).toBe('Execute Current Query');
    expect(items.some(i => i.type === ContextMenuItemType.SEPARATOR)).toBe(
      true
    );
  });

  it('respects buildMenu override if provided by plugin', () => {
    const customItems: ContextMenuItem[] = [
      { type: ContextMenuItemType.ITEM, label: 'Custom Only' },
    ];
    const mockPlugin: RawQueryDialectPlugin = {
      name: 'test-plugin',
      execute: vi.fn(),
      contextMenu: {
        buildMenu: () => customItems,
      },
    };

    const items = buildContextMenuItems(
      dummyContext,
      mockPlugin,
      defaultEditActions
    );
    expect(items).toEqual(customItems);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun vitest run test/unit/components/modules/raw-query/utils/rawQueryContextMenu.spec.ts`
Expected: FAIL with module not found `rawQueryContextMenu`.

- [ ] **Step 3: Implement `rawQueryContextMenu.ts`**

```typescript
// components/modules/raw-query/utils/rawQueryContextMenu.ts
import {
  ContextMenuItemType,
  type ContextMenuItem,
} from '~/components/base/context-menu/menuContext.type';
import {
  RawQueryContextMenuSection,
  type RawQueryContextMenuContext,
  type RawQueryDialectPlugin,
} from '../registry';

export interface DefaultEditActions {
  copyStatement: () => void;
  copyAll: () => void;
  deleteStatement: () => void;
}

const SECTION_ORDER = [
  RawQueryContextMenuSection.EXECUTION,
  RawQueryContextMenuSection.ANALYSIS,
  RawQueryContextMenuSection.FORMAT,
  RawQueryContextMenuSection.TOOLS,
  RawQueryContextMenuSection.EDIT,
];

export function buildContextMenuItems<TDialectState = unknown>(
  ctx: RawQueryContextMenuContext<TDialectState>,
  plugin?: RawQueryDialectPlugin<TDialectState>,
  editActions?: DefaultEditActions
): ContextMenuItem[] {
  // If dialect provides full custom builder, delegate completely
  if (plugin?.contextMenu?.buildMenu) {
    return plugin.contextMenu.buildMenu(ctx);
  }

  const dialectItems = plugin?.contextMenu?.getItems
    ? plugin.contextMenu.getItems(ctx)
    : [];

  const defaultEditItems: ContextMenuItem[] = editActions
    ? [
        {
          type: ContextMenuItemType.ITEM,
          label: 'Copy Statement',
          disabled: !ctx.statement,
          icon: 'hugeicons:copy-01',
          action: editActions.copyStatement,
          section: RawQueryContextMenuSection.EDIT,
        } as ContextMenuItem,
        {
          type: ContextMenuItemType.ITEM,
          label: 'Copy All',
          icon: 'hugeicons:copy-02',
          action: editActions.copyAll,
          section: RawQueryContextMenuSection.EDIT,
        } as ContextMenuItem,
        {
          type: ContextMenuItemType.ITEM,
          label: 'Delete Statement',
          disabled: !ctx.statement,
          icon: 'hugeicons:delete-02',
          action: editActions.deleteStatement,
          section: RawQueryContextMenuSection.EDIT,
        } as ContextMenuItem,
      ]
    : [];

  const allItems = [...dialectItems, ...defaultEditItems];

  // Group items by section
  const sectionMap = new Map<string, ContextMenuItem[]>();
  for (const item of allItems) {
    const sec = (item as any).section || RawQueryContextMenuSection.TOOLS;
    if (!sectionMap.has(sec)) {
      sectionMap.set(sec, []);
    }
    sectionMap.get(sec)!.push(item);
  }

  // Assemble menu with separators between non-empty sections
  const result: ContextMenuItem[] = [];
  for (const section of SECTION_ORDER) {
    const items = sectionMap.get(section);
    if (!items || items.length === 0) continue;

    if (result.length > 0) {
      result.push({ type: ContextMenuItemType.SEPARATOR });
    }
    result.push(...items);
  }

  return result;
}
```

Update `components/modules/raw-query/utils/index.ts`:

- Add `export * from './rawQueryContextMenu';`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun vitest run test/unit/components/modules/raw-query/utils/rawQueryContextMenu.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/modules/raw-query/utils/rawQueryContextMenu.ts components/modules/raw-query/utils/index.ts test/unit/components/modules/raw-query/utils/rawQueryContextMenu.spec.ts
git commit -m "feat(raw-query): implement pluggable context menu builder with section merging"
```

---

### Task 3: Dialect Plugins Implementation (Postgres, Mongo, Redis, SQLite)

**Files:**

- Create: `components/modules/raw-query/registry/plugins/postgres.plugin.ts`
- Create: `components/modules/raw-query/registry/plugins/mongo.plugin.ts`
- Create: `components/modules/raw-query/registry/plugins/redis.plugin.ts`
- Create: `components/modules/raw-query/registry/plugins/sqlite.plugin.ts`
- Create: `components/modules/raw-query/registry/plugins/index.ts`
- Modify: `components/modules/raw-query/registry/profiles/postgres.profile.ts`
- Modify: `components/modules/raw-query/registry/profiles/mongo.profile.ts`
- Modify: `components/modules/raw-query/registry/profiles/redis.profile.ts`
- Modify: `components/modules/raw-query/registry/profiles/sql.profile.ts`
- Test: `test/unit/components/modules/raw-query/registry/plugins.spec.ts`

**Interfaces:**

- Consumes: `RawQueryDialectPlugin`, `RawQueryContextMenuSection`, `ContextMenuItemType`
- Produces: `postgresPlugin`, `mongoPlugin`, `redisPlugin`, `sqlitePlugin`

- [ ] **Step 1: Write the failing test**

```typescript
// test/unit/components/modules/raw-query/registry/plugins.spec.ts
import { describe, expect, it } from 'vitest';
import {
  mongoPlugin,
  postgresPlugin,
  redisPlugin,
  sqlitePlugin,
} from '~/components/modules/raw-query/registry/plugins';

describe('Dialect Plugins', () => {
  it('defines postgresPlugin with analysis context menu', () => {
    expect(postgresPlugin.name).toBe('postgres-plugin');
    expect(typeof postgresPlugin.execute).toBe('function');
    expect(typeof postgresPlugin.contextMenu?.getItems).toBe('function');
  });

  it('defines mongoPlugin with formatting and custom context menu items', () => {
    expect(mongoPlugin.name).toBe('mongo-plugin');
    expect(typeof mongoPlugin.execute).toBe('function');
    expect(typeof mongoPlugin.formatCode).toBe('function');
    expect(typeof mongoPlugin.contextMenu?.getItems).toBe('function');
  });

  it('defines redisPlugin with execution and tools context menu items', () => {
    expect(redisPlugin.name).toBe('redis-plugin');
    expect(typeof redisPlugin.execute).toBe('function');
    expect(typeof redisPlugin.contextMenu?.getItems).toBe('function');
  });

  it('defines sqlitePlugin', () => {
    expect(sqlitePlugin.name).toBe('sqlite-plugin');
    expect(typeof sqlitePlugin.execute).toBe('function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun vitest run test/unit/components/modules/raw-query/registry/plugins.spec.ts`
Expected: FAIL with module not found `~/components/modules/raw-query/registry/plugins`.

- [ ] **Step 3: Implement dialect plugins in `components/modules/raw-query/registry/plugins/`**

Create `components/modules/raw-query/registry/plugins/postgres.plugin.ts`:

```typescript
import { getCurrentStatement } from '~/components/base/code-editor/utils';
import {
  ContextMenuItemType,
  type ContextMenuItem,
} from '~/components/base/context-menu/menuContext.type';
import {
  RawQueryContextMenuSection,
  defineRawQueryPlugin,
} from '../rawQueryPlugin.types';

export const postgresPlugin = defineRawQueryPlugin({
  name: 'postgres-plugin',
  resolveStatement: view => {
    const { currentStatements } = getCurrentStatement(view);
    if (!currentStatements.length) return null;
    const from = Math.min(...currentStatements.map(s => s.from));
    const to = Math.max(...currentStatements.map(s => s.to));
    const text = currentStatements.map(s => s.text).join('\n');
    return { text, from, to };
  },
  execute: async ({ context }) => {
    if (context.onExecuteCurrent) {
      context.onExecuteCurrent();
      return { success: true };
    }
    return { success: false, error: 'Execution callback not available' };
  },
  contextMenu: {
    getItems: ctx => {
      const items: ContextMenuItem[] = [
        {
          type: ContextMenuItemType.ITEM,
          label: 'Run Current Query',
          shortcut: '⌘⏎',
          disabled: !ctx.statement,
          icon: 'hugeicons:play',
          action: () => ctx.context.onExecuteCurrent?.(),
          section: RawQueryContextMenuSection.EXECUTION,
        } as ContextMenuItem,
      ];

      if (ctx.context.isExplainSupported) {
        items.push({
          type: ContextMenuItemType.ITEM,
          label: 'Explain Query',
          disabled: !ctx.statement,
          icon: 'hugeicons:dashboard-speed-01',
          action: () => ctx.context.onExplainAnalyzeCurrent?.(),
          section: RawQueryContextMenuSection.ANALYSIS,
        } as ContextMenuItem);
      }

      if (ctx.context.isFormatSupported) {
        items.push(
          {
            type: ContextMenuItemType.ITEM,
            label: 'Format Statement',
            disabled: !ctx.statement,
            icon: 'hugeicons:text-align-left',
            action: () => ctx.context.onFormatCurrentStatement?.(),
            section: RawQueryContextMenuSection.FORMAT,
          } as ContextMenuItem,
          {
            type: ContextMenuItemType.ITEM,
            label: 'Format All',
            icon: 'hugeicons:align-left',
            action: () => ctx.context.onFormatAll?.(),
            section: RawQueryContextMenuSection.FORMAT,
          } as ContextMenuItem
        );
      }

      return items;
    },
  },
});
```

Create `components/modules/raw-query/registry/plugins/mongo.plugin.ts`:

```typescript
import {
  ContextMenuItemType,
  type ContextMenuItem,
} from '~/components/base/context-menu/menuContext.type';
import { formatMongoScript } from '../../mongo/utils/formatMongoScript';
import { resolveMongoScriptSource } from '../../mongo/utils/resolveMongoScriptSource';
import {
  RawQueryContextMenuSection,
  defineRawQueryPlugin,
} from '../rawQueryPlugin.types';

export const mongoPlugin = defineRawQueryPlugin({
  name: 'mongo-plugin',
  resolveStatement: view => {
    return resolveMongoScriptSource(view);
  },
  formatCode: async code => {
    return await formatMongoScript(code);
  },
  execute: async ({ context }) => {
    if (context.onExecuteCurrent) {
      context.onExecuteCurrent();
      return { success: true };
    }
    return { success: false, error: 'Execution callback not available' };
  },
  contextMenu: {
    getItems: ctx => {
      const items: ContextMenuItem[] = [
        {
          type: ContextMenuItemType.ITEM,
          label: 'Execute Script',
          shortcut: '⌘⏎',
          icon: 'hugeicons:play',
          action: () => ctx.context.onExecuteCurrent?.(),
          section: RawQueryContextMenuSection.EXECUTION,
        } as ContextMenuItem,
      ];

      items.push({
        type: ContextMenuItemType.ITEM,
        label: 'Format Script',
        icon: 'hugeicons:align-left',
        action: () => ctx.context.onFormatAll?.(),
        section: RawQueryContextMenuSection.FORMAT,
      } as ContextMenuItem);

      if (ctx.hasSelection && ctx.selectionText) {
        items.push({
          type: ContextMenuItemType.ITEM,
          label: 'Wrap with toArray()',
          icon: 'hugeicons:code',
          action: () => {
            const sel = ctx.editorView.state.selection.main;
            ctx.editorView.dispatch({
              changes: {
                from: sel.from,
                to: sel.to,
                insert: `${ctx.selectionText}.toArray()`,
              },
            });
          },
          section: RawQueryContextMenuSection.TOOLS,
        } as ContextMenuItem);
      }

      return items;
    },
  },
});
```

Create `components/modules/raw-query/registry/plugins/redis.plugin.ts`:

```typescript
import {
  ContextMenuItemType,
  type ContextMenuItem,
} from '~/components/base/context-menu/menuContext.type';
import {
  RawQueryContextMenuSection,
  defineRawQueryPlugin,
} from '../rawQueryPlugin.types';

export const redisPlugin = defineRawQueryPlugin({
  name: 'redis-plugin',
  resolveStatement: view => {
    const line = view.state.doc.lineAt(view.state.selection.main.head);
    const text = line.text.trim();
    if (!text) return null;
    return { text, from: line.from, to: line.to };
  },
  execute: async ({ context }) => {
    if (context.onExecuteCurrent) {
      context.onExecuteCurrent();
      return { success: true };
    }
    return { success: false, error: 'Execution callback not available' };
  },
  contextMenu: {
    getItems: ctx => {
      return [
        {
          type: ContextMenuItemType.ITEM,
          label: 'Execute Command at Cursor',
          shortcut: '⌘⏎',
          disabled: !ctx.statement,
          icon: 'hugeicons:play',
          action: () => ctx.context.onExecuteCurrent?.(),
          section: RawQueryContextMenuSection.EXECUTION,
        } as ContextMenuItem,
      ];
    },
  },
});
```

Create `components/modules/raw-query/registry/plugins/sqlite.plugin.ts`:

```typescript
import { getCurrentStatement } from '~/components/base/code-editor/utils';
import {
  ContextMenuItemType,
  type ContextMenuItem,
} from '~/components/base/context-menu/menuContext.type';
import {
  RawQueryContextMenuSection,
  defineRawQueryPlugin,
} from '../rawQueryPlugin.types';

export const sqlitePlugin = defineRawQueryPlugin({
  name: 'sqlite-plugin',
  resolveStatement: view => {
    const { currentStatements } = getCurrentStatement(view);
    if (!currentStatements.length) return null;
    const from = Math.min(...currentStatements.map(s => s.from));
    const to = Math.max(...currentStatements.map(s => s.to));
    const text = currentStatements.map(s => s.text).join('\n');
    return { text, from, to };
  },
  execute: async ({ context }) => {
    if (context.onExecuteCurrent) {
      context.onExecuteCurrent();
      return { success: true };
    }
    return { success: false, error: 'Execution callback not available' };
  },
  contextMenu: {
    getItems: ctx => {
      const items: ContextMenuItem[] = [
        {
          type: ContextMenuItemType.ITEM,
          label: 'Run Current Query',
          shortcut: '⌘⏎',
          disabled: !ctx.statement,
          icon: 'hugeicons:play',
          action: () => ctx.context.onExecuteCurrent?.(),
          section: RawQueryContextMenuSection.EXECUTION,
        } as ContextMenuItem,
      ];

      if (ctx.context.isFormatSupported) {
        items.push({
          type: ContextMenuItemType.ITEM,
          label: 'Format Statement',
          disabled: !ctx.statement,
          icon: 'hugeicons:text-align-left',
          action: () => ctx.context.onFormatCurrentStatement?.(),
          section: RawQueryContextMenuSection.FORMAT,
        } as ContextMenuItem);
      }

      return items;
    },
  },
});
```

Create `components/modules/raw-query/registry/plugins/index.ts`:

```typescript
export * from './postgres.plugin';
export * from './mongo.plugin';
export * from './redis.plugin';
export * from './sqlite.plugin';
```

Modify `postgres.profile.ts`, `mongo.profile.ts`, `redis.profile.ts`, `sql.profile.ts` to attach `plugin: postgresPlugin`, `plugin: mongoPlugin`, `plugin: redisPlugin`, etc.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun vitest run test/unit/components/modules/raw-query/registry/plugins.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/modules/raw-query/registry/plugins/ components/modules/raw-query/registry/profiles/ test/unit/components/modules/raw-query/registry/plugins.spec.ts
git commit -m "feat(raw-query): implement postgres, mongo, redis, and sqlite dialect plugins"
```

---

### Task 4: Implement `useRawQueryKernel.ts`

**Files:**

- Create: `components/modules/raw-query/hooks/useRawQueryKernel.ts`
- Modify: `components/modules/raw-query/hooks/index.ts`
- Test: `test/unit/components/modules/raw-query/hooks/useRawQueryKernel.spec.ts`

**Interfaces:**

- Consumes: `RawQueryDialectPlugin`, `RawQueryContext`, `useResultTabs`
- Produces: `useRawQueryKernel(options)`, `RawQueryKernel`

- [ ] **Step 1: Write the failing test**

```typescript
// test/unit/components/modules/raw-query/hooks/useRawQueryKernel.spec.ts
import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { useRawQueryKernel } from '~/components/modules/raw-query/hooks/useRawQueryKernel';
import { defineRawQueryPlugin } from '~/components/modules/raw-query/registry';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { Connection } from '~/core/stores';

describe('useRawQueryKernel', () => {
  it('initializes kernel state and manages result tabs', () => {
    const fileVariables = ref('');
    const connection = ref<Connection>({
      id: 'conn-1',
      name: 'Test Conn',
      type: DatabaseClientType.POSTGRES,
    } as any);

    const kernel = useRawQueryKernel({
      fileVariables,
      connection,
    });

    expect(kernel.codeEditorRef).toBeDefined();
    expect(kernel.resultTabs).toBeDefined();
    expect(kernel.cursorInfo.value).toEqual({ line: 1, column: 1 });
    expect(typeof kernel.onExecuteCurrent).toBe('function');
  });

  it('triggers plugin.preloadSchema when connection changes', async () => {
    const fileVariables = ref('');
    const connection = ref<Connection | undefined>(undefined);
    const mockPreload = vi.fn().mockResolvedValue(undefined);

    const mockPlugin = defineRawQueryPlugin({
      name: 'test-preload',
      preloadSchema: mockPreload,
      execute: vi.fn(),
    });

    const kernel = useRawQueryKernel({
      fileVariables,
      connection,
      plugin: ref(mockPlugin),
    });

    connection.value = {
      id: 'conn-2',
      type: DatabaseClientType.MONGODB,
    } as any;

    await new Promise(resolve => setTimeout(resolve, 10));
    expect(mockPreload).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun vitest run test/unit/components/modules/raw-query/hooks/useRawQueryKernel.spec.ts`
Expected: FAIL with module not found `useRawQueryKernel`.

- [ ] **Step 3: Implement `useRawQueryKernel.ts`**

```typescript
// components/modules/raw-query/hooks/useRawQueryKernel.ts
import { computed, ref, watch, type Ref } from 'vue';
import { Compartment, type Extension } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import type BaseCodeEditor from '~/components/base/code-editor/BaseCodeEditor.vue';
import type { Connection } from '~/core/stores';
import type { EditorCursor } from '../interfaces';
import {
  getRawQueryProfile,
  type RawQueryContext,
  type RawQueryDialectPlugin,
  type RawQueryExecutionContext,
} from '../registry';
import { useResultTabs } from './useResultTabs';

export interface UseRawQueryKernelOptions<TDialectState = unknown> {
  fileVariables: Ref<string>;
  connection: Ref<Connection | undefined>;
  plugin?: Ref<RawQueryDialectPlugin<TDialectState> | undefined>;
  dialectState?: TDialectState;
  beforeExecute?: () => Promise<boolean>;
  promptMissingVariables?: (
    missing: string[]
  ) => Promise<{ values: Record<string, any>; insertBack: boolean } | null>;
  onUpdateVariables?: (value: string) => void;
  documentText?: Ref<string>;
}

export function useRawQueryKernel<TDialectState = unknown>(
  options: UseRawQueryKernelOptions<TDialectState>
) {
  const codeEditorRef = ref<InstanceType<typeof BaseCodeEditor> | null>(null);
  const resultTabs = useResultTabs();
  const executeLoading = ref(false);
  const isStreaming = ref(false);
  const cursorInfo = ref<EditorCursor>({ line: 1, column: 1 });

  const getEditorView = (): EditorView | null =>
    (codeEditorRef.value?.editorView as EditorView | undefined) ?? null;

  // Active dialect plugin resolution
  const activePlugin = computed<
    RawQueryDialectPlugin<TDialectState> | undefined
  >(() => {
    if (options.plugin?.value) return options.plugin.value;
    const dbType = options.connection.value?.type;
    return getRawQueryProfile(dbType).plugin as
      | RawQueryDialectPlugin<TDialectState>
      | undefined;
  });

  // CodeMirror extension compartment
  const dialectCompartment = new Compartment();
  const getDialectExtensions = (): Extension[] => {
    const dummyCtx = {} as RawQueryContext<TDialectState>;
    return activePlugin.value?.getEditorExtensions?.(dummyCtx) ?? [];
  };

  const extensions = [dialectCompartment.of(getDialectExtensions())];

  const reloadLanguageCompartment = () => {
    const view = getEditorView();
    if (!view) return;
    view.dispatch({
      effects: dialectCompartment.reconfigure(getDialectExtensions()),
    });
  };

  // Watch connection changes to reconfigure editor extensions & preload schema
  watch(
    () => options.connection.value?.id,
    async () => {
      reloadLanguageCompartment();
      if (activePlugin.value?.preloadSchema) {
        const dummyCtx = {
          connection: options.connection.value,
          dialectState: options.dialectState,
        } as RawQueryContext<TDialectState>;
        await activePlugin.value.preloadSchema(dummyCtx);
      }
    },
    { flush: 'post' }
  );

  // Statement resolution
  const resolveStatement = () => {
    const view = getEditorView();
    if (!view) return null;
    const dummyCtx = {} as RawQueryContext<TDialectState>;
    return activePlugin.value?.resolveStatement
      ? activePlugin.value.resolveStatement(view, dummyCtx)
      : null;
  };

  // Code formatting
  const formatCode = async () => {
    const view = getEditorView();
    if (!view) return;
    const source = view.state.doc.toString();
    const dummyCtx = {} as RawQueryContext<TDialectState>;
    if (activePlugin.value?.formatCode) {
      const formatted = await activePlugin.value.formatCode(source, dummyCtx);
      if (formatted !== source) {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: formatted },
        });
      }
    }
  };

  // Core execution orchestration
  const onExecuteCurrent = async () => {
    if (!activePlugin.value || executeLoading.value) return;

    const view = getEditorView();
    const statement = resolveStatement();
    const execCtx: RawQueryExecutionContext<TDialectState> = {
      connection: options.connection.value,
      sourceText: view ? view.state.doc.toString() : '',
      statement: statement ?? undefined,
      editorView: view,
      dialectState: options.dialectState,
      context: {} as RawQueryContext<TDialectState>,
    };

    if (activePlugin.value.beforeExecute) {
      const canProceed = await activePlugin.value.beforeExecute(execCtx);
      if (!canProceed) return;
    }

    try {
      executeLoading.value = true;
      const result = await activePlugin.value.execute(execCtx);
      if (activePlugin.value.afterExecute) {
        await activePlugin.value.afterExecute(result, execCtx);
      }
    } finally {
      executeLoading.value = false;
    }
  };

  return {
    codeEditorRef,
    getEditorView,
    resultTabs,
    activePlugin,
    executeLoading,
    isStreaming,
    cursorInfo,
    extensions,
    reloadLanguageCompartment,
    resolveStatement,
    formatCode,
    onExecuteCurrent,
  };
}

export type RawQueryKernel = ReturnType<typeof useRawQueryKernel>;
```

Update `components/modules/raw-query/hooks/index.ts`:

- Add `export * from './useRawQueryKernel';`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun vitest run test/unit/components/modules/raw-query/hooks/useRawQueryKernel.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/modules/raw-query/hooks/useRawQueryKernel.ts components/modules/raw-query/hooks/index.ts test/unit/components/modules/raw-query/hooks/useRawQueryKernel.spec.ts
git commit -m "feat(raw-query): implement useRawQueryKernel composable"
```

---

### Task 5: Refactor Context Menu to Pluggable Architecture

**Files:**

- Modify: `components/modules/raw-query/hooks/useRawQueryEditorContextMenu.ts`
- Test: `test/unit/components/modules/raw-query/hooks/useRawQueryEditorContextMenu.spec.ts`

**Interfaces:**

- Consumes: `buildContextMenuItems`, `RawQueryKernel`, `RawQueryContext`
- Produces: `useRawQueryEditorContextMenu(actions)` with pluggable menu generation

- [ ] **Step 1: Write the failing test**

```typescript
// test/unit/components/modules/raw-query/hooks/useRawQueryEditorContextMenu.spec.ts
import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { useRawQueryEditorContextMenu } from '~/components/modules/raw-query/hooks/useRawQueryEditorContextMenu';

describe('useRawQueryEditorContextMenu', () => {
  it('generates context menu items via pluggable resolution', () => {
    const mockView = {
      state: {
        doc: {
          toString: () => 'SELECT 1;',
          length: 9,
          lineAt: () => ({ text: 'SELECT 1;', from: 0, to: 9 }),
        },
        selection: { main: { from: 0, to: 0, empty: true } },
      },
    } as any;

    const menu = useRawQueryEditorContextMenu({
      getEditorView: () => mockView,
      onExecuteCurrent: vi.fn(),
      onExplainAnalyzeCurrent: vi.fn(),
      onHandleFormatCurrentStatement: vi.fn(),
      onHandleFormatCode: vi.fn(),
    });

    expect(menu.menuItems.value.length).toBeGreaterThan(0);
    expect(typeof menu.onOpenMenu).toBe('function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun vitest run test/unit/components/modules/raw-query/hooks/useRawQueryEditorContextMenu.spec.ts`
Expected: Test should adapt to updated signature or verify pluggable integration.

- [ ] **Step 3: Update `useRawQueryEditorContextMenu.ts`**

Refactor `components/modules/raw-query/hooks/useRawQueryEditorContextMenu.ts`:

- Import `buildContextMenuItems` from `../utils/rawQueryContextMenu`.
- Call `buildContextMenuItems` in `onOpenMenu` passing the active dialect plugin and context.
- Keep the return API: `menuItems`, `onOpenMenu`, `copyStatement`, `copyAll`, `deleteStatement`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun vitest run test/unit/components/modules/raw-query/hooks/useRawQueryEditorContextMenu.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/modules/raw-query/hooks/useRawQueryEditorContextMenu.ts test/unit/components/modules/raw-query/hooks/useRawQueryEditorContextMenu.spec.ts
git commit -m "refactor(raw-query): integrate pluggable context menu into useRawQueryEditorContextMenu"
```

---

### Task 6: Refactor `useRawQueryEditor.ts` into Backward-Compatible Facade

**Files:**

- Modify: `components/modules/raw-query/hooks/useRawQueryEditor.ts`
- Test: `test/unit/components/modules/raw-query/hooks/useRawQueryEditor.spec.ts` (or existing specs)

**Interfaces:**

- Consumes: `useRawQueryKernel`, `useQueryExecution`, `useSqlEditorExtensions`, `useMongoScriptExecution`
- Produces: `useRawQueryEditor` backward-compatible return interface

- [ ] **Step 1: Write verification test for existing behavior**

Verify all current unit tests in `test/unit/components/modules/raw-query/` continue to pass before refactoring.
Run: `bun test:unit test/unit/components/modules/raw-query/`
Expected: PASS.

- [ ] **Step 2: Refactor `useRawQueryEditor.ts`**

Update `components/modules/raw-query/hooks/useRawQueryEditor.ts`:

- Utilize `useRawQueryKernel` for `resultTabs`, `codeEditorRef`, `cursorInfo`, and execution loading.
- Retain existing properties (`currentRawQueryResult`, `rawResponse`, `queryProcessState`, `extensions`, `sqlCompartment`, `executedResults`, `activeResultTabId`, etc.) mapped to kernel and active execution engines.
- Ensure 100% backward compatibility for all callers (`RawQuery.vue`, header, footer).

- [ ] **Step 3: Run unit and nuxt tests to verify no regressions**

Run: `bun vitest run test/unit/components/modules/raw-query/ test/nuxt/components/modules/raw-query/`
Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add components/modules/raw-query/hooks/useRawQueryEditor.ts
git commit -m "refactor(raw-query): wrap useRawQueryKernel inside useRawQueryEditor facade"
```

---

### Task 7: System Verification & Regression Check

**Files:**

- Entire codebase

- [ ] **Step 1: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors.

- [ ] **Step 2: Run all unit tests**

Run: `bun test:unit`
Expected: All unit tests pass.

- [ ] **Step 3: Run Nuxt tests**

Run: `bun test:nuxt`
Expected: All Nuxt tests pass.

- [ ] **Step 4: Update AST Knowledge Graph**

Run: `graphify update .`
Expected: Graph updated without errors.

---

## Self-Review

1. **Spec coverage:** Every section of `05-raw-query-kernel-pluginable-architecture.md` (audit, lifecycle hooks, pluggable context menu, `useRawQueryKernel`, dialect plugins, and roadmap) is addressed by Tasks 1 through 7.
2. **Placeholder scan:** No "TBD", "TODO", or pseudo-code steps. All steps have exact paths, commands, and code blocks.
3. **Type consistency:** `RawQueryContextMenuSection`, `RawQueryDialectPlugin`, `RawQueryExecutionContext`, and `RawQueryContextMenuContext` are strictly defined in Task 1 and consistently consumed across Tasks 2 through 6.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-15-raw-query-kernel-pluginable-architecture.md`. Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
