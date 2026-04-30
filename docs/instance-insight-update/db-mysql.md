# MySQL Instance Insights Definition

## Product Goal

Expose MySQL server health, workload, session pressure, lock contention, configuration, and replication state in a way that is useful for day-to-day operations.

## Tabs

1. Overview
2. Sessions & Locks
3. Configuration
4. Replication

## Overview

### Purpose

Provide server-level health snapshot.

### Metrics

- version
- uptime
- `Threads_connected`
- `Threads_running`
- `Connections`
- `Questions`
- `Bytes_received`
- `Bytes_sent`
- `Slow_queries`
- `Aborted_connects`
- `Created_tmp_tables`
- `Created_tmp_disk_tables`
- `Com_commit`
- `Com_rollback`
- `Innodb_rows_read`
- `Innodb_rows_inserted`
- `Innodb_rows_updated`
- `Innodb_rows_deleted`
- `Innodb_buffer_pool_read_requests`
- `Innodb_buffer_pool_reads`

### Derived metrics

- temp-disk ratio
- InnoDB buffer hit ratio
- rollback ratio

### Source surfaces

- `SHOW GLOBAL STATUS`
- `performance_schema.global_status`

## Sessions & Locks

### Purpose

Show active sessions, slow or blocked work, and lock contention.

### Metrics / fields

- session id
- user
- host
- db
- command
- state
- current SQL
- duration
- thread type
- background/foreground

### Lock visibility

- data lock waits
- metadata lock waits if surfaced
- waiting thread
- blocking thread
- waiting query
- blocking query

### Source surfaces

- `performance_schema.threads`
- `sys.processlist`
- `performance_schema.data_locks`
- `performance_schema.data_lock_waits`
- optional `sys.innodb_lock_waits`

### Candidate actions

- kill query
- kill connection

## Configuration

### Purpose

Make critical global variables visible and searchable.

### Fields

- name
- value
- source if available
- sensitive flag if needed
- grouping category

### Important variables

- `max_connections`
- `wait_timeout`
- `interactive_timeout`
- `innodb_buffer_pool_size`
- `tmp_table_size`
- `max_heap_table_size`
- `sql_mode`
- `read_only`
- `super_read_only`
- `performance_schema`

### Source surfaces

- `SHOW GLOBAL VARIABLES`
- `performance_schema.global_variables`
- optional `performance_schema.variables_info`

## Replication

### Purpose

Show replica and source replication health.

### Replica-side fields

- channel
- source host
- source port
- IO thread state
- SQL thread state
- last error
- lag
- relay/apply status

### Source-side fields

- connected replicas
- source server id
- replica host / port

### Source surfaces

- `SHOW REPLICA STATUS`
- `SHOW REPLICAS`
- `performance_schema.replication_*`

## Capability Notes

- Requires enough privileges to query `performance_schema` and replication status
- Some lock details may vary if instrumentation is disabled

## References

- `SHOW STATUS`: https://dev.mysql.com/doc/en/show-status.html
- status variable tables: https://dev.mysql.com/doc/refman/8.4/en/performance-schema-status-variable-tables.html
- `SHOW VARIABLES`: https://dev.mysql.com/doc/refman/8.3/en/show-variables.html
- system variable tables: https://dev.mysql.com/doc/refman/en/performance-schema-system-variable-tables.html
- threads table: https://dev.mysql.com/doc/refman/9.7/en/performance-schema-threads-table.html
- processlist access: https://dev.mysql.com/doc/refman/8.4/en/processlist-access.html
- lock waits: https://dev.mysql.com/doc/refman/8.4/en/performance-schema-data-lock-waits-table.html
- replication tables: https://dev.mysql.com/doc/refman/en/performance-schema-replication-tables.html
- replica status: https://dev.mysql.com/doc/refman/8.4/en/show-slave-status.html
- replicas: https://dev.mysql.com/doc/refman/8.4/en/show-replicas.html
