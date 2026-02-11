# OrcaQ API Reference

**Version:** 1.0  
**Last Updated:** February 2026

Complete reference for all Nuxt server API endpoints.

---

## Overview

All endpoints use **POST** method and accept JSON body.  
Base path: `/api/`

| Category            | Endpoints |
| ------------------- | --------- |
| Query Execution     | 4         |
| Table Operations    | 8         |
| View Operations     | 2         |
| Function Operations | 5         |
| Schema Operations   | 2         |
| Connection          | 1         |
| AI                  | 1         |
| Monitoring          | 1         |
| **Total**           | **24**    |

---

## Query Execution

### POST `/api/execute`

Execute SQL query with timing information.

**Request:**

```typescript
{
  query: string; // SQL query
  dbConnectionString: string; // PostgreSQL connection URL
}
```

**Response:**

```typescript
{
  result: Record < string, unknown > [];
  queryTime: number; // milliseconds
}
```

---

### POST `/api/raw-execute`

Execute raw SQL without formatting (for Raw Query editor).

**Request:**

```typescript
{
  query: string;
  dbConnectionString: string;
  variables?: Record<string, any>; // Variable substitution
}
```

**Response:**

```typescript
{
  result: Record < string, unknown > [];
  fields: {
    name: string;
    dataTypeID: number;
  }
  [];
  rowCount: number;
  queryTime: number;
}
```

---

### POST `/api/execute-bulk-update`

Bulk update multiple rows in a transaction.

**Request:**

```typescript
{
  dbConnectionString: string;
  schemaName: string;
  tableName: string;
  updates: {
    primaryKeyValues: Record<string, any>;
    changes: Record<string, any>;
  }
  [];
}
```

**Response:**

```typescript
{
  success: boolean;
  updatedCount: number;
}
```

---

### POST `/api/execute-bulk-delete`

Bulk delete rows in a transaction.

**Request:**

```typescript
{
  dbConnectionString: string;
  schemaName: string;
  tableName: string;
  primaryKeys: Record < string, any > [];
}
```

**Response:**

```typescript
{
  success: boolean;
  deletedCount: number;
}
```

---

## Table Operations

### POST `/api/get-tables`

Get all tables with full metadata.

**Request:**

```typescript
{
  dbConnectionString: string;
  schemaName?: string; // Optional filter
}
```

**Response:**

```typescript
{
  tables: {
    table_name: string;
    table_schema: string;
    table_type: 'BASE TABLE' | 'VIEW';
    columns: Column[];
    primaryKeys: string[];
    foreignKeys: ForeignKey[];
  }[];
}
```

---

### POST `/api/get-one-table`

Get detailed metadata for a single table.

**Request:**

```typescript
{
  dbConnectionString: string;
  schemaName: string;
  tableName: string;
}
```

**Response:**

```typescript
{
  table_name: string;
  columns: {
    column_name: string;
    data_type: string;
    is_nullable: boolean;
    column_default: string | null;
    is_primary: boolean;
  }[];
  primaryKeys: string[];
  foreignKeys: ForeignKey[];
  constraints: Constraint[];
}
```

---

### POST `/api/get-over-view-tables`

Get tables overview (names only, lightweight).

**Request:**

```typescript
{
  dbConnectionString: string;
  schemaName: string;
}
```

**Response:**

```typescript
{
  result: {
    table_name: string;
  }
  [];
}
```

---

### POST `/api/get-table-structure`

Get table column definitions.

**Request:**

```typescript
{
  dbConnectionString: string;
  schemaName: string;
  tableName: string;
}
```

**Response:**

```typescript
{
  columns: {
    ordinal_position: number;
    column_name: string;
    data_type: string;
    is_nullable: 'YES' | 'NO';
    column_default: string | null;
  }
  [];
}
```

---

### POST `/api/get-table-ddl`

Get CREATE TABLE statement.

**Request:**

```typescript
{
  dbConnectionString: string;
  schemaName: string;
  tableName: string;
}
```

**Response:**

```typescript
{
  ddl: string; // CREATE TABLE statement
}
```

---

### POST `/api/get-table-size`

Get table disk size.

**Request:**

```typescript
{
  dbConnectionString: string;
  schemaName: string;
  tableName: string;
}
```

**Response:**

```typescript
{
  size: string; // e.g., "24 MB"
  size_bytes: number;
}
```

---

### POST `/api/export-table-data`

Export table data to file (streaming).

**Request:**

```typescript
{
  dbConnectionString: string;
  schemaName: string;
  tableName: string;
  format: 'csv' | 'json' | 'sql';
  options?: {
    includeHeaders?: boolean;  // CSV
    pretty?: boolean;          // JSON
    bulkInsert?: boolean;      // SQL
  };
}
```

**Response:** Streaming file download

---

### POST `/api/get-reverse-table-schemas`

Get reserved/system schemas.

**Request:**

