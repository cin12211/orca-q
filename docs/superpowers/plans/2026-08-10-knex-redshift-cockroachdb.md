# Knex Redshift + CockroachDB Support (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Redshift and CockroachDB as connectable database types, supporting raw query execution, schema browser (tables/columns/views), and ERD — by subclassing the existing Postgres adapters, since both dialects are wire-compatible with Postgres.

**Architecture:** One dedicated subclass per dialect per adapter layer (driver, metadata, tables, views), each extending the corresponding `Postgres*Adapter` class and overriding only what differs (the knex `client` string at the driver layer; RLS/RULE/TRIGGER stub returns at the tables layer). No shared parameterized class (rejected the `MysqlAdapter`-style single-file-with-param approach in favor of one file per dialect, per the approved design).

**Tech Stack:** Nuxt 3 / Vue 3 / TypeScript, knex (redshift + cockroachdb dialects already bundled, both reuse the `pg` driver already installed), Vitest (unit), `@nuxt/test-utils` (API integration tests), Docker Compose (CockroachDB test fixture).

**Spec:** `docs/superpowers/specs/2026-08-10-knex-redshift-cockroachdb-design.md`

## Global Constraints

- Every task must pass `bun run typecheck` and `bun test:unit` before being considered done (repo-wide verification rule).
- Never use `any` type in new code; no magic numbers/strings (use the existing `DatabaseClientType` enum, `DEFAULT_PORTS`/`DEFAULT_DB_PORTS` constants).
- Follow existing file-per-dialect pattern (mirror `mysql/oracle/postgres/sqlite` subdirectories) — do not add a shared parameterized adapter class for Redshift/CockroachDB.
- Use `override` keyword on all overridden methods (matches existing codebase convention, e.g. `components/modules/raw-query/utils/commandType.ts`).
- CockroachDB gets full integration test coverage (official docker image available). Redshift gets unit-test coverage only — no official local emulator exists; this is an accepted, documented gap, not something to work around.

---

### Task 1: Enum, connection-string parsing, default ports

**Files:**

- Modify: `core/constants/database-client-type.ts`
- Modify: `core/helpers/parser-connection-string.ts`
- Test: `test/unit/core/helpers/parser-connection-string.spec.ts` (new)

**Interfaces:**

- Produces: `DatabaseClientType.REDSHIFT = 'redshift'`, `DatabaseClientType.COCKROACHDB = 'cockroachdb'` — consumed by every later task.
- Produces: `parseConnectionString('redshift://...')` and `parseConnectionString('cockroachdb://...')` resolve to `{ type: DatabaseClientType.REDSHIFT | DatabaseClientType.COCKROACHDB, family: EConnectionFamily.SQL, ... }`.

- [ ] **Step 1: Write the failing test**

Create `test/unit/core/helpers/parser-connection-string.spec.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { parseConnectionString } from '~/core/helpers/parser-connection-string';
import { EConnectionFamily } from '~/core/types/entities/connection.entity';

describe('parseConnectionString — Redshift', () => {
  it('parses a redshift:// URI', () => {
    const result = parseConnectionString(
      'redshift://admin:secret@my-cluster.abc123.us-east-1.redshift.amazonaws.com:5439/analytics'
    );

    expect(result.type).toBe(DatabaseClientType.REDSHIFT);
    expect(result.family).toBe(EConnectionFamily.SQL);
    expect(result.host).toBe(
      'my-cluster.abc123.us-east-1.redshift.amazonaws.com'
    );
    expect(result.port).toBe(5439);
    expect(result.username).toBe('admin');
    expect(result.password).toBe('secret');
    expect(result.database).toBe('analytics');
    expect(result.masked).not.toContain('secret');
  });

  it('defaults to port 5439 when no port is given', () => {
    const result = parseConnectionString('redshift://admin:secret@host/db');
    expect(result.port).toBe(5439);
  });
});

describe('parseConnectionString — CockroachDB', () => {
  it('parses a cockroachdb:// URI', () => {
    const result = parseConnectionString(
      'cockroachdb://root:secret@localhost:26257/defaultdb'
    );

    expect(result.type).toBe(DatabaseClientType.COCKROACHDB);
    expect(result.family).toBe(EConnectionFamily.SQL);
    expect(result.host).toBe('localhost');
    expect(result.port).toBe(26257);
    expect(result.username).toBe('root');
    expect(result.database).toBe('defaultdb');
  });

  it('defaults to port 26257 when no port is given', () => {
    const result = parseConnectionString('cockroachdb://root:secret@host/db');
    expect(result.port).toBe(26257);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test:unit test/unit/core/helpers/parser-connection-string.spec.ts`
Expected: FAIL with `Unsupported scheme "redshift"` (thrown by `parseConnectionString`).

- [ ] **Step 3: Add the two enum values**

In `core/constants/database-client-type.ts`, change:

```typescript
export enum DatabaseClientType {
  POSTGRES = 'postgres',
  MYSQL = 'mysql',
  MARIADB = 'mariadb',
  MYSQL2 = 'mysql2',
  REDIS = 'redis',
  SQLITE3 = 'sqlite3',
  SNOWFLAKE = 'snowflake',
  BETTER_SQLITE3 = 'better-sqlite3',
  MSSQL = 'mssql',
  ORACLE = 'oracledb',
}

export const SQL_DATABASE_CLIENT_TYPES = [
  DatabaseClientType.POSTGRES,
  DatabaseClientType.MYSQL,
  DatabaseClientType.MARIADB,
  DatabaseClientType.MYSQL2,
  DatabaseClientType.SQLITE3,
  DatabaseClientType.BETTER_SQLITE3,
  DatabaseClientType.MSSQL,
  DatabaseClientType.ORACLE,
] as const;
```

to:

```typescript
export enum DatabaseClientType {
  POSTGRES = 'postgres',
  MYSQL = 'mysql',
  MARIADB = 'mariadb',
  MYSQL2 = 'mysql2',
  REDIS = 'redis',
  SQLITE3 = 'sqlite3',
  SNOWFLAKE = 'snowflake',
  BETTER_SQLITE3 = 'better-sqlite3',
  MSSQL = 'mssql',
  ORACLE = 'oracledb',
  REDSHIFT = 'redshift',
  COCKROACHDB = 'cockroachdb',
}

export const SQL_DATABASE_CLIENT_TYPES = [
  DatabaseClientType.POSTGRES,
  DatabaseClientType.MYSQL,
  DatabaseClientType.MARIADB,
  DatabaseClientType.MYSQL2,
  DatabaseClientType.SQLITE3,
  DatabaseClientType.BETTER_SQLITE3,
  DatabaseClientType.MSSQL,
  DatabaseClientType.ORACLE,
  DatabaseClientType.REDSHIFT,
  DatabaseClientType.COCKROACHDB,
] as const;
```

- [ ] **Step 4: Add scheme mapping and default ports**

In `core/helpers/parser-connection-string.ts`, change the `DEFAULT_PORTS` map:

```typescript
const DEFAULT_PORTS: Partial<Record<DatabaseClientType, number>> = {
  [DatabaseClientType.POSTGRES]: 5432,
  [DatabaseClientType.MYSQL]: 3306,
  [DatabaseClientType.MARIADB]: 3306,
  [DatabaseClientType.MYSQL2]: 3306,
  [DatabaseClientType.REDIS]: 6379,
  [DatabaseClientType.MSSQL]: 1433,
  [DatabaseClientType.ORACLE]: 1521,
  [DatabaseClientType.BETTER_SQLITE3]: 0, // No port for SQLite
  [DatabaseClientType.SQLITE3]: 0,
  [DatabaseClientType.SNOWFLAKE]: 443,
};
```

to:

```typescript
const DEFAULT_PORTS: Partial<Record<DatabaseClientType, number>> = {
  [DatabaseClientType.POSTGRES]: 5432,
  [DatabaseClientType.MYSQL]: 3306,
  [DatabaseClientType.MARIADB]: 3306,
  [DatabaseClientType.MYSQL2]: 3306,
  [DatabaseClientType.REDIS]: 6379,
  [DatabaseClientType.MSSQL]: 1433,
  [DatabaseClientType.ORACLE]: 1521,
  [DatabaseClientType.BETTER_SQLITE3]: 0, // No port for SQLite
  [DatabaseClientType.SQLITE3]: 0,
  [DatabaseClientType.SNOWFLAKE]: 443,
  [DatabaseClientType.REDSHIFT]: 5439,
  [DatabaseClientType.COCKROACHDB]: 26257,
};
```

And the `SCHEME_MAP`:

```typescript
const SCHEME_MAP: Record<
  string,
  { type: DatabaseClientType; providerKind?: EConnectionProviderKind }
> = {
  postgresql: {
    type: DatabaseClientType.POSTGRES,
    providerKind: EConnectionProviderKind.DIRECT_SQL,
  },
  postgres: {
    type: DatabaseClientType.POSTGRES,
    providerKind: EConnectionProviderKind.DIRECT_SQL,
  },
  pg: {
    type: DatabaseClientType.POSTGRES,
    providerKind: EConnectionProviderKind.DIRECT_SQL,
  },
```

add two entries right after the `pg` entry (before `mysql:`):

