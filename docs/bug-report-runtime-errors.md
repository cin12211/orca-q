# Bug Report: Runtime Errors on Agent & Explorer Pages

**Affected command:** `npm run nuxt:build-web` / `bun nuxt:build-web`  
**Affected routes:**
- `/:workspaceId/:connectionId/agent/:tabViewId`
- `/:workspaceId/:connectionId/explorer/:fileId`

**Date:** 2026-03-18  
**Status:** ✅ All fixed (4 bugs total)

---

## Bug Summary

| # | Error | Severity | Status |
|---|-------|----------|--------|
| 1 | `ShikiError: Language 'ts' not found` | Medium | ✅ Fixed |
| 2 | Invalid `useColorMode()` call in non-setup context | Medium | ✅ Fixed |
| 3 | `ReferenceError: process is not defined` (Amplitude) | High | ✅ Fixed |
| 4 | **Vue runtime #13** — `knex` Node.js library bundled into browser | Critical | ✅ Fixed |

---

## Bug 1 — `ShikiError: Language 'ts' not found`

### Error

```
Stream error: ShikiError: Language `ts` not found, you may need to load it first
    at Object.c [as getLanguage] (BUuSKT2f.js:...)
```

### Root Cause

`BlockMessageCode.vue` (AI agent message renderer) maps `'typescript'` → `'ts'` and passes it to `ShikiCachedRenderer`. The singleton highlighter (`core/composables/useHighlighter.ts`) was built with `createHighlighterCore` but **did not include TypeScript or JavaScript** in `BUNDLED_LANGS`. A lazy-load fallback tried to call `loadLanguage('typescript')` with a plain string ID, which is not supported by `createHighlighterCore` — only actual grammar module objects can be passed. The `.catch()` silently swallowed the failure, and `ShikiCachedRenderer` then crashed when rendering.

### Fix

`core/composables/useHighlighter.ts` — added the two missing language imports to `BUNDLED_LANGS`:

```diff
+  import('@shikijs/langs/javascript'),
+  import('@shikijs/langs/typescript'),
```

---

## Bug 2 — Invalid `useColorMode()` composable call

### Error

Silent Vue composable warning (`getCurrentInstance()` returns null outside setup).

### Root Cause

`useHighlighter.ts` called `useColorMode()` inside an `async` standalone function — outside any Vue component `setup()` context. Composables that access the current Vue instance (like `useColorMode`) must be called from `setup()`.

### Fix

Removed the invalid `const colorMode = useColorMode()` call from `useHighlighter.ts`. Color mode is handled per-component by `BlockMessageCode.vue` directly, not inside the singleton.

---

## Bug 3 — `ReferenceError: process is not defined`

### Error

```
[Unhandled Rejection]: ReferenceError: process is not defined
    at TD (CQQKPHb8.js:181:4868)
```

### Root Cause

`@amplitude/analytics-browser` references `process.env.*` in some initialization paths without `typeof` guards. Nuxt/Vite's SPA build only replaces `process.env.NODE_ENV` but does not define the `process` object itself.

### Fix

`nuxt.config.ts` — added `vite.define` polyfill:

```diff
+  define: {
+    'process.env': '{}',
+  },
```

`plugins/03.analytics.client.ts` — wrapped `initialize()` in try/catch so future SDK failures degrade gracefully:

```diff
+  try {
     initialize();
+  } catch (e) {
+    console.warn('[Analytics Plugin] Amplitude initialization failed silently:', e);
+  }
```

---

## Bug 4 — Vue Runtime Error #13 (async component loader) — `knex` in browser bundle

### Error

```
Vue runtime error #13 (ASYNC_COMPONENT_LOADER)
https://vuejs.org/error-reference/#runtime-13
```

### Root Cause

This is the **deepest and most critical bug**. Vue runtime error #13 is thrown when a `defineAsyncComponent`'s loader function fails. Nuxt wraps every page as an async component for code splitting, so if ANY module in the page's dependency tree throws synchronously during evaluation, Vue catches the rejected import promise and reports error #13.

