# Table Advanced Objects – View Feature Documentation

**Module:** Quick Query → Table Detail  
**Scope:** View Only (No Create / Update / Delete)  
**Database:** PostgreSQL  
**Version:** 1.0

---

# 1. Overview

This document defines the specification for extending the existing **Table Structure** feature to support viewing additional advanced database objects:

- Indexes
- RLS (Row Level Security) Policies
- Rules
- Triggers

This phase supports **read-only (view-only)** capabilities.

No DDL execution, mutation, or Safe Mode confirmation is included in this version.

---

# 2. Feature Goals

When a user opens a table detail page, they should be able to:

- View all indexes of the table
- View RLS configuration and policies
- View table rewrite rules
- View triggers attached to the table
- View full generated SQL definition for each object

The system must:

- Load data lazily (only when tab is opened)
- Avoid performance impact during initial DB connection
- Keep UI consistent with existing Structure tab design

---

# 3. Navigation & UI Placement

Route:

```
/[workspaceId]/[connectionId]/quick-query/table-detail/[schemaName]/[tableName]
```

Add new tabs inside Table Detail:

```
[Columns]
[Constraints]
[Indexes]
[RLS]
[Rules]
[Triggers]
[DDL]
```

Each tab:

- Contains a data table view
- Supports expandable row for full SQL definition
- Supports copy-to-clipboard for definition

---

# 4. Indexes (View Only)

## 4.1 Business Purpose

Allow users to inspect:

- Index name
- Index method (btree, hash, gin, gist, etc.)
- Whether index is UNIQUE
- Whether index is PRIMARY KEY
- Index definition SQL

---

## 4.2 API

Endpoint:

```
POST /api/get-table-indexes
```

Request Body:

```json
{
  "schema": "public",
  "table": "users"
}
```

---

## 4.3 Backend Query (PostgreSQL)

```sql
SELECT
  i.relname as index_name,
  ix.indisunique as is_unique,
  ix.indisprimary as is_primary,
  am.amname as method,
  pg_get_indexdef(ix.indexrelid) as definition
FROM pg_class t
JOIN pg_index ix ON t.oid = ix.indrelid
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_am am ON i.relam = am.oid
WHERE t.relname = $1;
```

---

## 4.4 Frontend Data Model

```ts
interface TableIndex {
  indexName: string
  isUnique: boolean
  isPrimary: boolean
  method: string
  definition: string
}
```

---

## 4.5 UI Columns

| Column | Description |
|--------|-------------|
| Name | Index name |
| Method | btree / gin / gist / hash |
| Unique | Boolean badge |
| Primary | Boolean badge |
| Actions | Copy definition |

Expandable row shows full SQL definition.

---

# 5. RLS (Row Level Security) – View Only

## 5.1 Business Purpose

Allow users to inspect:

- Whether RLS is enabled for the table
- All defined policies
- Policy command (SELECT / INSERT / UPDATE / DELETE / ALL)
- Roles applied
- USING expression
- WITH CHECK expression

---

## 5.2 APIs

### Get RLS Status

```
POST /api/get-table-rls-status
```

### Get Policies

```
POST /api/get-table-rls
```

---

## 5.3 Backend Queries

### Check RLS Enabled

```sql
SELECT relrowsecurity
FROM pg_class
WHERE relname = $1;
```

### Get Policies

```sql
SELECT *
FROM pg_policies
WHERE schemaname = $1
AND tablename = $2;
```

---

## 5.4 Frontend Data Model

```ts
interface RLSPolicy {
  policyName: string
  command: string
  roles: string[]
  usingExpression?: string
  withCheckExpression?: string
}
```

---

## 5.5 UI Layout

Top Section:

```
RLS Status: ENABLED / DISABLED
```

Below:

| Policy | Command | Roles | Using | With Check | Actions |

Actions: Copy policy definition.

Expandable section displays full generated policy SQL.

---

# 6. Rules (View Only)

## 6.1 Business Purpose

Allow users to inspect table rewrite rules.

Display:

- Rule name
- Event type
- Full rule definition

---

## 6.2 API

```
POST /api/get-table-rules
```

---

## 6.3 Backend Query

```sql
SELECT
  rulename,
  ev_type,
  pg_get_ruledef(r.oid) as definition
FROM pg_rewrite r
JOIN pg_class c ON r.ev_class = c.oid
WHERE c.relname = $1;
```

---

## 6.4 Frontend Data Model

```ts
interface TableRule {
  ruleName: string
  event: string
  definition: string
}
```

---

## 6.5 UI Table

| Rule Name | Event | Actions |

Expandable row shows full rule SQL definition.

---

# 7. Triggers (View Only)

## 7.1 Business Purpose

Allow users to inspect:

- Trigger name
- Timing (BEFORE / AFTER / INSTEAD OF)
- Event type (INSERT / UPDATE / DELETE)
- Linked function
- Full trigger definition

---

## 7.2 API

```
POST /api/get-table-triggers
```

---

## 7.3 Backend Query

```sql
SELECT
  tg.tgname,
  pg_get_triggerdef(tg.oid) as definition,
  tg.tgenabled
FROM pg_trigger tg
JOIN pg_class c ON tg.tgrelid = c.oid
WHERE c.relname = $1
AND NOT tg.tgisinternal;
```

---

## 7.4 Frontend Data Model

```ts
interface TableTrigger {
  triggerName: string
  enabled: boolean
  definition: string
}
```

---

## 7.5 UI Table

| Trigger Name | Enabled | Actions |

Expandable row displays full CREATE TRIGGER statement.

---

# 8. Lazy Loading Strategy

The system must:

- NOT preload these objects during DB connection
- Fetch only when user opens the corresponding tab
- Cache result in store for current session

Flow:

1. User opens Table Detail
2. User clicks "Indexes" tab
3. If not loaded → call API
4. Store result in SchemaStore map
5. Render table

---

# 9. State Management

Extend SchemaStore:

```ts
indexesMap: Record<string, TableIndex[]>
rlsMap: Record<string, RLSPolicy[]>
rulesMap: Record<string, TableRule[]>
triggersMap: Record<string, TableTrigger[]>
```

Key format:

```
${schema}.${table}
```

---

# 10. Error Handling

If API fails:

- Show inline error component
- Provide retry button
- Do not crash Table Detail page

---

# 11. Non-Functional Requirements

- Must support large enterprise schemas
- Must not block UI thread
- SQL definitions must be syntax highlighted
- Copy-to-clipboard must work reliably
- Must follow existing UI design system

---

# 12. Future Enhancements (Out of Scope)

- Create / Drop Index
- Enable / Disable Trigger
- Create RLS Policy
- Drop Rule
- Index usage statistics
- Unused index detection
- Performance recommendations

---

# 13. Completion Criteria

Feature is complete when:

- All four tabs load correctly
- Data matches PostgreSQL metadata
- Expand row shows correct SQL
- Copy definition works
- No impact to existing Table Structure feature

---

End of Document.