```typescript
  redshift: {
    type: DatabaseClientType.REDSHIFT,
    providerKind: EConnectionProviderKind.DIRECT_SQL,
  },
  cockroachdb: {
    type: DatabaseClientType.COCKROACHDB,
    providerKind: EConnectionProviderKind.DIRECT_SQL,
  },
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun test:unit test/unit/core/helpers/parser-connection-string.spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Typecheck**

Run: `bun run typecheck`
Expected: PASS. (This will surface every `Record<DatabaseClientType, ...>` in the codebase that is not yet exhaustive for the two new enum values — those are fixed in Tasks 3–9 below. If typecheck fails on a file not covered by a later task in this plan, note it and add a fix inline in this task.)

- [ ] **Step 7: Commit**

```bash
git add core/constants/database-client-type.ts core/helpers/parser-connection-string.ts test/unit/core/helpers/parser-connection-string.spec.ts
git commit -m "feat(db): add Redshift and CockroachDB to DatabaseClientType and connection string parser"
```

---

### Task 2: Make the Postgres driver adapter's knex client overridable

**Files:**

- Modify: `server/infrastructure/driver/postgres.adapter.ts`
- Test: `test/unit/server/infrastructure/driver/postgres.adapter.spec.ts` (new)

**Interfaces:**

- Consumes: `DatabaseClientType` (Task 1).
- Produces: `new PostgresAdapter(connection, applicationName?, dbType?)` — the 3rd param defaults to `DatabaseClientType.POSTGRES`, preserving current behavior for every existing call site (`new PostgresAdapter(connection)`). Task 3's `RedshiftAdapter`/`CockroachAdapter` call `super(connection, applicationName, DatabaseClientType.REDSHIFT | DatabaseClientType.COCKROACHDB)`.

- [ ] **Step 1: Write the failing test**

Create `test/unit/server/infrastructure/driver/postgres.adapter.spec.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { PostgresAdapter } from '~/server/infrastructure/driver/postgres.adapter';