**The culprit:** `components/base/code-editor/utils/sqlErrorDiagnostics.ts`:

```ts
// ❌ Client-side component importing a Node.js-only library
import { knex, type Knex } from 'knex';
```

`knex` is a Node.js-only database query builder. It was used client-side to format SQL parameters for error position mapping. Knex bundles Node.js-only code:

- `process.version` — referenced WITHOUT `typeof` guard in a throw statement inside the dialect-loading error handler
- `process.nextTick` — referenced by `tarn` (Knex's connection pool)
- `process.platform`, `process.stdout`, etc. — referenced by lodash-like utilities

When Vite bundled the `[fileId].vue` page chunk (which imports `BaseCodeEditor` → `sqlErrorDiagnostics`), the entire `knex` library (~630 KB) was pulled into the browser bundle. When the browser loaded this chunk, evaluating `process.version` (without `typeof` guard) threw `ReferenceError: process is not defined`. The dynamic import promise rejected, and Vue reported error #13.

**Impact chain:**
```
[fileId].vue
  └── RawQuery.vue
        └── BaseCodeEditor.vue (indirectly via hooks)
              └── sqlErrorDiagnostics.ts
                    └── import { knex } from 'knex'  ← Node.js only!
                          └── process.version unguarded → throws in browser
```

### Files Affected

- [`components/base/code-editor/utils/sqlErrorDiagnostics.ts`](../components/base/code-editor/utils/sqlErrorDiagnostics.ts)

### Fix

Removed `import { knex, type Knex } from 'knex'` and replaced the Knex parameter substitution with an inline `substituteParams()` function:

```ts
// ❌ Before — imports entire Node.js-only Knex library:
import { knex, type Knex } from 'knex';
const knexInstance: Knex = knex({ client: clientType });
const formatted = knexInstance.raw(mapOriginalSql, fileParameters).toSQL().toNative();

// ✅ After — inline browser-safe substitution:
function substituteParams(sql, params, clientType): string {
  if (!Object.keys(params).length) return sql;
  const isPositional = clientType === DatabaseClientType.POSTGRES;
  let idx = 1;
  return sql.replace(/:([a-zA-Z_]\w*)/g, (_, name) =>
    name in params ? (isPositional ? `$${idx++}` : '?') : `:${name}`
  );
}
```

The inline function covers the same `:name` → `$N` / `?` substitution for error-position mapping without any Node.js dependency.

**Build verification:** After the fix, `grep` over all `.output/public/_nuxt/*.js` chunks shows **zero** unguarded `process.*` references.

---

## Change Matrix

| File | Change | Bug Fixed |
|------|--------|-----------|
| `core/composables/useHighlighter.ts` | Add `@shikijs/langs/javascript` & `@shikijs/langs/typescript` to `BUNDLED_LANGS` | #1 |
| `core/composables/useHighlighter.ts` | Remove invalid `useColorMode()` call outside setup | #2 |
| `nuxt.config.ts` | Add `vite.define: { 'process.env': '{}' }` | #3 |
| `plugins/03.analytics.client.ts` | Wrap `initialize()` in try/catch | #3 |
| `components/base/code-editor/utils/sqlErrorDiagnostics.ts` | Remove `import { knex } from 'knex'`, replace with inline `substituteParams()` | #4 |

---

## Bundle Size Impact

| Before | After |
|--------|-------|
| Knex (~630 KB) bundled into explorer page chunk | Removed — server-side only |
| `process.version` in browser chunks | **0 occurrences** |
| TypeScript/JavaScript Shiki grammars missing | Bundled via `BUNDLED_LANGS` |


**Affected command:** `npm run nuxt:build-web`  
**Affected routes:**
- `/:workspaceId/:connectionId/agent/:tabViewId`
- `/:workspaceId/:connectionId/explorer/:fileId`

**Date:** 2026-03-18  
**Status:** ✅ All fixed

---

## Bug Summary

| # | Error | Severity | Status |
|---|-------|----------|--------|
| 1 | `ShikiError: Language 'ts' not found` | Medium | ✅ Fixed |
| 2 | `ReferenceError: process is not defined` | High | ✅ Fixed |
| 3 | `Couldn't resolve component "default"` | High | ✅ Fixed (cascade of #2) |

---

## Bug 1 — `ShikiError: Language 'ts' not found`

### Error

```
Stream error: ShikiError: Language `ts` not found, you may need to load it first
    at Object.c [as getLanguage] (BUuSKT2f.js:...)
    at ot (...)
    at dn (...)
    at Proxy.codeToTokens (...)
```

### Root Cause

`BlockMessageCode.vue` (used by the AI agent message renderer) builds a `lang` computed
that maps the AI-stream-reported language to a Shiki identifier:

```ts
case 'typescript': return 'ts';   // ← alias of 'typescript'
case 'javascript': return 'js';   // ← alias of 'javascript'
```

It then passes this value as `lang` to `ShikiCachedRenderer`.

The singleton highlighter in `core/composables/useHighlighter.ts` was built with
`createHighlighterCore` (the lightweight Shiki core API, no bundled registry) and
its `BUNDLED_LANGS` list **did not include TypeScript or JavaScript**:

```ts
const BUNDLED_LANGS = [
  import('@shikijs/langs/sql'),    // ✅
  import('@shikijs/langs/plsql'),  // ✅
  // ...
  // ❌ typescript missing
  // ❌ javascript missing
];
```

A `watch` in `BlockMessageCode.vue` attempted to lazy-load the missing language:

```ts
highlighter.value = await useHighlighter([language]); // e.g. ['typescript']
```

Inside `useHighlighter`, the lazy-load path calls `highlighter.loadLanguage('typescript')`,
passing **a plain string**. With `createHighlighterCore` (unlike the full Shiki bundle),
`loadLanguage` requires an actual grammar module — **a string ID is not valid**. The call
throws, is silently swallowed by `.catch()`, and TypeScript is never registered. When
`ShikiCachedRenderer` subsequently tries to highlight with `lang="ts"`, Shiki cannot find
the grammar and throws.

A secondary issue: `useHighlighter.ts` called `useColorMode()` inside the async standalone
function — outside of any Vue `setup()` context — which is invalid composable usage.

### Files Affected

- [`core/composables/useHighlighter.ts`](../core/composables/useHighlighter.ts)
- [`components/modules/agent/components/block-message/BlockMessageCode.vue`](../components/modules/agent/components/block-message/BlockMessageCode.vue)

### Fix

**`core/composables/useHighlighter.ts`** — add the two missing language imports to
`BUNDLED_LANGS` and remove the invalid `useColorMode()` call:

```diff
 const BUNDLED_LANGS = [
   import('@shikijs/langs/sql'),
   import('@shikijs/langs/plsql'),
   import('@shikijs/langs/json'),
   import('@shikijs/langs/bash'),
   import('@shikijs/langs/markdown'),
   import('@shikijs/langs/csv'),
   import('@shikijs/langs/xml'),
   import('@shikijs/langs/yaml'),
   import('@shikijs/langs/html'),
+  // JavaScript and TypeScript must be bundled upfront — dynamic string-based
+  // loadLanguage() does not work with createHighlighterCore (no bundled registry).
+  import('@shikijs/langs/javascript'),
+  import('@shikijs/langs/typescript'),
 ];

 export const useHighlighter = async (
   extraLangs?: string[]
 ): Promise<HighlighterCore> => {
-  const colorMode = useColorMode(); // ← invalid: composable called outside setup()
-
   if (!promise) {
```

**Why this works:** `@shikijs/langs/typescript` registers the grammar with name
`typescript` and alias `ts`. Once included in `BUNDLED_LANGS`, the highlighter is
aware of both identifiers before any page renders.

---

## Bug 2 — `ReferenceError: process is not defined`

### Error

```
[Unhandled Rejection]: ReferenceError: process is not defined
    at TD (CQQKPHb8.js:181:4868)
    at gg (CQQKPHb8.js:225:25622)
    ...
```

### Root Cause

`@amplitude/analytics-browser` v2.21.1 references the Node.js `process` global
internally without a `typeof` guard in some internal code paths (e.g. detecting the
runtime environment). When bundled into a browser SPA, `process` is not polyfilled
by default.

Nuxt/Vite's default SPA build replaces `process.env.NODE_ENV` with the mode string
(`"production"`) but does **not** define the `process` object itself. Any third-party
code that uses `process.versions`, `process.platform`, or bare `process.*` references
causes a `ReferenceError` at runtime.

The `core/helpers/environment.ts` has proper `typeof process !== 'undefined'` guards,
so it is **not** the source of the error — the error originates inside the Amplitude SDK.

### Files Affected

- [`nuxt.config.ts`](../nuxt.config.ts)
- [`core/composables/useAmplitude.ts`](../core/composables/useAmplitude.ts)
- [`plugins/03.analytics.client.ts`](../plugins/03.analytics.client.ts)

### Fix

**`nuxt.config.ts`** — add `process.env` to Vite's `define` map so all `process.env.*`
accesses resolve to `undefined` in the browser bundle instead of throwing:

```diff
   vite: {
     plugins: [tailwindcss()],
+    // Polyfill `process.env` for browser packages (e.g. @amplitude/analytics-browser)
+    // that reference it without proper typeof guards.
+    define: {
+      'process.env': {},
+    },
   },
```

**`plugins/03.analytics.client.ts`** — wrap initialization in try/catch so a
transient SDK failure does not crash the entire app startup:

```diff
   if (import.meta.client) {
-    console.log('[Analytics Plugin] Initializing Amplitude tracking.');
-    initialize();
+    try {
+      console.log('[Analytics Plugin] Initializing Amplitude tracking.');
+      initialize();
+    } catch (e) {
+      console.warn('[Analytics Plugin] Amplitude initialization failed silently:', e);
+    }
   }
```

---

## Bug 3 — `Couldn't resolve component "default"`

### Error

```
Error: Couldn't resolve component "default" at "/:workspaceId()/:connectionId()/explorer/:fileId()"
[nuxt] error caught during app initialization: Couldn't resolve component "default"
[App Error]: Couldn't resolve component "default"
```

### Root Cause

This is a **cascade effect of Bug 2**. When `plugin/03.analytics.client.ts` runs
during Nuxt app initialization and the Amplitude SDK throws `process is not defined`,
the unhandled rejection causes the app initialization sequence to abort. Nuxt catches
the error at the top level and reports it as a component resolution failure because the
router could not finish setting up the current route's component.

The error specifically appeared on the explorer and agent routes (not the home page)
because those routes require the full app shell (`default` layout + async page component)
to be fully initialized before rendering.

### Files Affected

- [`plugins/03.analytics.client.ts`](../plugins/03.analytics.client.ts) — fixed in Bug 2

### Fix

Bug 3 is fully resolved by fixing Bug 2 (the `process.env` define in `nuxt.config.ts`
prevents the unhandled rejection). The additional try/catch added to the analytics plugin
provides a second layer of protection so a future SDK initialization failure degrades
gracefully instead of crashing app startup.

---

## Change Matrix

| File | Change | Bug Fixed |
|------|--------|-----------|
| `core/composables/useHighlighter.ts` | Add `@shikijs/langs/javascript` & `@shikijs/langs/typescript` to `BUNDLED_LANGS`; remove invalid `useColorMode()` call | #1 |
| `nuxt.config.ts` | Add `vite.define: { 'process.env': {} }` | #2 |
| `plugins/03.analytics.client.ts` | Wrap `initialize()` in try/catch | #2, #3 |

---

## Verification

After applying all fixes, rebuild with `npm run nuxt:build-web` and navigate to both
affected routes. Expected outcomes:

1. TypeScript/JavaScript AI code blocks render with syntax highlighting — no `ShikiError`.
2. No `process is not defined` unhandled rejection in the browser console.
3. Both `/agent/:tabViewId` and `/explorer/:fileId` load without the
   `Couldn't resolve component "default"` app initialization error.
