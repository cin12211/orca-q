# Quickstart: Query Workbench Reliability

## Prerequisites

- Install dependencies for the repository.
- Use a workspace with at least one connection that can exercise raw query, quick query, schema browsing, and metadata views.
- Prefer a large multi-schema fixture for schema-load verification and one connection per supported database family for type-alias verification.

## Start the app

```bash
bun electron:dev
```

## Automated verification targets

Run focused tests instead of a single mixed-project Vitest command.

```bash
bun vitest run --project nuxt test/nuxt/components/modules/raw-query/useQueryExecution.test.ts
bun vitest run --project nuxt test/nuxt/components/modules/management/schemas/hooks/context-menu/useSchemaContextMenu.test.ts
bun vitest run --project nuxt test/nuxt/components/modules/quick-query
bun vitest run --project unit test/unit/server/infrastructure/agent/schema/schema.spec.ts
```

## Manual validation flow

### 1. Raw query comment-safe parameters

1. Open a raw SQL file.
2. Add a valid executable placeholder and a commented placeholder example such as `-- :demo_value`.
3. Execute the query with only the real executable parameter values.
4. Confirm the query runs without a parser failure caused by the comment-only placeholder.

### 2. Quick-query function or procedure preview

1. Open a function or procedure in quick query.
2. Change the body or definition.
3. Open the preview before save.
4. Confirm the preview shows the exact submitted SQL.
5. Save and verify that the same change succeeds when it is valid.

### 3. Type alias consistency across databases

1. Inspect metadata for equivalent column types in supported database families.
2. Compare `short_type_name` values for common samples such as varchar, int, bool, decimal, and timestamp families.
3. Confirm the displayed aliases remain consistent across metadata and query-driven views.

### 4. Long schema-loading feedback

1. Open schema browsing on a large multi-schema connection.
2. Confirm a loading state appears immediately.
3. Wait beyond the normal fast path and verify the UI continues to show an active waiting/progress message.
4. Confirm the state resolves to completion or explicit failure.

### 5. Workspace tab shortcuts

1. From the first tab area, click the `SQL` shortcut.
2. Confirm `sample.sql` opens and is reused on the next click instead of being duplicated.
3. Open the plus-tab menu.
4. Create multiple new raw SQL files and confirm collision-free `new-file(-n)` naming.
5. Open schema browser and instance insight from the same menu.

### 6. Null-order preference

1. Set the global null-order preference in settings.
2. Open a quick-query/table view and confirm the same preference is visible in the quick-query bar.
3. Change the active view preference if supported.
4. Confirm the persisted global default remains available for future views.