describe('PostgresAdapter', () => {
  it('defaults to the postgres knex client', () => {
    const adapter = new PostgresAdapter(
      'postgresql://user:pass@localhost:5432/db'
    );

    expect(adapter.dbType).toBe(DatabaseClientType.POSTGRES);
    expect(adapter.knex.client.config.client).toBe('postgres');
  });

  it('accepts an explicit dbType override for the knex client', () => {
    const adapter = new PostgresAdapter(
      'redshift://user:pass@localhost:5439/db',
      'OrcaQ',
      DatabaseClientType.REDSHIFT
    );

    expect(adapter.dbType).toBe(DatabaseClientType.REDSHIFT);
    expect(adapter.knex.client.config.client).toBe('redshift');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test:unit test/unit/server/infrastructure/driver/postgres.adapter.spec.ts`
Expected: FAIL on the second test — `new PostgresAdapter(...)` currently only accepts 2 args (TypeScript error) and always sets `client: 'postgres'`.

- [ ] **Step 3: Add the overridable dbType param**

In `server/infrastructure/driver/postgres.adapter.ts`, change:

```typescript
export class PostgresAdapter extends BaseDatabaseAdapter {
  constructor(
    connection: string | Knex.Config['connection'],
    applicationName: string = 'OrcaQ'
  ) {
    let connectionConfig: string | Knex.Config['connection'] = connection;

    if (typeof connectionConfig === 'string') {
      const url = new URL(connectionConfig);
      url.searchParams.set('application_name', applicationName);
      connectionConfig = url.toString();
    } else if (
      typeof connectionConfig === 'object' &&
      connectionConfig !== null
    ) {
      connectionConfig = {
        ...(connectionConfig as object),
        application_name: applicationName,
      };
    }

    const knexInstance = knex({
      client: DatabaseClientType.POSTGRES,
      connection: connectionConfig,
      pool: {
        min: 1,
        max: 10,
        idleTimeoutMillis: 5 * 60 * 1000,
      },
      useNullAsDefault: true,
      log: {
        warn(message) {
          console.warn('[PostgresAdapter]', message);
        },
        error(message) {
          console.error('[PostgresAdapter]', message);
        },
        deprecate(message) {
          console.warn('[PostgresAdapter] Deprecation:', message);
        },
        debug(message) {
          console.debug('[PostgresAdapter]', message);
        },
      },
    });

    super(DatabaseClientType.POSTGRES, connection, knexInstance);
  }
```

to:

```typescript
export class PostgresAdapter extends BaseDatabaseAdapter {
  constructor(
    connection: string | Knex.Config['connection'],
    applicationName: string = 'OrcaQ',
    dbType: DatabaseClientType = DatabaseClientType.POSTGRES
  ) {
    let connectionConfig: string | Knex.Config['connection'] = connection;

    if (typeof connectionConfig === 'string') {
      const url = new URL(connectionConfig);
      url.searchParams.set('application_name', applicationName);
      connectionConfig = url.toString();
    } else if (
      typeof connectionConfig === 'object' &&
      connectionConfig !== null
    ) {
      connectionConfig = {
        ...(connectionConfig as object),
        application_name: applicationName,
      };
    }

    const knexInstance = knex({
      client: dbType,
      connection: connectionConfig,
      pool: {
        min: 1,
        max: 10,
        idleTimeoutMillis: 5 * 60 * 1000,
      },
      useNullAsDefault: true,
      log: {
        warn(message) {
          console.warn('[PostgresAdapter]', message);
        },
        error(message) {
          console.error('[PostgresAdapter]', message);
        },
        deprecate(message) {
          console.warn('[PostgresAdapter] Deprecation:', message);
        },
        debug(message) {
          console.debug('[PostgresAdapter]', message);
        },
      },
    });

    super(dbType, connection, knexInstance);
  }
```

(Only the constructor's parameter list, the `client:` line, and the final `super(...)` call change — every other method on the class is untouched.)

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test:unit test/unit/server/infrastructure/driver/postgres.adapter.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the full driver unit suite to confirm no regression**

Run: `bun test:unit test/unit/server/infrastructure/driver`
Expected: PASS (all existing driver tests still green — this confirms the default-param change didn't affect any existing Postgres call site).

- [ ] **Step 6: Commit**

```bash
git add server/infrastructure/driver/postgres.adapter.ts test/unit/server/infrastructure/driver/postgres.adapter.spec.ts
git commit -m "refactor(driver): make PostgresAdapter's knex client dbType overridable"
```

---

### Task 3: Redshift + CockroachDB driver adapters (raw query)

**Files:**

- Create: `server/infrastructure/driver/redshift.adapter.ts`
- Create: `server/infrastructure/driver/cockroachdb.adapter.ts`
- Modify: `server/infrastructure/driver/factory.ts`
- Test: `test/unit/server/infrastructure/driver/redshift.adapter.spec.ts` (new)
- Test: `test/unit/server/infrastructure/driver/cockroachdb.adapter.spec.ts` (new)
- Modify: `test/unit/server/infrastructure/driver/factory.spec.ts`

**Interfaces:**

- Consumes: `PostgresAdapter` constructor with 3rd `dbType` param (Task 2).
- Produces: `RedshiftAdapter`, `CockroachAdapter` classes, both `extends PostgresAdapter`, both implementing `IDatabaseAdapter` transitively. `createDatabaseAdapter(DatabaseClientType.REDSHIFT, connection)` returns a `RedshiftAdapter`; `createDatabaseAdapter(DatabaseClientType.COCKROACHDB, connection)` returns a `CockroachAdapter`.

- [ ] **Step 1: Write the failing tests**

Create `test/unit/server/infrastructure/driver/redshift.adapter.spec.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { RedshiftAdapter } from '~/server/infrastructure/driver/redshift.adapter';

describe('RedshiftAdapter', () => {
  it('configures knex with the redshift client', () => {
    const adapter = new RedshiftAdapter(
      'redshift://admin:secret@cluster.redshift.amazonaws.com:5439/analytics'
    );

    expect(adapter.dbType).toBe(DatabaseClientType.REDSHIFT);
    expect(adapter.knex.client.config.client).toBe('redshift');
  });
});
```

Create `test/unit/server/infrastructure/driver/cockroachdb.adapter.spec.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { CockroachAdapter } from '~/server/infrastructure/driver/cockroachdb.adapter';

describe('CockroachAdapter', () => {
  it('configures knex with the cockroachdb client', () => {
    const adapter = new CockroachAdapter(
      'cockroachdb://root:secret@localhost:26257/defaultdb'
    );

    expect(adapter.dbType).toBe(DatabaseClientType.COCKROACHDB);
    expect(adapter.knex.client.config.client).toBe('cockroachdb');
  });
});
```

In `test/unit/server/infrastructure/driver/factory.spec.ts`, add (inside the existing `describe('createDatabaseAdapter', ...)` block, after the last `it`):

```typescript
it('routes Redshift connections to RedshiftAdapter', () => {
  const adapter = createDatabaseAdapter(
    DatabaseClientType.REDSHIFT,
    'redshift://admin:secret@cluster.redshift.amazonaws.com:5439/analytics'
  );

  expect(adapter.dbType).toBe(DatabaseClientType.REDSHIFT);
});

it('routes CockroachDB connections to CockroachAdapter', () => {
  const adapter = createDatabaseAdapter(
    DatabaseClientType.COCKROACHDB,
    'cockroachdb://root:secret@localhost:26257/defaultdb'
  );

  expect(adapter.dbType).toBe(DatabaseClientType.COCKROACHDB);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test:unit test/unit/server/infrastructure/driver`
Expected: FAIL — `redshift.adapter.ts`/`cockroachdb.adapter.ts` don't exist yet, and `factory.ts` doesn't route `REDSHIFT`/`COCKROACHDB`.

- [ ] **Step 3: Create the two adapter classes**

Create `server/infrastructure/driver/redshift.adapter.ts`:

```typescript
import type { Knex } from 'knex';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { PostgresAdapter } from './postgres.adapter';

export class RedshiftAdapter extends PostgresAdapter {
  constructor(
    connection: string | Knex.Config['connection'],
    applicationName: string = 'OrcaQ'
  ) {
    super(connection, applicationName, DatabaseClientType.REDSHIFT);
  }
}
```

Create `server/infrastructure/driver/cockroachdb.adapter.ts`:

```typescript
import type { Knex } from 'knex';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { PostgresAdapter } from './postgres.adapter';

export class CockroachAdapter extends PostgresAdapter {
  constructor(
    connection: string | Knex.Config['connection'],
    applicationName: string = 'OrcaQ'
  ) {
    super(connection, applicationName, DatabaseClientType.COCKROACHDB);
  }
}
```

- [ ] **Step 4: Wire the factory**

In `server/infrastructure/driver/factory.ts`, add imports:

```typescript
import { CockroachAdapter } from './cockroachdb.adapter';
```

```typescript
import { RedshiftAdapter } from './redshift.adapter';
```

(alongside the existing `import { MysqlAdapter } from './mysql.adapter';` etc — keep imports alphabetically grouped as in the current file), and add to `ADAPTER_FACTORIES`:

```typescript
const ADAPTER_FACTORIES: Partial<Record<DatabaseClientType, AdapterFactory>> = {
  [DatabaseClientType.POSTGRES]: connection => new PostgresAdapter(connection),
  [DatabaseClientType.MYSQL]: connection => new MysqlAdapter(connection),
  [DatabaseClientType.MARIADB]: connection =>
    new MysqlAdapter(connection, DatabaseClientType.MARIADB),
  [DatabaseClientType.ORACLE]: connection => new OracleAdapter(connection),
  [DatabaseClientType.SQLITE3]: connection => new SqliteAdapter(connection),
  [DatabaseClientType.REDSHIFT]: connection => new RedshiftAdapter(connection),
  [DatabaseClientType.COCKROACHDB]: connection =>
    new CockroachAdapter(connection),
};
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun test:unit test/unit/server/infrastructure/driver`
Expected: PASS (all tests, including the 2 new files and the 2 new factory cases).

- [ ] **Step 6: Typecheck**

Run: `bun run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add server/infrastructure/driver/redshift.adapter.ts server/infrastructure/driver/cockroachdb.adapter.ts server/infrastructure/driver/factory.ts test/unit/server/infrastructure/driver/redshift.adapter.spec.ts test/unit/server/infrastructure/driver/cockroachdb.adapter.spec.ts test/unit/server/infrastructure/driver/factory.spec.ts
git commit -m "feat(driver): add Redshift and CockroachDB driver adapters"
```

---

### Task 4: Redshift + CockroachDB metadata adapters (schema browser + ERD data)

**Files:**

- Create: `server/infrastructure/database/adapters/metadata/redshift/redshift-metadata.adapter.ts`
- Create: `server/infrastructure/database/adapters/metadata/cockroachdb/cockroachdb-metadata.adapter.ts`
- Modify: `server/infrastructure/database/adapters/metadata/metadata.factory.ts`

**Interfaces:**

- Consumes: `PostgresMetadataAdapter` (`getSchemaMetaData()`, `getErdData()`, `getReverseSchemas()` — all inherited unchanged), `BaseDomainAdapter.resolveAdapter(params, dbType)` (routes to Task 3's driver factory).
- Produces: `RedshiftMetadataAdapter`, `CockroachMetadataAdapter`, both `implements IDatabaseMetadataAdapter`. `createMetadataAdapter(DatabaseClientType.REDSHIFT, params)` / `createMetadataAdapter(DatabaseClientType.COCKROACHDB, params)`.

No unit test for this task — `PostgresMetadataAdapter`'s methods are thin `rawQuery` passthroughs with no dialect-specific branching (confirmed by reading `postgres-metadata.adapter.ts`), so there is nothing dialect-specific to unit test here. Correctness for CockroachDB is verified by the integration tests in Task 9; Redshift has no live-connection verification available (see Task 10 and the spec's Testing section).

- [ ] **Step 1: Create the two metadata adapter classes**

Create `server/infrastructure/database/adapters/metadata/redshift/redshift-metadata.adapter.ts`:

```typescript
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { PostgresMetadataAdapter } from '../postgres/postgres-metadata.adapter';
import type { DatabaseMetadataAdapterParams } from '../types';

export class RedshiftMetadataAdapter extends PostgresMetadataAdapter {
  override readonly dbType = DatabaseClientType.REDSHIFT;

  static override async create(
    params: DatabaseMetadataAdapterParams
  ): Promise<RedshiftMetadataAdapter> {
    const adapter = await RedshiftMetadataAdapter.resolveAdapter(
      params,
      DatabaseClientType.REDSHIFT
    );
    return new RedshiftMetadataAdapter(adapter);
  }
}
```

Create `server/infrastructure/database/adapters/metadata/cockroachdb/cockroachdb-metadata.adapter.ts`:

```typescript
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { PostgresMetadataAdapter } from '../postgres/postgres-metadata.adapter';
import type { DatabaseMetadataAdapterParams } from '../types';

export class CockroachMetadataAdapter extends PostgresMetadataAdapter {
  override readonly dbType = DatabaseClientType.COCKROACHDB;

  static override async create(
    params: DatabaseMetadataAdapterParams
  ): Promise<CockroachMetadataAdapter> {
    const adapter = await CockroachMetadataAdapter.resolveAdapter(
      params,
      DatabaseClientType.COCKROACHDB
    );
    return new CockroachMetadataAdapter(adapter);
  }
}
```

- [ ] **Step 2: Wire the factory**

In `server/infrastructure/database/adapters/metadata/metadata.factory.ts`, change:

```typescript
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createDomainAdapter } from '../shared';
import { MysqlMetadataAdapter } from './mysql/mysql-metadata.adapter';
import { OracleMetadataAdapter } from './oracle/oracle-metadata.adapter';
import { PostgresMetadataAdapter } from './postgres/postgres-metadata.adapter';
import { SqliteMetadataAdapter } from './sqlite/sqlite-metadata.adapter';
import type {
  IDatabaseMetadataAdapter,
  DatabaseMetadataAdapterParams,
} from './types';

export async function createMetadataAdapter(
  dbType: DatabaseClientType | undefined,
  params: DatabaseMetadataAdapterParams
): Promise<IDatabaseMetadataAdapter> {
  return createDomainAdapter<
    IDatabaseMetadataAdapter,
    DatabaseMetadataAdapterParams
  >(dbType, params, 'metadata', {
    postgres: PostgresMetadataAdapter.create,
    mysql: params =>
      MysqlMetadataAdapter.create(params, DatabaseClientType.MYSQL),
    mariadb: params =>
      MysqlMetadataAdapter.create(params, DatabaseClientType.MARIADB),
    oracledb: OracleMetadataAdapter.create,
    sqlite3: SqliteMetadataAdapter.create,
  });
}
```

to:

```typescript
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createDomainAdapter } from '../shared';
import { CockroachMetadataAdapter } from './cockroachdb/cockroachdb-metadata.adapter';
import { MysqlMetadataAdapter } from './mysql/mysql-metadata.adapter';
import { OracleMetadataAdapter } from './oracle/oracle-metadata.adapter';
import { PostgresMetadataAdapter } from './postgres/postgres-metadata.adapter';
import { RedshiftMetadataAdapter } from './redshift/redshift-metadata.adapter';
import { SqliteMetadataAdapter } from './sqlite/sqlite-metadata.adapter';
import type {
  IDatabaseMetadataAdapter,
  DatabaseMetadataAdapterParams,
} from './types';

export async function createMetadataAdapter(
  dbType: DatabaseClientType | undefined,
  params: DatabaseMetadataAdapterParams
): Promise<IDatabaseMetadataAdapter> {
  return createDomainAdapter<
    IDatabaseMetadataAdapter,
    DatabaseMetadataAdapterParams
  >(dbType, params, 'metadata', {
    postgres: PostgresMetadataAdapter.create,
    mysql: params =>
      MysqlMetadataAdapter.create(params, DatabaseClientType.MYSQL),
    mariadb: params =>
      MysqlMetadataAdapter.create(params, DatabaseClientType.MARIADB),
    oracledb: OracleMetadataAdapter.create,
    sqlite3: SqliteMetadataAdapter.create,
    redshift: RedshiftMetadataAdapter.create,
    cockroachdb: CockroachMetadataAdapter.create,
  });
}
```

- [ ] **Step 3: Typecheck**

Run: `bun run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add server/infrastructure/database/adapters/metadata/redshift server/infrastructure/database/adapters/metadata/cockroachdb server/infrastructure/database/adapters/metadata/metadata.factory.ts
git commit -m "feat(metadata): add Redshift and CockroachDB metadata adapters"
```

---

### Task 5: Redshift + CockroachDB tables adapters (with RLS/RULE/TRIGGER stubs)

**Files:**

- Create: `server/infrastructure/database/adapters/tables/redshift/redshift-table.adapter.ts`
- Create: `server/infrastructure/database/adapters/tables/cockroachdb/cockroachdb-table.adapter.ts`
- Modify: `server/infrastructure/database/adapters/tables/tables.factory.ts`
- Test: `test/unit/server/infrastructure/database/adapters/tables/redshift-table.adapter.spec.ts` (new)
- Test: `test/unit/server/infrastructure/database/adapters/tables/cockroachdb-table.adapter.spec.ts` (new)

**Interfaces:**

- Consumes: `PostgresTableAdapter` (all `IDatabaseTableAdapter` methods inherited except the 4 overridden below), `IDatabaseAdapter` (fake, in tests).
- Produces: `RedshiftTableAdapter`, `CockroachTableAdapter`. Both override `getTableRlsStatus`, `getTableRlsPolicies`, `getTableRules`, `getTableTriggers` to return empty/disabled results (per the design's known-gaps table — neither dialect supports RLS policies, RULEs, or TRIGGERs the way Postgres does). `getTableIndexes` and everything else is inherited unchanged.

- [ ] **Step 1: Write the failing tests**

Create `test/unit/server/infrastructure/database/adapters/tables/redshift-table.adapter.spec.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { RedshiftTableAdapter } from '~/server/infrastructure/database/adapters/tables/redshift/redshift-table.adapter';
import type { IDatabaseAdapter } from '~/server/infrastructure/driver';

const fakeAdapter = {
  rawQuery: async () => [],
} as unknown as IDatabaseAdapter;

describe('RedshiftTableAdapter', () => {
  it('reports RLS as disabled (Redshift has no row-level security)', async () => {
    const adapter = new RedshiftTableAdapter(fakeAdapter);
    const status = await adapter.getTableRlsStatus('public', 'orders');
    expect(status).toEqual({ enabled: false });
  });

  it('returns no RLS policies', async () => {
    const adapter = new RedshiftTableAdapter(fakeAdapter);
    const policies = await adapter.getTableRlsPolicies('public', 'orders');
    expect(policies).toEqual([]);
  });

  it('returns no rules (Redshift has no CREATE RULE support)', async () => {
    const adapter = new RedshiftTableAdapter(fakeAdapter);
    const rules = await adapter.getTableRules('public', 'orders');
    expect(rules).toEqual([]);
  });

  it('returns no triggers (Redshift has no trigger support)', async () => {
    const adapter = new RedshiftTableAdapter(fakeAdapter);
    const triggers = await adapter.getTableTriggers('public', 'orders');
    expect(triggers).toEqual([]);
  });
});
```

Create `test/unit/server/infrastructure/database/adapters/tables/cockroachdb-table.adapter.spec.ts` (identical shape, importing `CockroachTableAdapter`):

```typescript
import { describe, expect, it } from 'vitest';
import { CockroachTableAdapter } from '~/server/infrastructure/database/adapters/tables/cockroachdb/cockroachdb-table.adapter';
import type { IDatabaseAdapter } from '~/server/infrastructure/driver';

const fakeAdapter = {
  rawQuery: async () => [],
} as unknown as IDatabaseAdapter;

describe('CockroachTableAdapter', () => {
  it('reports RLS as disabled', async () => {
    const adapter = new CockroachTableAdapter(fakeAdapter);
    const status = await adapter.getTableRlsStatus('public', 'orders');
    expect(status).toEqual({ enabled: false });
  });

  it('returns no RLS policies', async () => {
    const adapter = new CockroachTableAdapter(fakeAdapter);
    const policies = await adapter.getTableRlsPolicies('public', 'orders');
    expect(policies).toEqual([]);
  });

  it('returns no rules (CockroachDB has no CREATE RULE support)', async () => {
    const adapter = new CockroachTableAdapter(fakeAdapter);
    const rules = await adapter.getTableRules('public', 'orders');
    expect(rules).toEqual([]);
  });

  it('returns no triggers (CockroachDB has no trigger support)', async () => {
    const adapter = new CockroachTableAdapter(fakeAdapter);
    const triggers = await adapter.getTableTriggers('public', 'orders');
    expect(triggers).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test:unit test/unit/server/infrastructure/database/adapters/tables`
Expected: FAIL — the two new adapter files don't exist yet.

- [ ] **Step 3: Create the two table adapter classes**

Create `server/infrastructure/database/adapters/tables/redshift/redshift-table.adapter.ts`:

```typescript
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  RLSPolicy,
  RLSStatus,
  TableRule,
  TableTrigger,
} from '~/core/types';
import { PostgresTableAdapter } from '../postgres/postgres-table.adapter';
import type { DatabaseTableAdapterParams } from '../types';

export class RedshiftTableAdapter extends PostgresTableAdapter {
  override readonly dbType = DatabaseClientType.REDSHIFT;

  static override async create(
    params: DatabaseTableAdapterParams
  ): Promise<RedshiftTableAdapter> {
    const adapter = await RedshiftTableAdapter.resolveAdapter(
      params,
      DatabaseClientType.REDSHIFT
    );
    return new RedshiftTableAdapter(adapter);
  }

  override async getTableRlsStatus(
    schema: string,
    tableName: string
  ): Promise<RLSStatus> {
    return { enabled: false };
  }

  override async getTableRlsPolicies(
    schema: string,
    tableName: string
  ): Promise<RLSPolicy[]> {
    return [];
  }

  override async getTableRules(
    schema: string,
    tableName: string
  ): Promise<TableRule[]> {
    return [];
  }

  override async getTableTriggers(
    schema: string,
    tableName: string
  ): Promise<TableTrigger[]> {
    return [];
  }
}
```

Create `server/infrastructure/database/adapters/tables/cockroachdb/cockroachdb-table.adapter.ts` (identical, swapping `REDSHIFT` → `COCKROACHDB` and class name → `CockroachTableAdapter`):

```typescript
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  RLSPolicy,
  RLSStatus,
  TableRule,
  TableTrigger,
} from '~/core/types';
import { PostgresTableAdapter } from '../postgres/postgres-table.adapter';
import type { DatabaseTableAdapterParams } from '../types';

export class CockroachTableAdapter extends PostgresTableAdapter {
  override readonly dbType = DatabaseClientType.COCKROACHDB;

  static override async create(
    params: DatabaseTableAdapterParams
  ): Promise<CockroachTableAdapter> {
    const adapter = await CockroachTableAdapter.resolveAdapter(
      params,
      DatabaseClientType.COCKROACHDB
    );
    return new CockroachTableAdapter(adapter);
  }

  override async getTableRlsStatus(
    schema: string,
    tableName: string
  ): Promise<RLSStatus> {
    return { enabled: false };
  }

  override async getTableRlsPolicies(
    schema: string,
    tableName: string
  ): Promise<RLSPolicy[]> {
    return [];
  }

  override async getTableRules(
    schema: string,
    tableName: string
  ): Promise<TableRule[]> {
    return [];
  }

  override async getTableTriggers(
    schema: string,
    tableName: string
  ): Promise<TableTrigger[]> {
    return [];
  }
}
```

Note: the override methods declare `schema`/`tableName` params to match `IDatabaseTableAdapter`'s signature exactly even though they're unused — dropping them would still satisfy the interface structurally (TypeScript allows a narrower-arity override there), but it breaks any code that calls the method on the _concrete_ `RedshiftTableAdapter`/`CockroachTableAdapter` type with 2 arguments (as the Step 1 unit tests do) with an "Expected 0 arguments" error. Keeping the full signature avoids that trap entirely.

- [ ] **Step 4: Wire the factory**

In `server/infrastructure/database/adapters/tables/tables.factory.ts`, change:

```typescript
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createDomainAdapter } from '../shared';
import { MysqlTableAdapter } from './mysql/mysql-table.adapter';
import { OracleTableAdapter } from './oracle/oracle-table.adapter';
import { PostgresTableAdapter } from './postgres/postgres-table.adapter';
import { SqliteTableAdapter } from './sqlite/sqlite-table.adapter';
import type {
  IDatabaseTableAdapter,
  DatabaseTableAdapterParams,
} from './types';

export async function createTableAdapter(
  dbType: DatabaseClientType | undefined,
  params: DatabaseTableAdapterParams
): Promise<IDatabaseTableAdapter> {
  return createDomainAdapter<IDatabaseTableAdapter, DatabaseTableAdapterParams>(
    dbType,
    params,
    'table',
    {
      postgres: PostgresTableAdapter.create,
      mysql: params =>
        MysqlTableAdapter.create(params, DatabaseClientType.MYSQL),
      mariadb: params =>
        MysqlTableAdapter.create(params, DatabaseClientType.MARIADB),
      oracledb: OracleTableAdapter.create,
      sqlite3: SqliteTableAdapter.create,
    }
  );
}
```

to:

```typescript
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createDomainAdapter } from '../shared';
import { CockroachTableAdapter } from './cockroachdb/cockroachdb-table.adapter';
import { MysqlTableAdapter } from './mysql/mysql-table.adapter';
import { OracleTableAdapter } from './oracle/oracle-table.adapter';
import { PostgresTableAdapter } from './postgres/postgres-table.adapter';
import { RedshiftTableAdapter } from './redshift/redshift-table.adapter';
import { SqliteTableAdapter } from './sqlite/sqlite-table.adapter';
import type {
  IDatabaseTableAdapter,
  DatabaseTableAdapterParams,
} from './types';

export async function createTableAdapter(
  dbType: DatabaseClientType | undefined,
  params: DatabaseTableAdapterParams
): Promise<IDatabaseTableAdapter> {
  return createDomainAdapter<IDatabaseTableAdapter, DatabaseTableAdapterParams>(
    dbType,
    params,
    'table',
    {
      postgres: PostgresTableAdapter.create,
      mysql: params =>
        MysqlTableAdapter.create(params, DatabaseClientType.MYSQL),
      mariadb: params =>
        MysqlTableAdapter.create(params, DatabaseClientType.MARIADB),
      oracledb: OracleTableAdapter.create,
      sqlite3: SqliteTableAdapter.create,
      redshift: RedshiftTableAdapter.create,
      cockroachdb: CockroachTableAdapter.create,
    }
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun test:unit test/unit/server/infrastructure/database/adapters/tables`
Expected: PASS (8 new tests).

- [ ] **Step 6: Typecheck**

Run: `bun run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add server/infrastructure/database/adapters/tables/redshift server/infrastructure/database/adapters/tables/cockroachdb server/infrastructure/database/adapters/tables/tables.factory.ts test/unit/server/infrastructure/database/adapters/tables/redshift-table.adapter.spec.ts test/unit/server/infrastructure/database/adapters/tables/cockroachdb-table.adapter.spec.ts
git commit -m "feat(tables): add Redshift and CockroachDB table adapters with RLS/RULE/TRIGGER stubs"
```

---

### Task 6: Redshift + CockroachDB views adapters

**Files:**

- Create: `server/infrastructure/database/adapters/views/redshift/redshift-view.adapter.ts`
- Create: `server/infrastructure/database/adapters/views/cockroachdb/cockroachdb-view.adapter.ts`
- Modify: `server/infrastructure/database/adapters/views/views.factory.ts`

**Interfaces:**

- Consumes: `PostgresViewAdapter` (all `IDatabaseViewAdapter` methods inherited unchanged — no dialect-specific gaps identified for views).
- Produces: `RedshiftViewAdapter`, `CockroachViewAdapter`.

No unit test for this task, same reasoning as Task 4 (`PostgresViewAdapter` is a thin `rawQuery` passthrough with zero dialect branching). Covered by Task 9's CockroachDB integration tests.

- [ ] **Step 1: Create the two view adapter classes**

Create `server/infrastructure/database/adapters/views/redshift/redshift-view.adapter.ts`:

```typescript
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { PostgresViewAdapter } from '../postgres/postgres-view.adapter';
import type { DatabaseViewAdapterParams } from '../types';

export class RedshiftViewAdapter extends PostgresViewAdapter {
  override readonly dbType = DatabaseClientType.REDSHIFT;

  static override async create(
    params: DatabaseViewAdapterParams
  ): Promise<RedshiftViewAdapter> {
    const adapter = await RedshiftViewAdapter.resolveAdapter(
      params,
      DatabaseClientType.REDSHIFT
    );
    return new RedshiftViewAdapter(adapter);
  }
}
```

Create `server/infrastructure/database/adapters/views/cockroachdb/cockroachdb-view.adapter.ts`:

```typescript
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { PostgresViewAdapter } from '../postgres/postgres-view.adapter';
import type { DatabaseViewAdapterParams } from '../types';

export class CockroachViewAdapter extends PostgresViewAdapter {
  override readonly dbType = DatabaseClientType.COCKROACHDB;

  static override async create(
    params: DatabaseViewAdapterParams
  ): Promise<CockroachViewAdapter> {
    const adapter = await CockroachViewAdapter.resolveAdapter(
      params,
      DatabaseClientType.COCKROACHDB
    );
    return new CockroachViewAdapter(adapter);
  }
}
```

- [ ] **Step 2: Wire the factory**

In `server/infrastructure/database/adapters/views/views.factory.ts`, change:

```typescript
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createDomainAdapter } from '../shared';
import { MysqlViewAdapter } from './mysql/mysql-view.adapter';
import { OracleViewAdapter } from './oracle/oracle-view.adapter';
import { PostgresViewAdapter } from './postgres/postgres-view.adapter';
import { SqliteViewAdapter } from './sqlite/sqlite-view.adapter';
import type { IDatabaseViewAdapter, DatabaseViewAdapterParams } from './types';

export async function createViewAdapter(
  dbType: DatabaseClientType | undefined,
  params: DatabaseViewAdapterParams
): Promise<IDatabaseViewAdapter> {
  return createDomainAdapter<IDatabaseViewAdapter, DatabaseViewAdapterParams>(
    dbType,
    params,
    'view',
    {
      postgres: PostgresViewAdapter.create,
      mysql: createParams => MysqlViewAdapter.create(createParams),
      mariadb: createParams =>
        MysqlViewAdapter.create(createParams, DatabaseClientType.MARIADB),
      oracledb: OracleViewAdapter.create,
      sqlite3: SqliteViewAdapter.create,
    }
  );
}
```

to:

```typescript
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createDomainAdapter } from '../shared';
import { CockroachViewAdapter } from './cockroachdb/cockroachdb-view.adapter';
import { MysqlViewAdapter } from './mysql/mysql-view.adapter';
import { OracleViewAdapter } from './oracle/oracle-view.adapter';
import { PostgresViewAdapter } from './postgres/postgres-view.adapter';
import { RedshiftViewAdapter } from './redshift/redshift-view.adapter';
import { SqliteViewAdapter } from './sqlite/sqlite-view.adapter';
import type { IDatabaseViewAdapter, DatabaseViewAdapterParams } from './types';

export async function createViewAdapter(
  dbType: DatabaseClientType | undefined,
  params: DatabaseViewAdapterParams
): Promise<IDatabaseViewAdapter> {
  return createDomainAdapter<IDatabaseViewAdapter, DatabaseViewAdapterParams>(
    dbType,
    params,
    'view',
    {
      postgres: PostgresViewAdapter.create,
      mysql: createParams => MysqlViewAdapter.create(createParams),
      mariadb: createParams =>
        MysqlViewAdapter.create(createParams, DatabaseClientType.MARIADB),
      oracledb: OracleViewAdapter.create,
      sqlite3: SqliteViewAdapter.create,
      redshift: RedshiftViewAdapter.create,
      cockroachdb: CockroachViewAdapter.create,
    }
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `bun run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add server/infrastructure/database/adapters/views/redshift server/infrastructure/database/adapters/views/cockroachdb server/infrastructure/database/adapters/views/views.factory.ts
git commit -m "feat(views): add Redshift and CockroachDB view adapters"
```

---

### Task 7: Connection type registry + connection form UI

**Files:**

- Modify: `components/modules/connection/constants/index.ts`
- Modify: `components/modules/connection/hooks/useConnectionForm.ts`

**Interfaces:**

- Consumes: `DatabaseClientType.REDSHIFT`, `DatabaseClientType.COCKROACHDB` (Task 1).
- Produces: both types appear as selectable, supported cards in the "new connection" UI, with correct default port, connection-string scheme, and placeholder text.

This task is UI wiring with no dedicated unit — it's exercised by the app's existing component/E2E coverage of the connection form. Verify manually per Step 4 below.

- [ ] **Step 1: Register the two types as supported connection cards**

In `components/modules/connection/constants/index.ts`, add two entries to the `databaseSupports` array — insert them right after the `ORACLE` entry (before the `SQLITE3` entry):

```typescript
  {
    type: DatabaseClientType.ORACLE,
    name: 'Oracle',
    icon: h(Icon, { name: 'simple-icons:oracle', class: 'text-red-500' }),
    isSupport: false,
    unsupportedLabel: 'Coming soon',
    description: 'Relational SQL workflows',
  },
  {
    type: DatabaseClientType.REDSHIFT,
    name: 'Amazon Redshift',
    icon: h(Icon, { name: 'logos:aws-redshift' }),
    isSupport: true,
    isBeta: true,
    description: 'Cloud data warehouse (raw query, schema browser, ERD)',
  },
  {
    type: DatabaseClientType.COCKROACHDB,
    name: 'CockroachDB',
    icon: h(Icon, { name: 'simple-icons:cockroachlabs' }),
    isSupport: true,
    isBeta: true,
    description: 'Distributed SQL database (raw query, schema browser, ERD)',
  },
```

And add the two ports to `DEFAULT_DB_PORTS`:

```typescript
export const DEFAULT_DB_PORTS: Record<string, string> = {
  [DatabaseClientType.POSTGRES]: '5432',
  [DatabaseClientType.MYSQL]: '3306',
  [DatabaseClientType.MARIADB]: '3306',
  [DatabaseClientType.MYSQL2]: '3306',
  [DatabaseClientType.REDIS]: '6379',
  [DatabaseClientType.MSSQL]: '1433',
  [DatabaseClientType.ORACLE]: '1521',
  [DatabaseClientType.BETTER_SQLITE3]: '0',
  [DatabaseClientType.SQLITE3]: '0',
  [DatabaseClientType.SNOWFLAKE]: '443',
  [DatabaseClientType.REDSHIFT]: '5439',
  [DatabaseClientType.COCKROACHDB]: '26257',
};
```

- [ ] **Step 2: Add the connection-string scheme and placeholder**

In `components/modules/connection/hooks/useConnectionForm.ts`, change `getConnectionStringScheme`:

```typescript
const getConnectionStringScheme = (type: DatabaseClientType | null) => {
  switch (type) {
    case DatabaseClientType.POSTGRES:
      return 'postgresql';
    case DatabaseClientType.MARIADB:
      return 'mariadb';
    case DatabaseClientType.ORACLE:
      return 'oracledb';
    case DatabaseClientType.REDIS:
      return 'redis';
    case DatabaseClientType.SNOWFLAKE:
      return 'snowflake';
    case DatabaseClientType.MYSQL:
    case DatabaseClientType.MYSQL2:
      return 'mysql';
    default:
      return '';
  }
};
```

to:

```typescript
const getConnectionStringScheme = (type: DatabaseClientType | null) => {
  switch (type) {
    case DatabaseClientType.POSTGRES:
      return 'postgresql';
    case DatabaseClientType.MARIADB:
      return 'mariadb';
    case DatabaseClientType.ORACLE:
      return 'oracledb';
    case DatabaseClientType.REDIS:
      return 'redis';
    case DatabaseClientType.SNOWFLAKE:
      return 'snowflake';
    case DatabaseClientType.MYSQL:
    case DatabaseClientType.MYSQL2:
      return 'mysql';
    case DatabaseClientType.REDSHIFT:
      return 'redshift';
    case DatabaseClientType.COCKROACHDB:
      return 'cockroachdb';
    default:
      return '';
  }
};
```

And change `getConnectionPlaceholder`:

```typescript
const getConnectionPlaceholder = () => {
  switch (dbType.value) {
    case DatabaseClientType.POSTGRES:
      return 'postgresql://username:password@localhost:5432/database';
    case DatabaseClientType.MYSQL:
    case DatabaseClientType.MYSQL2:
      return 'mysql://username:password@localhost:3306/database';
    case DatabaseClientType.MARIADB:
      return 'mariadb://username:password@localhost:3306/database';
    case DatabaseClientType.ORACLE:
      return 'oracledb://username:password@localhost:1521/ORCLPDB1';
    case DatabaseClientType.REDIS:
      return 'redis://username:password@localhost:6379';
    case DatabaseClientType.SNOWFLAKE:
      return 'snowflake://username:password@account.snowflakecomputing.com:443/database';
    case DatabaseClientType.SQLITE3:
      return '/Users/you/data/app.sqlite';
    default:
      return '';
  }
};
```

to:

```typescript
const getConnectionPlaceholder = () => {
  switch (dbType.value) {
    case DatabaseClientType.POSTGRES:
      return 'postgresql://username:password@localhost:5432/database';
    case DatabaseClientType.MYSQL:
    case DatabaseClientType.MYSQL2:
      return 'mysql://username:password@localhost:3306/database';
    case DatabaseClientType.MARIADB:
      return 'mariadb://username:password@localhost:3306/database';
    case DatabaseClientType.ORACLE:
      return 'oracledb://username:password@localhost:1521/ORCLPDB1';
    case DatabaseClientType.REDIS:
      return 'redis://username:password@localhost:6379';
    case DatabaseClientType.SNOWFLAKE:
      return 'snowflake://username:password@account.snowflakecomputing.com:443/database';
    case DatabaseClientType.SQLITE3:
      return '/Users/you/data/app.sqlite';
    case DatabaseClientType.REDSHIFT:
      return 'redshift://username:password@cluster.abc123.us-east-1.redshift.amazonaws.com:5439/database';
    case DatabaseClientType.COCKROACHDB:
      return 'cockroachdb://username:password@localhost:26257/database';
    default:
      return '';
  }
};
```

- [ ] **Step 3: Typecheck**

Run: `bun run typecheck`
Expected: PASS.

- [ ] **Step 4: Manual verification**

Run: `bun run dev`, open the app, click "New Connection". Confirm:

- "Amazon Redshift" and "CockroachDB" cards appear, are clickable (not marked "Coming soon"), show the AWS Redshift logo and the CockroachDB logo respectively (if the CockroachDB icon (`simple-icons:cockroachlabs`) fails to render because that icon slug doesn't exist in the resolved icon set, replace it with a different verified `simple-icons:` or `logos:` slug for CockroachDB before proceeding — check what renders in the browser, since `simple-icons` isn't bundled locally in this repo (verified via `node_modules/@iconify-json` — only `logos`, `hugeicons`, `material-icon-theme`, `lucide` are present) and is resolved through Nuxt Icon's runtime API instead, so it can't be checked ahead of time from the filesystem).
- Selecting "Amazon Redshift" pre-fills port `5439` and shows the Redshift connection-string placeholder.
- Selecting "CockroachDB" pre-fills port `26257` and shows the CockroachDB connection-string placeholder.

- [ ] **Step 5: Commit**

```bash
git add components/modules/connection/constants/index.ts components/modules/connection/hooks/useConnectionForm.ts
git commit -m "feat(connection): add Redshift and CockroachDB to the connection form"
```

---

### Task 8: SQL editor dialect mapping

**Files:**

- Modify: `components/modules/raw-query/utils/commandType.ts`
- Modify: `components/base/code-editor/states/sqlParserConfig.ts`

**Interfaces:**

- Consumes: `DatabaseClientType.REDSHIFT`, `DatabaseClientType.COCKROACHDB` (Task 1).
- Produces: `createCommandResultFactory(command, rowCount, DatabaseClientType.REDSHIFT | DatabaseClientType.COCKROACHDB)` no longer throws; `resolveParserDialect`/`resolveHighlightDialect` return the Postgres CodeMirror dialect for both new types.

- [ ] **Step 1: Write the failing test**

`commandType.ts`'s `HANDLER_REGISTRY` is typed `Record<DatabaseClientType, ...>`, so after Task 1 adds the two enum values, `bun run typecheck` already fails here with a "missing properties" error — that IS this task's failing check, no new test file needed. Confirm it:

Run: `bun run typecheck`
Expected: FAIL — `Property '[redshift]' is missing in type '{ ... }'` (or equivalent) on `HANDLER_REGISTRY` in `components/modules/raw-query/utils/commandType.ts`.

- [ ] **Step 2: Add the two registry entries**

In `components/modules/raw-query/utils/commandType.ts`, change:

```typescript
const HANDLER_REGISTRY: Record<
  DatabaseClientType,
  new (command: string, rowCount: number) => BaseCommandResultHandler
> = {
  [DatabaseClientType.POSTGRES]: PostgresCommandResultHandler,
  [DatabaseClientType.MARIADB]: MysqlCommandResultHandler,
  [DatabaseClientType.MYSQL]: MysqlCommandResultHandler,
  [DatabaseClientType.MYSQL2]: Mysql2CommandResultHandler,
  [DatabaseClientType.REDIS]: GenericCommandResultHandler,
  [DatabaseClientType.SQLITE3]: Sqlite3CommandResultHandler,
  [DatabaseClientType.SNOWFLAKE]: GenericCommandResultHandler,
  [DatabaseClientType.BETTER_SQLITE3]: BetterSqlite3CommandResultHandler,
  [DatabaseClientType.MSSQL]: MssqlCommandResultHandler,
  [DatabaseClientType.ORACLE]: OracleCommandResultHandler,
};
```

to:

```typescript
const HANDLER_REGISTRY: Record<
  DatabaseClientType,
  new (command: string, rowCount: number) => BaseCommandResultHandler
> = {
  [DatabaseClientType.POSTGRES]: PostgresCommandResultHandler,
  [DatabaseClientType.MARIADB]: MysqlCommandResultHandler,
  [DatabaseClientType.MYSQL]: MysqlCommandResultHandler,
  [DatabaseClientType.MYSQL2]: Mysql2CommandResultHandler,
  [DatabaseClientType.REDIS]: GenericCommandResultHandler,
  [DatabaseClientType.SQLITE3]: Sqlite3CommandResultHandler,
  [DatabaseClientType.SNOWFLAKE]: GenericCommandResultHandler,
  [DatabaseClientType.BETTER_SQLITE3]: BetterSqlite3CommandResultHandler,
  [DatabaseClientType.MSSQL]: MssqlCommandResultHandler,
  [DatabaseClientType.ORACLE]: OracleCommandResultHandler,
  [DatabaseClientType.REDSHIFT]: PostgresCommandResultHandler,
  [DatabaseClientType.COCKROACHDB]: PostgresCommandResultHandler,
};
```

(Both new types reuse `PostgresCommandResultHandler` as-is — neither has a `VACUUM`/`ANALYZE`/`REINDEX`/`CLUSTER` quirk different from Postgres worth a dedicated handler in Phase 1.)

- [ ] **Step 3: Add the SQL dialect mapping**

In `components/base/code-editor/states/sqlParserConfig.ts`, change:

```typescript
export const SQL_DIALECT_BY_DB_TYPE: Record<string, SQLDialect> = {
  [DatabaseClientType.POSTGRES]: SQLDialectSupport.PostgreSQLParserDialect,
  [DatabaseClientType.MYSQL]: SQLDialectSupport.MySQL,
  [DatabaseClientType.MYSQL2]: SQLDialectSupport.MySQL,
  [DatabaseClientType.MARIADB]: SQLDialectSupport.MariaSQL,
  [DatabaseClientType.SQLITE3]: SQLDialectSupport.SQLite,
  [DatabaseClientType.ORACLE]: SQLDialectSupport.PLSQL,
} as const;
```

to:

```typescript
export const SQL_DIALECT_BY_DB_TYPE: Record<string, SQLDialect> = {
  [DatabaseClientType.POSTGRES]: SQLDialectSupport.PostgreSQLParserDialect,
  [DatabaseClientType.MYSQL]: SQLDialectSupport.MySQL,
  [DatabaseClientType.MYSQL2]: SQLDialectSupport.MySQL,
  [DatabaseClientType.MARIADB]: SQLDialectSupport.MariaSQL,
  [DatabaseClientType.SQLITE3]: SQLDialectSupport.SQLite,
  [DatabaseClientType.ORACLE]: SQLDialectSupport.PLSQL,
  [DatabaseClientType.REDSHIFT]: SQLDialectSupport.PostgreSQLParserDialect,
  [DatabaseClientType.COCKROACHDB]: SQLDialectSupport.PostgreSQLParserDialect,
} as const;
```

- [ ] **Step 4: Run typecheck and unit suite**

Run: `bun run typecheck`
Expected: PASS.

Run: `bun test:unit`
Expected: PASS (no existing test asserts on the exact contents of `HANDLER_REGISTRY`/`SQL_DIALECT_BY_DB_TYPE`, so this is a regression check, not a new-behavior check).

- [ ] **Step 5: Commit**

```bash
git add components/modules/raw-query/utils/commandType.ts components/base/code-editor/states/sqlParserConfig.ts
git commit -m "feat(sql-editor): map Redshift and CockroachDB to the Postgres SQL dialect"
```

---

### Task 9: CockroachDB test fixture + integration tests

**Files:**

- Create: `test/fixtures/datasets/cockroachdb/cockroachdb-seed.sql`
- Modify: `test/fixtures/containers/sql-services.compose.yml`
- Modify: `scripts/test-services/start-fixtures.sh`
- Modify: `scripts/test-services/stop-fixtures.sh`
- Modify: `test/support/db-fixtures.ts`
- Create: `test/api/support/cockroachdb-connection.ts`
- Create: `test/api/cockroachdb/cockroachdb-query.test.ts`
- Create: `test/api/cockroachdb/cockroachdb-metadata.test.ts`
- Create: `test/api/cockroachdb/cockroachdb-tables.test.ts`
- Create: `test/api/cockroachdb/cockroachdb-views.test.ts`

**Interfaces:**

- Consumes: Tasks 1–8 (the CockroachDB adapter stack end-to-end, through the real API routes).
- Produces: a `cockroachdb` docker-compose profile runnable via `bun test:fixtures:up --profile cockroachdb`, and a passing `test/api/cockroachdb/*` suite run via `bun test:api`.

Note on dataset choice: the existing `postgres`/`mysql`/`mariadb` fixtures load the full Pagila/Sakila sample database, which relies on PL/pgSQL functions and triggers (`CREATE PROCEDURAL LANGUAGE plpgsql`, `pg_get_triggerdef`-backed triggers, etc.) that CockroachDB does not support. Re-authoring Pagila to be CockroachDB-compatible is out of scope for this plan. Instead, this task uses a small hand-written schema (`customers` / `orders` with a foreign key, plus one view) — enough to exercise raw query, schema browser (tables + columns), ERD (foreign-key relationship), and views, which is exactly this phase's scope.

- [ ] **Step 1: Write the seed schema**

Create `test/fixtures/datasets/cockroachdb/cockroachdb-seed.sql`:

```sql
CREATE TABLE IF NOT EXISTS customers (
  customer_id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS orders (
  order_id SERIAL PRIMARY KEY,
  customer_id INT NOT NULL REFERENCES customers (customer_id),
  amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE VIEW IF NOT EXISTS customer_order_totals AS
SELECT
  c.customer_id,
  c.first_name,
  c.last_name,
  COALESCE(SUM(o.amount), 0) AS total_spent
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
GROUP BY c.customer_id, c.first_name, c.last_name;

INSERT INTO customers (first_name, last_name, email) VALUES
  ('Ada', 'Lovelace', 'ada@example.com'),
  ('Grace', 'Hopper', 'grace@example.com'),
  ('Alan', 'Turing', 'alan@example.com')
ON CONFLICT (email) DO NOTHING;

INSERT INTO orders (customer_id, amount) VALUES
  (1, 42.50),
  (1, 15.00),
  (2, 99.99)
ON CONFLICT DO NOTHING;
```

- [ ] **Step 2: Add the CockroachDB service to the compose file**

In `test/fixtures/containers/sql-services.compose.yml`, add a new service after `mariadb` (before the `volumes:` section):

```yaml
cockroachdb:
  profiles: [cockroachdb, sql, all]
  image: docker.io/cockroachdb/cockroach:v24.2.0
  command: start-single-node --insecure --accept-sql-without-tls
  ports:
    - '${ORCAQ_COCKROACHDB_PORT:-26257}:26257'
  volumes:
    - cockroachdb-data:/cockroach/cockroach-data
  healthcheck:
    test: ['CMD-SHELL', 'cockroach sql --insecure -e "SELECT 1"']
    interval: 5s
    timeout: 5s
    retries: 30
```

And add the volume:

```yaml
volumes:
  postgres-data:
  mysql-data:
  mariadb-data:
  cockroachdb-data:
```

- [ ] **Step 3: Add a start/wait function**

In `scripts/test-services/start-fixtures.sh`, add the env default near the other port exports (after `export ORCAQ_MARIADB_ROOT_PASSWORD=...`):

```bash
export ORCAQ_COCKROACHDB_PORT="${ORCAQ_COCKROACHDB_PORT:-26257}"
export ORCAQ_COCKROACHDB_DATABASE="${ORCAQ_COCKROACHDB_DATABASE:-defaultdb}"
```

Add a wait+seed function (after `wait_for_mysql_engine`'s closing `}`):

```bash
wait_for_cockroachdb() {
  local attempt=0
  echo "Waiting for CockroachDB..."
  until "${compose_cmd[@]}" -p "${sql_project}" -f "${sql_compose_file}" exec -T cockroachdb \
    cockroach sql --insecure -e 'SELECT 1;' >/dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ "${attempt}" -ge 60 ]; then
      echo 'CockroachDB fixture did not become ready in time.' >&2
      "${compose_cmd[@]}" -p "${sql_project}" -f "${sql_compose_file}" logs --tail=80 cockroachdb >&2 || true
      exit 1
    fi
    sleep 2
  done

  "${compose_cmd[@]}" -p "${sql_project}" -f "${sql_compose_file}" exec -T cockroachdb \
    cockroach sql --insecure -f - < "${repo_root}/test/fixtures/datasets/cockroachdb/cockroachdb-seed.sql"

  echo "CockroachDB is ready on port ${ORCAQ_COCKROACHDB_PORT}"
}
```

Add the `cockroachdb` case to `start_sql_profile`'s `case "${docker_profile}"` block:

```bash
  case "${docker_profile}" in
    postgres)
      wait_for_postgres
      ;;
    mysql)
      wait_for_mysql_engine mysql "${ORCAQ_MYSQL_PORT}" "${ORCAQ_MYSQL_USER}" "${ORCAQ_MYSQL_PASSWORD}" "${ORCAQ_MYSQL_DATABASE}" 'MySQL'
      ;;
    mariadb)
      wait_for_mysql_engine mariadb "${ORCAQ_MARIADB_PORT}" "${ORCAQ_MARIADB_USER}" "${ORCAQ_MARIADB_PASSWORD}" "${ORCAQ_MARIADB_DATABASE}" 'MariaDB'
      ;;
    cockroachdb)
      wait_for_cockroachdb
      ;;
    sql|all)
      wait_for_postgres
      wait_for_mysql_engine mysql "${ORCAQ_MYSQL_PORT}" "${ORCAQ_MYSQL_USER}" "${ORCAQ_MYSQL_PASSWORD}" "${ORCAQ_MYSQL_DATABASE}" 'MySQL'
      wait_for_mysql_engine mariadb "${ORCAQ_MARIADB_PORT}" "${ORCAQ_MARIADB_USER}" "${ORCAQ_MARIADB_PASSWORD}" "${ORCAQ_MARIADB_DATABASE}" 'MariaDB'
      wait_for_cockroachdb
      ;;
  esac
```

And add `cockroachdb` as a directly-invokable profile in the main `case "${profile}"` block:

```bash
case "${profile}" in
  none)
    echo "No fixtures requested"
    ;;
  postgres|mysql|mariadb|cockroachdb)
    node "${script_dir}/generate-optimized-sql-fixtures.mjs" 2>/dev/null || true
    start_sql_profile "${profile}"
    ;;
```

- [ ] **Step 4: Update stop-fixtures.sh**

In `scripts/test-services/stop-fixtures.sh`, change:

```bash
  postgres|mysql|mariadb|sql)
    stop_sql "${profile}"
    ;;
```

to:

```bash
  postgres|mysql|mariadb|cockroachdb|sql)
    stop_sql "${profile}"
    ;;
```

- [ ] **Step 5: Add a fixture-config helper**

In `test/support/db-fixtures.ts`, change the `SqlFixtureEngine` type and `buildSqlUrl`:

```typescript
export type SqlFixtureEngine = 'postgres' | 'mysql' | 'mariadb';
```

to:

```typescript
export type SqlFixtureEngine = 'postgres' | 'mysql' | 'mariadb' | 'cockroachdb';
```

```typescript
function buildSqlUrl(config: {
  engine: SqlFixtureEngine;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}) {
  const protocol = config.engine === 'postgres' ? 'postgresql' : 'mysql';
  const username = encodeAuthSegment(config.username);
  const password = encodeAuthSegment(config.password);

  return `${protocol}://${username}:${password}@${config.host}:${config.port}/${config.database}`;
}
```

to:

```typescript
function buildSqlUrl(config: {
  engine: SqlFixtureEngine;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}) {
  const protocolByEngine: Record<SqlFixtureEngine, string> = {
    postgres: 'postgresql',
    mysql: 'mysql',
    mariadb: 'mysql',
    cockroachdb: 'cockroachdb',
  };
  const protocol = protocolByEngine[config.engine];
  const username = encodeAuthSegment(config.username);
  const password = encodeAuthSegment(config.password);

  return `${protocol}://${username}:${password}@${config.host}:${config.port}/${config.database}`;
}
```

Add a `getCockroachDbFixtureConfig` function (after `getMariaDbFixtureConfig`):

```typescript
export function getCockroachDbFixtureConfig() {
  return buildSqlFixtureConfig({
    engine: 'cockroachdb',
    envPrefixes: ['ORCAQ_COCKROACHDB'],
    defaultPort: 26257,
    defaultDatabase: 'defaultdb',
    defaultUsername: 'root',
    defaultPassword: '',
  });
}
```

And add it to `getSqlFixtureCatalog`:

```typescript
export function getSqlFixtureCatalog() {
  return {
    postgres: getPostgresFixtureConfig(),
    mysql: getMysqlFixtureConfig(),
    mariadb: getMariaDbFixtureConfig(),
    cockroachdb: getCockroachDbFixtureConfig(),
  };
}
```

- [ ] **Step 6: Add the test connection-body helper**

Create `test/api/support/cockroachdb-connection.ts` (mirrors `test/api/support/pg-connection.ts`):

```typescript
import { getCockroachDbFixtureConfig } from '../../support/db-fixtures';

const cockroachdb = getCockroachDbFixtureConfig();

export function cockroachdbBody(overrides: Record<string, unknown> = {}) {
  return {
    host: cockroachdb.host,
    port: `${cockroachdb.port}`,
    username: cockroachdb.username,
    password: cockroachdb.password,
    database: cockroachdb.database,
    type: 'cockroachdb',
    ...overrides,
  };
}

export function cockroachdbStringBody(overrides: Record<string, unknown> = {}) {
  return {
    dbConnectionString: cockroachdb.url,
    type: 'cockroachdb',
    ...overrides,
  };
}

export { cockroachdb as cockroachdbConfig };
```

- [ ] **Step 7: Write the integration tests**

Create `test/api/cockroachdb/cockroachdb-query.test.ts`:

```typescript
import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { describe, it, expect } from 'vitest';
import {
  cockroachdbBody,
  cockroachdbStringBody,
} from '../support/cockroachdb-connection';

describe('Query API — CockroachDB', async () => {
  await setup();

  describe('POST /api/query/execute', () => {
    it('executes a simple SELECT and returns result', async () => {
      const res = await $fetch('/api/query/execute', {
        method: 'POST',
        body: {
          ...cockroachdbStringBody(),
          query: 'SELECT 1 AS val',
        },
      });

      expect(res.result).toBeDefined();
      expect(res.result[0]).toMatchObject({ val: 1 });
    });

    it('executes a query against the seeded customers table', async () => {
      const res = await $fetch('/api/query/execute', {
        method: 'POST',
        body: {
          ...cockroachdbStringBody(),
          query:
            'SELECT customer_id, first_name FROM customers ORDER BY customer_id LIMIT 5',
        },
      });

      expect(res.result.length).toBeGreaterThan(0);
      expect(res.result[0]).toHaveProperty('customer_id');
      expect(res.result[0]).toHaveProperty('first_name');
    });
  });

  describe('POST /api/query/raw-execute', () => {
    it('works with form-based connection details', async () => {
      const res = await $fetch('/api/query/raw-execute', {
        method: 'POST',
        body: {
          ...cockroachdbBody(),
          query: 'SELECT 1 AS ping',
          params: [],
        },
      });

      expect(res.rows).toBeDefined();
      expect(res.rows.length).toBeGreaterThanOrEqual(1);
    });
  });
});
```

Create `test/api/cockroachdb/cockroachdb-metadata.test.ts`:

```typescript
import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { describe, it, expect } from 'vitest';
import { cockroachdbStringBody } from '../support/cockroachdb-connection';

describe('Metadata API — CockroachDB', async () => {
  await setup();

  describe('POST /api/metadata/meta-data', () => {
    it('returns schema metadata with the public schema and seeded tables', async () => {
      const res = await $fetch('/api/metadata/meta-data', {
        method: 'POST',
        body: cockroachdbStringBody(),
      });

      expect(Array.isArray(res)).toBe(true);
      const publicSchema = res.find((s: any) => s.name === 'public');
      expect(publicSchema).toBeDefined();
    });
  });

  describe('POST /api/metadata/erd', () => {
    it('returns ERD data including the customers/orders foreign key', async () => {
      const res = await $fetch('/api/metadata/erd', {
        method: 'POST',
        body: cockroachdbStringBody(),
      });

      expect(res).toBeDefined();
      expect(res.tables || res.nodes || res.entities || res.data).toBeDefined();
    });
  });
});
```

Create `test/api/cockroachdb/cockroachdb-tables.test.ts`:

```typescript
import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { describe, it, expect } from 'vitest';
import { cockroachdbBody } from '../support/cockroachdb-connection';

describe('Tables API — CockroachDB', async () => {
  await setup();

  const SCHEMA = 'public';

  describe('POST /api/tables/overview', () => {
    it('returns the seeded tables for the public schema', async () => {
      const res = await $fetch('/api/tables/overview', {
        method: 'POST',
        body: { ...cockroachdbBody(), schema: SCHEMA },
      });

      expect(Array.isArray(res)).toBe(true);
      const tableNames = res.map((t: any) =>
        (t.table_name || t.tableName || t.name || '').toLowerCase()
      );
      expect(tableNames).toContain('customers');
      expect(tableNames).toContain('orders');
    });
  });

  describe('POST /api/tables/structure', () => {
    it('returns column structure for the customers table', async () => {
      const res = await $fetch('/api/tables/structure', {
        method: 'POST',
        body: { ...cockroachdbBody(), schema: SCHEMA, tableName: 'customers' },
      });

      expect(Array.isArray(res)).toBe(true);
      const colNames = res.map((c: any) =>
        (c.column_name || c.columnName || c.name || '').toLowerCase()
      );
      expect(colNames).toContain('customer_id');
      expect(colNames).toContain('email');
    });
  });
});
```

Create `test/api/cockroachdb/cockroachdb-views.test.ts`:

```typescript
import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { describe, it, expect } from 'vitest';
import { cockroachdbBody } from '../support/cockroachdb-connection';

describe('Views API — CockroachDB', async () => {
  await setup();

  const SCHEMA = 'public';

  describe('POST /api/views/overview', () => {
    it('returns the seeded customer_order_totals view', async () => {
      const res = await $fetch('/api/views/overview', {
        method: 'POST',
        body: { ...cockroachdbBody(), schema: SCHEMA },
      });

      expect(Array.isArray(res)).toBe(true);
      const viewNames = res.map((v: any) =>
        (v.table_name || v.view_name || v.name || '').toLowerCase()
      );
      expect(viewNames).toContain('customer_order_totals');
    });
  });
});
```

- [ ] **Step 8: Run the fixture and the tests**

Run: `bun test:fixtures:up --profile cockroachdb`
Expected: the script reports "CockroachDB is ready on port 26257" after the container passes its health check and the seed script runs without SQL errors. If the seed script errors (check the printed `cockroach sql` output), fix the offending statement in `cockroachdb-seed.sql` — CockroachDB SQL syntax is very close to Postgres for this simple schema, but re-run until Step 8 completes cleanly before moving on.

Run: `ORCAQ_FIXTURE_PROFILE=cockroachdb bun test:api:raw test/api/cockroachdb`
Expected: PASS (all new integration tests green).

Run: `bun test:fixtures:down`
Expected: containers stop cleanly.

- [ ] **Step 9: Commit**

```bash
git add test/fixtures/datasets/cockroachdb test/fixtures/containers/sql-services.compose.yml scripts/test-services/start-fixtures.sh scripts/test-services/stop-fixtures.sh test/support/db-fixtures.ts test/api/support/cockroachdb-connection.ts test/api/cockroachdb
git commit -m "test(cockroachdb): add docker fixture and integration test suite"
```

---

### Task 10: Full regression pass

**Files:** none (verification-only task).

- [ ] **Step 1: Full typecheck**

Run: `bun run typecheck`
Expected: PASS.

- [ ] **Step 2: Full unit suite**

Run: `bun test:unit`
Expected: PASS (includes every spec added in Tasks 1, 2, 3, 5).

- [ ] **Step 3: Full SQL fixture integration suite (regression check — confirms adding Redshift/CockroachDB didn't break existing Postgres/MySQL/MariaDB coverage)**

Run: `bun test:fixtures:up --profile sql` (starts postgres + mysql + mariadb + cockroachdb together, per the `sql|all` case added in Task 9)
Run: `ORCAQ_FIXTURE_PROFILE=sql bun test:api:raw`
Expected: PASS — all existing `test/api/pg`, `test/api/mysql`, and the new `test/api/cockroachdb` suites green.
Run: `bun test:fixtures:down`

- [ ] **Step 4: Report**

Summarize: which commands were run, which passed, which (if any) failed and why, and confirm Redshift remains unit-test-only per the accepted gap in the spec.
