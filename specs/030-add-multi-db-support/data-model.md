# Data Model: Expanded Database Type Support

**Feature**: 030-add-multi-db-support  
**Generated**: 2026-04-22  
**Research**: [research.md](./research.md)

---

## 1. Primary Entities

### 1.1 `DatabaseTypeOption`

Represents a user-selectable database engine in the connection picker.

| Field                  | Type                      | Notes                                                                |
| ---------------------- | ------------------------- | -------------------------------------------------------------------- |
| `type`                 | `DatabaseClientType`      | `postgres`, `mysql`, `mariadb`, `sqlite3`, `oracledb`                |
| `label`                | `string`                  | User-facing name shown in the picker                                 |
| `defaultPort`          | `number \| null`          | `null` for SQLite file connections                                   |
| `icon`                 | `string`                  | UI icon reference                                                    |
| `platformAvailability` | `'all' \| 'desktop-only'` | SQLite is `desktop-only`; others are `all`                           |
| `isSelectable`         | `boolean`                 | Replaces the current “visible but unsupported” model for these types |

**Validation rules**:

- `sqlite3` MUST be marked `desktop-only`.
- `mariadb` MUST remain distinguishable from `mysql` in user-visible metadata, even if they share runtime behavior.

### 1.2 `ConnectionProfile`

Represents a saved database connection entry that users can create, test, save, reopen, edit, and delete.

```ts
type ConnectionProfile = {
  id: string;
  workspaceId: string;
  name: string;
  type: DatabaseClientType;
  method: 'string' | 'form' | 'file';
  connectionString?: string;
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  database?: string; // Postgres/MySQL/MariaDB database name
  serviceName?: string; // Oracle structured form only
  filePath?: string; // Desktop SQLite only
  ssl?: ISSLConfig;
  ssh?: ISSHConfig;
  tagIds?: string[];
  createdAt: string;
  updatedAt?: string;
};
```

**Relationships**:

- One `Workspace` has many `ConnectionProfile` records.
- One `ConnectionProfile` resolves to one `DatabaseTypeOption`.
- One `ConnectionProfile` can produce one runtime-derived `ConnectionCapability` snapshot.

**Validation rules by method**:

| Type       | Method   | Required fields                                       |
| ---------- | -------- | ----------------------------------------------------- |
| `postgres` | `string` | `connectionString`                                    |
| `postgres` | `form`   | `host`, `port`, `username`, `database`                |
| `mysql`    | `string` | `connectionString`                                    |
| `mysql`    | `form`   | `host`, `port`, `username`, `database`                |
| `mariadb`  | `string` | `connectionString`                                    |
| `mariadb`  | `form`   | `host`, `port`, `username`, `database`                |
| `oracledb` | `string` | `connectionString`                                    |
| `oracledb` | `form`   | `host`, `port`, `username`, `password`, `serviceName` |
| `sqlite3`  | `file`   | `filePath`                                            |

**Additional rules**:

- `method = 'file'` is only valid when `type = sqlite3`.
- `filePath` MUST be absent for non-SQLite connection types.
- `serviceName` MUST be absent for non-Oracle connection types.
- `ssh` and `ssl` are valid only for TCP-based connection types; they do not apply to SQLite file connections.

### 1.3 `SQLiteFileSource`

Represents the runtime state of a desktop SQLite file selection.

| Field        | Type                                                     | Notes                                              |
| ------------ | -------------------------------------------------------- | -------------------------------------------------- |
| `filePath`   | `string`                                                 | Absolute path returned by the Electron file-picker |
| `exists`     | `boolean`                                                | Derived during open/test flow                      |
| `isReadable` | `boolean`                                                | Derived during open/test flow                      |
| `status`     | `'selected' \| 'missing' \| 'unreadable' \| 'connected'` | Runtime status only                                |

**Validation rules**:

- This entity is runtime-derived from `ConnectionProfile.filePath`; it is not persisted as a separate record.
- Non-desktop runtimes must never create this entity.

### 1.4 `ConnectionCapability`

Represents which workflows are available for a connected source.

