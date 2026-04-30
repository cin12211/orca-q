# Code Review: Expanded Database Support Branch

## Scope

Reviewed the current working-tree updates around connection families, managed SQLite, Redis workspace/browser, NoSQL fixtures, capability gating, and the claimed MongoDB deliverables in `033-expand-db-support`.

This report prioritizes the criteria you called out explicitly:

- duplicate type/interface declarations
- unnecessary extra helper functions
- superficial reuse of existing SQL shell surfaces instead of correct family-specific behavior

## Findings

### 1. [High] MongoDB is marked complete in spec/tasks, but the runtime is still effectively Redis-only

The branch claims MongoDB support is done, but the codebase state does not support that claim.

Evidence:

- `specs/033-expand-db-support/tasks.md:25-27` marks Mongo-related setup as complete, and `specs/033-expand-db-support/tasks.md:67` plus `specs/033-expand-db-support/tasks.md:108-119` mark the Mongo runtime, tests, routes, workspace, and panels as done.
- `core/constants/database-client-type.ts:11-35` still defines NoSQL support as Redis only. `DatabaseClientType` has `REDIS` at line 16 and `NOSQL_DATABASE_CLIENT_TYPES` is still `[DatabaseClientType.REDIS]` at line 35.
- `core/types/entities/connection.entity.ts:15-18` contains `REDIS_DIRECT` and only the `sql` / `redis` families. There is no MongoDB provider kind or MongoDB family.
- `package.json:54-62` adds `@libsql/client` and `redis`, but there is no `mongodb` dependency even though `specs/033-expand-db-support/tasks.md:25` says it was added.
- `components/modules/connection/constants/index.ts:63-71` shows a Redis card followed immediately by SQL Server. There is still no MongoDB card in the picker.
- Workspace search returned no files for `server/api/mongodb/**`, `server/infrastructure/nosql/mongodb/**`, or `components/modules/mongodb-workspace/**`.
- `playwright.config.ts:29` still expects `mongodb-workspace.spec.ts`, but that test file does not exist.

Impact:

- MongoDB cannot be created, classified, validated, routed, or exercised end-to-end from the current branch state.
- The checked-off task list is materially misleading and would hide missing work during review or release readiness checks.

Recommendation:

- Either implement MongoDB end-to-end, or reopen/uncheck the MongoDB tasks and remove MongoDB from the completed-status docs/contracts until the runtime, UI, fixtures, and tests actually exist.

### 2. [High] Redis capability gating violates the approved contract and reuses `Schemas` as the Redis browser surface

The spec/contract says Redis should use the generic `Explorer` slot for the browser, keep `Agent` visible, and default to `Explorer`. The implementation does something else.

Evidence:

- `specs/033-expand-db-support/contracts/connection-family-capability-contract.md:36` says `Explorer` must remain visible for Redis.
- `specs/033-expand-db-support/contracts/connection-family-capability-contract.md:41` says `Agent` must remain visible for Redis.
- `specs/033-expand-db-support/contracts/connection-family-capability-contract.md:54` says the Redis default activity item is `Explorer`.
- `specs/033-expand-db-support/contracts/connection-family-capability-contract.md:65` says `Explorer` should dispatch the Redis browser.
- `core/constants/connection-capabilities.ts:107` currently exposes `['Explorer', 'Schemas', 'DatabaseTools']` for Redis.
- `core/constants/connection-capabilities.ts:109` sets the Redis default activity to `Schemas`.
- `core/constants/connection-capabilities.ts:120` explicitly hides `Agent` for Redis.
- `components/modules/app-shell/primary-side-bar/components/PrimarySideBar.vue:85-86` dispatches `ManagementRedisBrowser` from `ActivityBarItemType.Schemas`.
- `test/nuxt/components/modules/app-shell/activity-bar/useActivityMenu.test.ts:86-87` locks this drift in by asserting Redis only shows `Schemas` and `DatabaseTools`.

Impact:

- User-visible behavior no longer matches the documented connection-family contract.
- The Redis browser is being attached to a SQL-shaped shell slot that the plan explicitly said should be hidden for Redis.
- Persisted-state recovery becomes harder to reason about because the shared `Explorer` contract is no longer truthful for Redis.

Recommendation:

- Move the Redis browser back under `Explorer`, keep Redis tools under `DatabaseTools`, and either preserve the shared `Agent` surface or update the contracts/tasks/docs/tests together if the product decision changed.

### 3. [Medium] `RedisTreeItem` duplicates an existing core interface instead of reusing it

There is a new local type that restates an existing Redis list-item contract.

Evidence:

- `components/modules/management/redis-browser/hooks/useRedisTreeData.ts:4` defines `RedisTreeItem`.
- `core/types/redis-workspace.types.ts:9` already defines `RedisKeyListItem` with the same `key`, `type`, `ttl`, `memoryUsage`, and `memoryUsageHuman` shape.

Impact:

- Future field additions or renames can drift between the browser hook and the shared Redis API contract.
- This is exactly the duplicate-type pattern you asked to avoid.

Recommendation:

- Replace `RedisTreeItem` with the shared `RedisKeyListItem`, or extend the shared type only if the tree hook truly needs extra fields.

### 4. [Medium] The Redis browser slice adds duplicate/no-op helpers instead of reusing the existing formatter surface

This slice introduced extra helper functions that are either duplicated or unnecessary.

Evidence:

- `core/helpers/bytes-formatter.ts:25` already exports a shared `formatBytes` helper.
- `components/modules/management/redis-browser/hooks/useRedisTreeData.ts:25` adds another `formatBytes` implementation.
- `components/modules/management/redis-browser/components/RedisKeyTree.vue:40` adds a second local `formatBytes` implementation.
- `components/modules/management/redis-browser/hooks/useRedisTreeData.ts:43` and `components/modules/management/redis-browser/components/RedisKeyTree.vue:58` also duplicate TTL formatting logic inside the same slice.
- `components/modules/management/redis-browser/components/RedisKeyTree.vue:141` adds `formatListItemTitle`, but the function just returns the input key unchanged and is only used as a pass-through title wrapper at line 288.

Impact:

- Formatting behavior can drift across Redis browser/tree/list surfaces.
- The component tree carries more code than needed for the current behavior.
- This misses the bar of “no extra helper function unless it buys something real.”

Recommendation:

- Reuse the shared byte formatter, hoist one Redis-specific TTL formatter if needed, and delete `formatListItemTitle` entirely.

## Open Questions

1. Was MongoDB intentionally descoped from this branch? If yes, the checked-off tasks/docs/spec status needs to be corrected before merge.
2. Is hiding `Agent` for Redis a real product decision, or just an implementation shortcut taken while reusing the `Schemas` slot?

## Merge Readiness

This branch is not ready to merge in its current state.

The MongoDB gap is a blocking completeness issue, and the Redis shell behavior is currently off-contract. The duplicate type and duplicate helper findings are smaller, but they reinforce the same pattern: the branch is drifting from its own design constraints instead of consolidating around the shared contracts and types.
