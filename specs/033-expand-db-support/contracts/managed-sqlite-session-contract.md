# Contract: Managed SQLite Sessions (Cloudflare D1 and Turso)

**Feature**: 033-expand-db-support  
**Generated**: 2026-04-28  
**Data Model**: [../data-model.md](../data-model.md)

---

## Summary

This contract defines how Cloudflare D1 and Turso are represented and used inside HeraQ. Both providers are treated as managed SQLite sessions: they connect differently from local SQLite, but once connected they must route into HeraQ’s SQL-family explorer and query surfaces rather than into separate NoSQL workspaces.

---

## 1. Connection Variants

### Variant A: Cloudflare D1

```json
{
  "type": "sqlite3",
  "providerKind": "cloudflare-d1",
  "method": "managed",
  "managedSqlite": {
    "provider": "cloudflare-d1",
    "accountId": "cf-account-id",
    "databaseId": "d1-database-id",
    "apiToken": "token"
  }
}
```

### Variant B: Turso

```json
{
  "type": "sqlite3",
  "providerKind": "turso",
  "method": "managed",
  "managedSqlite": {
    "provider": "turso",
    "url": "libsql://example-db.turso.io",
    "authToken": "token",
    "branchName": "main"
  }
}
```

---

## 2. Session Routing Invariants

- D1 and Turso MUST resolve to the `sql` family.
- D1 and Turso MUST open the SQL-family activity bar and routes.
- D1 and Turso MUST NOT open Redis or MongoDB workspace modules.
- Local SQLite file selection remains a separate provider kind from D1 and Turso.

---

## 3. Runtime Transport Expectations

### Cloudflare D1

- The server runtime MUST execute SQL through a D1-specific remote transport.
- The transport MUST use provider credentials from the managed SQLite config.
- Validation failures MUST return provider-aware errors such as invalid account, database, token, or permission scope.

### Turso

- The server runtime MUST execute SQL through `@libsql/client`.
- The session MUST preserve the selected database URL and auth token.
- If a branch is specified, the session header or connection context MUST display it.
- If a saved branch is no longer available, validation/open MUST fail with an actionable message.

---

## 4. SQL Workflow Contract

Once connected, both providers MUST support the same core SQL-family entry points as other SQLite-compatible sessions where the provider allows it:

- schema browsing
- table browsing
- SQL query execution
- result inspection

Provider limitations MUST be surfaced as provider-specific unavailable states rather than by silently redirecting the user elsewhere.

---

## 5. Hidden Feature Rules

Even though D1 and Turso are part of the SQL family, not every SQL admin feature is automatically required.

### Required for first release

- connection validation
- save/reopen
- SQL-family explorer access
- query execution

### Provider-limited or optional

- backup/restore
- instance insights
- schema diff

When these are not supported, HeraQ MUST keep the session in the SQL family while showing a clear unavailable state.

---

## 6. Backward Compatibility

- Existing local SQLite connections MUST remain valid.
- Existing SQL route logic may stay intact for `type = sqlite3`, but touched flows MUST branch on `providerKind` when transport behavior differs.
- Managed SQLite state MUST not break previously saved SQLite file records.