| Field                 | Type                 | Notes                                         |
| --------------------- | -------------------- | --------------------------------------------- |
| `dbType`              | `DatabaseClientType` | Connection type                               |
| `canHealthCheck`      | `boolean`            | Connection can be validated                   |
| `canRunRawQuery`      | `boolean`            | Raw query and streaming execution supported   |
| `canBrowseStructures` | `boolean`            | Minimum metadata/tables browsing supported    |
| `canUseQuickQuery`    | `boolean`            | Quick Query availability                      |
| `canManageRoles`      | `boolean`            | Roles/permissions availability                |
| `canViewMetrics`      | `boolean`            | Metrics/instance insights availability        |
| `canImportExport`     | `boolean`            | Database import/export availability           |
| `unsupportedReason?`  | `string`             | User-visible reason when a feature is blocked |

**Rules**:

- In the first release, `canHealthCheck`, `canRunRawQuery`, and `canBrowseStructures` are the required baseline for newly supported types.
- Unsupported advanced capabilities MUST expose a reason instead of silently returning Postgres-biased behavior.

---

## 2. State Transitions

### 2.1 Connection Creation Flow

```text
draft
  -> type selected
  -> method selected
  -> credentials or file path entered
  -> test requested
  -> test-success | test-error
  -> saved
  -> reopened
  -> active | open-failed
```

### 2.2 SQLite File Availability Flow

```text
no-file
  -> file selected
  -> selected
  -> connected | missing | unreadable
```

### 2.3 Capability Evaluation Flow

```text
connection opened
  -> capability resolved
  -> supported feature path
  -> unsupported feature banner / 501 response
```

---

## 3. Persistence Impact

### 3.1 Shared Connection Persistence

The existing persisted connection shape in browser storage and Electron SQLite app storage must expand to preserve the new fields without breaking old records.

**New persisted fields**:

- `serviceName?: string`
- `filePath?: string`

**Backward compatibility rules**:

- Existing saved Postgres/MySQL records without these fields remain valid.
- Old records deserialize with both fields undefined.
- Persistence layers must continue to preserve `ssl`, `ssh`, and `tagIds` JSON fields unchanged.

### 3.2 Connection Method Expansion

The connection method enum must expand from:

```ts
'string' | 'form';
```

to:

```ts
'string' | 'form' | 'file';
```

This affects form validation, health-check payload construction, saved connection editing, and storage serialization.

---

## 4. Derived Payload Shapes

### 4.1 Health Check Request

```ts
type ConnectionHealthCheckRequest =
  | {
      type: 'postgres' | 'mysql' | 'mariadb' | 'oracledb';
      method: 'string';
      stringConnection: string;
    }
  | {
      type: 'postgres' | 'mysql' | 'mariadb';
      method: 'form';
      host: string;
      port: string;
      username: string;
      password?: string;
      database: string;
      ssl?: ISSLConfig;
      ssh?: ISSHConfig;
    }
  | {
      type: 'oracledb';
      method: 'form';
      host: string;
      port: string;
      username: string;
      password: string;
      serviceName: string;
      ssl?: ISSLConfig;
      ssh?: ISSHConfig;
    }
  | {
      type: 'sqlite3';
      method: 'file';
      filePath: string;
    };
```

### 4.2 Runtime Adapter Cache Key Inputs

| Type       | Key inputs                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------- |
| `postgres` | normalized connection string or `user@host:port/database`                                   |
| `mysql`    | normalized connection string or `user@host:port/database`                                   |
| `mariadb`  | normalized connection string or `user@host:port/database`, but preserved under MariaDB type |
| `oracledb` | normalized connection string or `user@host:port/serviceName`                                |
| `sqlite3`  | absolute `filePath`                                                                         |

---

## 5. Minimum Capability Matrix for Release

| Database type       | Connect/Test | Save/Reopen | Raw Query | Structure Browsing | Advanced admin features                    |
| ------------------- | ------------ | ----------- | --------- | ------------------ | ------------------------------------------ |
| Postgres            | Yes          | Yes         | Yes       | Yes                | Existing behavior                          |
| MySQL               | Yes          | Yes         | Yes       | Yes                | Explicit unsupported unless adapter exists |
| MariaDB             | Yes          | Yes         | Yes       | Yes                | Explicit unsupported unless adapter exists |
| SQLite desktop file | Yes          | Yes         | Yes       | Yes                | Explicit unsupported unless adapter exists |
| Oracle              | Yes          | Yes         | Yes       | Yes (minimum)      | Explicit unsupported unless adapter exists |