```typescript
{
  dbConnectionString: string;
}
```

**Response:**

```typescript
{
  result: {
    schema_name: string;
    is_reserved: boolean;
  }
  [];
}
```

---

## View Operations

### POST `/api/get-over-view-views`

Get views overview.

**Request:**

```typescript
{
  dbConnectionString: string;
  schemaName: string;
}
```

**Response:**

```typescript
{
  result: {
    view_name: string;
  }
  [];
}
```

---

### POST `/api/get-view-definition`

Get view DDL.

**Request:**

```typescript
{
  dbConnectionString: string;
  schemaName: string;
  viewName: string;
}
```

**Response:**

```typescript
{
  definition: string; // CREATE VIEW statement
}
```

---

## Function Operations

### POST `/api/get-over-view-function`

Get functions overview.

**Request:**

```typescript
{
  dbConnectionString: string;
  schemaName: string;
}
```

**Response:**

```typescript
{
  result: {
    function_name: string;
    return_type: string;
  }
  [];
}
```

---

### POST `/api/get-one-function`

Get function definition.

**Request:**

```typescript
{
  dbConnectionString: string;
  schemaName: string;
  functionName: string;
}
```

**Response:**

```typescript
{
  definition: string; // CREATE FUNCTION statement
}
```

---

### POST `/api/get-function-signature`

Get function parameters.

**Request:**

```typescript
{
  dbConnectionString: string;
  schemaName: string;
  functionName: string;
}
```

**Response:**

```typescript
{
  parameters: {
    name: string;
    type: string;
    mode: 'IN' | 'OUT' | 'INOUT';
    default?: string;
  }[];
  returnType: string;
}
```

---

### POST `/api/update-function`

Update function definition.

**Request:**

```typescript
{
  dbConnectionString: string;
  schemaName: string;
  functionName: string;
  definition: string; // New CREATE OR REPLACE FUNCTION
}
```

**Response:**

```typescript
{
  success: boolean;
}
```

---

### POST `/api/delete-function`

Delete function.

**Request:**

```typescript
{
  dbConnectionString: string;
  schemaName: string;
  functionName: string;
}
```

**Response:**

```typescript
{
  success: boolean;
}
```

---

### POST `/api/rename-function`

Rename function.

**Request:**

```typescript
{
  dbConnectionString: string;
  schemaName: string;
  oldName: string;
  newName: string;
}
```

**Response:**

```typescript
{
  success: boolean;
}
```

---

## Schema Operations

### POST `/api/get-schema-meta-data`

Get full schema metadata (tables, views, functions).

**Request:**

```typescript
{
  dbConnectionString: string;
}
```

**Response:**

```typescript
{
  schemas: {
    name: string;
    tables: string[];
    views: ViewSchema[];
    functions: FunctionSchema[];
    table_details: Record<string, TableDetailMetadata>;
    view_details: Record<string, ViewDetails>;
  }[];
}
```

---

## Connection Management

### POST `/api/managment-connection/health-check`

Test database connection.

**Request:**

```typescript
{
  connectionString: string;
}
```

**Response:**

```typescript
{
  success: boolean;
  message: string;
  details?: {
    version: string;
    database: string;
  };
}
```

---

## AI Integration

### POST `/api/ai/chat`

AI-powered SQL generation.

**Request:**

```typescript
{
  messages: {
    role: 'user' | 'assistant';
    content: string;
  }[];
  provider: 'openai' | 'google' | 'anthropic' | 'xai';
  model: string;
  apiKey: string;
  context?: {
    schema: string;
    tables: string[];
  };
}
```

**Response:** Streaming AI response

---

## Monitoring

### POST `/api/getMetricMonitor`

Get database metrics.

**Request:**

```typescript
{
  dbConnectionString: string;
}
```

**Response:**

```typescript
{
  connections: {
    active: number;
    idle: number;
    total: number;
  }
  size: string;
  queries: {
    running: number;
  }
}
```

---

## Error Responses

All endpoints return H3 errors on failure:

```typescript
{
  statusCode: 400 | 401 | 404 | 500;
  statusMessage: string;
  message: string;
  data?: {
    code: string;      // PostgreSQL error code
    detail: string;
    hint: string;
    position: number;
  };
}
```

---

## TypeScript Types

### ForeignKey

```typescript
interface ForeignKey {
  column: string;
  foreign_table_schema: string;
  foreign_table_name: string;
  foreign_column: string;
}
```

### TableDetailMetadata

```typescript
interface TableDetailMetadata {
  table_id: string;
  columns: Column[];
  primary_keys: string[];
  foreign_keys: ForeignKey[];
  indexes: Index[];
}
```

### ViewSchema

```typescript
interface ViewSchema {
  name: string;
  definition?: string;
}
```

### FunctionSchema

```typescript
interface FunctionSchema {
  name: string;
  return_type: string;
  parameters?: string;
}
```
