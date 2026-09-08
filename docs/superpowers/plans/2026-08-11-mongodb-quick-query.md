# MongoDB Quick Query Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a MongoDB connection type and a collection-backed Quick Query data path.

**Architecture:** MongoDB uses the official Node driver in `server/infrastructure/nosql/mongodb`; it is never passed to Knex or SQL adapter factories. A Mongo-specific Quick Query API exposes collection documents and mutations, while the existing Quick Query grid can consume its normalized rows.

**Tech Stack:** Nuxt/Nitro, Vue 3, TypeScript, MongoDB Node driver, Vitest.

## Global Constraints

- Scope is MongoDB connection plus Quick Query only; raw query, ERD, SQL structure tabs, backup/import/export are deferred.
- Use `_id` as the only mutation identity; never use a grid offset.
- Validate filter objects and ObjectIds on the server.
- Preserve all SQL and Redis behavior.

---

### Task 1: Register MongoDB capability and connection transport

**Files:**

- Modify: `core/constants/database-client-type.ts`, `core/types/entities/connection.entity.ts`, `core/constants/connection-capabilities.ts`, `components/modules/connection/constants/index.ts`, `components/modules/connection/hooks/useConnectionForm.ts`
- Test: `test/unit/core/constants/connection-capabilities.spec.ts`, `test/nuxt/components/modules/connection/hooks/useConnectionForm.test.ts`

- [ ] Write failing tests for MongoDB family, default port, and URI form values.
- [ ] Implement enum, connection family/provider, form card, defaults, and validation.
- [ ] Run the focused unit and Nuxt tests.

### Task 2: Build MongoDB runtime and Quick Query API

**Files:**

- Create: `server/infrastructure/nosql/mongodb/mongodb.client.ts`, `server/infrastructure/nosql/mongodb/mongodb-quick-query.ts`, `server/api/mongodb/quick-query.post.ts`, `server/api/mongodb/quick-query-mutation.post.ts`
- Modify: `server/infrastructure/driver/db-connection/health-check.ts`, `core/types/database-schemas.types.ts`
- Test: `test/unit/server/infrastructure/nosql/mongodb/mongodb-quick-query.spec.ts`

- [ ] Write failing unit tests for ObjectId conversion, safe filters, paging, sort, and mutation selectors.
- [ ] Implement short-lived Mongo client access, `ping`, collection reads, field inference, and `_id` mutations.
- [ ] Run the focused runtime tests.

### Task 3: Switch Quick Query to Mongo document operations

**Files:**

- Create: `components/modules/quick-query/hooks/useMongoCollectionQuery.ts`
- Modify: `components/modules/quick-query/QuickQuery.vue`, `components/modules/quick-query/hooks/useQuickQueryMutation.ts`
- Test: `test/nuxt/components/modules/quick-query/hooks/useMongoCollectionQuery.test.ts`

- [ ] Write a failing composable test for the Mongo API request and paged response.
- [ ] Implement the Mongo query composable and select it for MongoDB connections.
- [ ] Adapt mutations to call the Mongo mutation endpoint and keep `_id` stable.
- [ ] Run focused Quick Query tests.

### Task 4: Verify and document

- [ ] Run `bun run typecheck` and `bun test:unit`.
- [ ] Run the narrow Mongo API suite when its fixture is available.
- [ ] Update Graphify with `graphify update .`.
- [ ] Commit implementation with `feat: add MongoDB Quick Query support`.
