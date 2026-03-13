# View Types Support Specification

**Module:** Quick Query → View Detail  
**Database:** PostgreSQL  
**Scope:** View-Only (No DDL Mutation)  
**Version:** 1.0

---

# 1. Purpose

Currently, Normal Views and Materialized Views are handled as a single unified type in the system.

This document defines:

- Clear separation between Normal View and Materialized View
- Supported metadata for each type
- UI differences
- Backend query requirements
- Future extension capability

---

# 2. View Type Classification

PostgreSQL internally distinguishes object types via `pg_class.relkind`.

| relkind | Type |
|----------|------|
| v | Normal View |
| m | Materialized View |

The system must detect view type at runtime and render appropriate UI.

Query:

```sql
SELECT relkind
FROM pg_class
WHERE relname = $1
AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = $2);
```

---

# 3. Normal View – Supported Capabilities

## 3.1 Overview

A Normal View:

- Is a stored SELECT query
- Does not store data
- Executes underlying query on every access

---

## 3.2 Metadata Support

The system must display:

### A. Basic Information

- View name
- Schema
- Owner
- Is Updatable
- Security Barrier

Query (information_schema):

```sql
SELECT
  table_name,
  is_updatable
FROM information_schema.views
WHERE table_schema = $1
AND table_name = $2;
```

---

### B. View Definition

```sql
SELECT pg_get_viewdef('schema.view_name'::regclass, true);
```

UI Requirements:

- Syntax highlighted SQL
- Copy to clipboard
- Expandable panel

---

### C. Column Structure

Display:

- Column name
- Data type
- Nullable
- Default (if any)

Query:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = $1
AND table_name = $2;
```

---

### D. Dependencies (Upstream)

Objects referenced by the view:

```sql
SELECT
  d.refobjid::regclass AS depends_on
FROM pg_depend d
JOIN pg_rewrite r ON d.objid = r.oid
WHERE r.ev_class = 'schema.view_name'::regclass;
```

Display as list:

- Tables
- Other views
- Functions

---

### E. Reverse Dependencies (Downstream)

Objects that depend on this view.

Display as list to indicate impact risk.

---

### F. Explain Plan Preview

Allow preview execution plan:

```sql
EXPLAIN SELECT * FROM schema.view_name;
```

UI:

- Tree layout
- Raw text fallback

---

# 4. Materialized View – Supported Capabilities

## 4.1 Overview

A Materialized View:

- Stores physical data
- Requires manual refresh
- Can have indexes
- Can have size metrics

---

## 4.2 Metadata Support

### A. Basic Information

- View name
- Schema
- Owner
- Is Populated
- Size on disk

Query:

```sql
SELECT
  relname,
  relispopulated,
  pg_size_pretty(pg_total_relation_size(oid)) AS total_size
FROM pg_class
WHERE relkind = 'm'
AND relname = $1;
```

---

### B. View Definition

Same as normal view:

```sql
SELECT pg_get_viewdef('schema.view_name'::regclass, true);
```

---

### C. Column Structure

Same approach as normal view using information_schema.columns.

---

### D. Index Support

Materialized views may have indexes.

System must reuse existing Index View logic:

```
POST /api/get-table-indexes
```

UI must show Indexes tab for Materialized View only.

Normal Views must not show Indexes tab.

---

### E. Refresh Status (View Only)

Display:

- Is populated
- Last refresh time (if available via audit/log table)

Note: PostgreSQL does not natively store last refresh timestamp.

---

### F. Row Count

```sql
SELECT reltuples::bigint AS estimated_rows
FROM pg_class
WHERE relname = $1;
```

Display as approximate row count.

---

### G. Storage Metrics

Show:

- Total size
- Table size
- Index size

```sql
SELECT
  pg_size_pretty(pg_relation_size($1)),
  pg_size_pretty(pg_indexes_size($1)),
  pg_size_pretty(pg_total_relation_size($1));
```

---

# 5. UI Differences Summary

| Feature | Normal View | Materialized View |
|----------|--------------|------------------|
| Definition | ✅ | ✅ |
| Structure | ✅ | ✅ |
| Dependencies | ✅ | ✅ |
| Explain Plan | ✅ | ✅ |
| Indexes | ❌ | ✅ |
| Storage Size | ❌ | ✅ |
| Row Count | ❌ | ✅ |
| Populated Status | ❌ | ✅ |

---

# 6. UI Layout Proposal

## Normal View

```
[Definition]
[Structure]
[Dependencies]
[Performance]
```

## Materialized View

```
[Definition]
[Structure]
[Indexes]
[Dependencies]
[Performance]
[Storage]
```

---

# 7. Store Design

Extend SchemaStore:

```ts
viewMetaMap: Record<string, ViewMeta>
```

```ts
interface ViewMeta {
  type: 'normal' | 'materialized'
  isUpdatable?: boolean
  securityBarrier?: boolean
  isPopulated?: boolean
  totalSize?: string
  rowEstimate?: number
}
```

Key format:

```
${schema}.${viewName}
```

---

# 8. Lazy Loading Strategy

- Load basic type on View Detail open
- Load metadata per tab
- Cache per session
- Do not preload all views on DB connect

---

# 9. Non-Functional Requirements

- Must support large enterprise databases
- Must not block UI thread
- Must support syntax highlighting
- Must handle permission errors gracefully

---

# 10. Future Enhancements (Out of Scope)

- Refresh Materialized View
- Drop View
- Edit Definition
- Dependency graph visualization
- Automatic performance recommendations

---

End of Document.

