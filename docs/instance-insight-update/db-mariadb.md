# MariaDB Instance Insights Definition

## Product Goal

Expose MariaDB server health, process activity, lock pressure, configuration, and replication state with MariaDB-native surfaces.

## Tabs

1. Overview
2. Sessions & Locks
3. Configuration
4. Replication

## Overview

### Purpose

Provide a MariaDB-wide health and workload snapshot.

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
- InnoDB counters relevant to read/write pressure

### Source surfaces

- `SHOW GLOBAL STATUS`
- `INFORMATION_SCHEMA.GLOBAL_STATUS`

## Sessions & Locks

### Purpose

Show current threads, long-running work, lock waits, and metadata lock contention where available.

### Session fields

- id
- user
- host
- db
- command
- state
- SQL text
- duration seconds
- duration milliseconds if available

### Lock fields

- transaction id
- transaction state
- waiting lock id
- wait started
- table/index if available

### Metadata lock fields

- thread id
- lock mode
- lock type
- schema
- table

### Source surfaces

- `INFORMATION_SCHEMA.PROCESSLIST`
- `INFORMATION_SCHEMA.INNODB_TRX`
- optional `INFORMATION_SCHEMA.METADATA_LOCK_INFO`

### Capability note

`METADATA_LOCK_INFO` depends on MariaDB plugin availability. UI must degrade gracefully if plugin is not installed.

## Configuration

### Purpose

Expose key system variables and their meaning.

### Source surfaces

- `SHOW GLOBAL VARIABLES`
- `INFORMATION_SCHEMA.GLOBAL_VARIABLES`
- optional `INFORMATION_SCHEMA.SYSTEM_VARIABLES`

### Important variables

- `max_connections`
- `wait_timeout`
- `innodb_buffer_pool_size`
- `tmp_table_size`
- `max_heap_table_size`
- `sql_mode`
- `read_only`

## Replication

### Purpose

Show MariaDB replica/source health, including multi-source topologies.

### Fields

- connection name / channel
- IO thread running
- SQL thread running
- last error
- lag
- GTID position if available
- source host / port

### Source surfaces

- `SHOW REPLICA STATUS`
- `SHOW ALL REPLICAS STATUS`
- `INFORMATION_SCHEMA.SLAVE_STATUS` where available

## Capability Notes

- MariaDB is not a drop-in implementation detail of MySQL here
- use MariaDB-native surfaces first
- plugin-dependent sections must be marked optional

## References

- `SHOW STATUS`: https://mariadb.com/docs/server/reference/sql-statements/administrative-sql-statements/show/show-status
- `GLOBAL_STATUS`: https://mariadb.com/docs/server/reference/system-tables/information-schema/information-schema-tables/information-schema-global_status-and-session_status-tables
- `SHOW VARIABLES`: https://mariadb.com/docs/server/reference/sql-statements/administrative-sql-statements/show/show-variables
- `GLOBAL_VARIABLES`: https://mariadb.com/docs/server/reference/system-tables/information-schema/information-schema-tables/information-schema-global_variables-and-session_variables-tables
- `SYSTEM_VARIABLES`: https://mariadb.com/docs/server/reference/system-tables/information-schema/information-schema-tables/information-schema-system_variables-table
- `PROCESSLIST`: https://mariadb.com/kb/en/information-schema-processlist-table/
- `INNODB_TRX`: https://mariadb.com/docs/server/reference/sql-statements/administrative-sql-statements/system-tables/information-schema/information-schema-tables/information-schema-innodb-tables/information-schema-innodb_trx-table
- metadata lock plugin: https://mariadb.com/docs/server/reference/plugins/other-plugins/metadata-lock-info-plugin
- replica status: https://mariadb.com/docs/server/reference/sql-statements/administrative-sql-statements/show/show-replica-status
- slave status table: https://mariadb.com/docs/server/reference/system-tables/information-schema/information-schema-tables/information-schema-slave_status-table
