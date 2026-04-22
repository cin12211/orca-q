# Runtime Contract: Multi-Database Connection and Query Flow

**Feature**: 030-add-multi-db-support  
**Generated**: 2026-04-22  
**Data Model**: [../data-model.md](../data-model.md)

---

## Summary

This contract defines the minimum runtime expectations for creating, validating, reopening, and using connections for MySQL, MariaDB, Oracle, and desktop-only SQLite files. It covers the health-check request contract, the requirement to propagate database `type` through query routes, and the explicit unsupported-feature response pattern.

---

## 1. Health-Check Request Contract

**Route**: `POST /api/managment-connection/health-check`

The request body MUST include an explicit `type` and `method`.

### Supported request variants

#### Variant A — Connection string

```json
{
  "type": "mysql",
  "method": "string",
  "stringConnection": "mysql://user:pass@localhost:3306/app"
}
```

Valid `type` values for this variant:

- `postgres`
- `mysql`
- `mariadb`
- `oracledb`

#### Variant B — Structured TCP form (Postgres/MySQL/MariaDB)

```json
{
  "type": "mariadb",
  "method": "form",
  "host": "db.internal",
  "port": "3306",
  "username": "app_user",
  "password": "secret",
  "database": "inventory",
  "ssl": { "mode": "require" }
}
```

#### Variant C — Structured Oracle form

```json
{
  "type": "oracledb",
  "method": "form",
  "host": "oracle.internal",
  "port": "1521",
  "username": "app_user",
  "password": "secret",
  "serviceName": "ORCLPDB1"
}
```

#### Variant D — Desktop SQLite file

```json
{
  "type": "sqlite3",
  "method": "file",
  "filePath": "/Users/example/data/app.sqlite"
}
```

### Response contract

#### Success

```json
{
  "isConnectedSuccess": true
}
```

#### Failure

```json
{
  "isConnectedSuccess": false,
  "errorCode": "FILE_NOT_FOUND",
  "errorMessage": "Selected SQLite file could not be found."
}
```

**Requirements**:

- Failures MUST remain non-throwing at the HTTP contract level for normal validation errors.
- `errorMessage` MUST be actionable and database-type-aware.
- `errorCode` SHOULD be stable enough for UI branching where needed.

---

## 2. Query Route Invariants

These routes MUST receive an explicit `type` and MUST NOT silently default to Postgres when the client intends a different database type.

**Affected route family**:

- `/api/query/execute.post.ts`
- `/api/query/raw-execute.post.ts`
- `/api/query/raw-execute-stream.post.ts`
- Minimum metadata/tables browsing routes used by Explorer

### Request invariant

```json
{
  "type": "sqlite3",
  "connectionId": "conn_123",
  "sql": "select name from sqlite_master where type = 'table'"
}
```

**Rules**:

- `type` is mandatory for new or updated query-related client calls.
- Runtime resolution MUST choose the adapter based on `type`, not fallback defaults.
- For reopened saved connections, `type` MUST come from persisted connection metadata.

---

## 3. Minimum Capability Contract

For newly supported database types, the system MUST provide these capabilities before the type is considered supported:

| Capability                 | MySQL    | MariaDB  | SQLite desktop | Oracle   |
| -------------------------- | -------- | -------- | -------------- | -------- |
| Health check               | Required | Required | Required       | Required |
| Save/reopen connection     | Required | Required | Required       | Required |
| Raw query execution        | Required | Required | Required       | Required |
| Minimum structure browsing | Required | Required | Required       | Required |

Advanced capabilities such as roles, metrics, import/export, and instance insights are not implicitly included by support for the above baseline.

---

## 4. Unsupported Capability Contract

When a feature is not implemented for a supported connection type, the server MUST respond with an explicit unsupported signal.

### HTTP contract

**Status**: `501`

```json
{
  "statusCode": 501,
  "statusMessage": "Oracle role adapter not yet implemented",
  "dbType": "oracledb",
  "feature": "database-roles"
}
```

### UI contract

- The UI MUST surface the server message or a mapped friendly equivalent.
- The UI MUST NOT silently retry the request as Postgres.
- The UI MAY disable clearly known unsupported entry points ahead of time, but server-side unsupported responses remain the authoritative contract.

---

## 5. Backward Compatibility

- Existing saved Postgres connections without `method = 'file'`, `filePath`, or `serviceName` MUST continue to deserialize and operate unchanged.
- Existing Postgres query callers may continue to work without change, but any path touched for this feature MUST stop relying on implicit Postgres fallback.
