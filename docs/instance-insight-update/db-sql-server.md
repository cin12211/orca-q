# SQL Server Instance Insights Definition

## Status

Follow-up scope.

SQL Server nên được support trong `Instance Insights`, nhưng implementation không nên được xem là một task nhỏ nếu xét theo trạng thái codebase hiện tại.

## Feasibility Assessment

### Product / domain complexity

Ở level `Instance Insights` riêng:

- complexity: medium
- khó hơn MySQL/MariaDB một chút
- đơn giản hơn Oracle

Lý do:

- SQL Server có DMV và catalog view tương đối rõ
- model sessions, requests, locks, config, HA khá chuẩn hóa
- surface observability đủ tốt để define sạch

### Codebase implementation complexity

Ở level toàn codebase hiện tại:

- complexity: medium-high
- không phải “thêm 1 adapter insights là xong”

Lý do:

- `DatabaseClientType.MSSQL` đã xuất hiện trong enum/parser/UI
- nhưng hiện chưa có SQL Server runtime adapter trong driver factory
- không thấy dependency `mssql` hoặc `tedious` trong runtime package
- không thấy MSSQL domain adapters trong `server/infrastructure/database/adapters/*`

Code references:

- [core/constants/database-client-type.ts](/Volumes/Cinny/Cinny/Project/HeraQ/core/constants/database-client-type.ts:20)
- [components/modules/connection/constants/index.ts](/Volumes/Cinny/Cinny/Project/HeraQ/components/modules/connection/constants/index.ts:70)
- [server/infrastructure/driver/factory.ts](/Volumes/Cinny/Cinny/Project/HeraQ/server/infrastructure/driver/factory.ts:16)

## Recommendation

Support SQL Server là hợp lý và đáng làm.

Nhưng nên split thành 2 workstreams:

1. Enable SQL Server as a real SQL runtime family in driver/domain layers
2. Implement SQL Server-specific `Instance Insights`

Nếu bỏ qua bước 1, task `Instance Insights` sẽ bị block.

## Tabs

1. Overview
2. Sessions & Locks
3. Configuration
4. Availability

## Overview

### Purpose

Provide a top-level SQL Server engine health snapshot.

### Metrics

- product version / edition
- uptime
- active sessions
- active requests
- batch requests/sec
- SQL compilations/sec
- SQL re-compilations/sec
- user connections
- waits snapshot if selected
- buffer or cache metrics if selected

### Source surfaces

- `sys.dm_os_performance_counters`
- `sys.dm_exec_sessions`
- `sys.dm_exec_requests`

## Sessions & Locks

### Purpose

Show current workload, blocking, and lock pressure.

### Session fields

- session id
- login name
- host name
- program name
- database name
- status
- open transaction count

### Request fields

- request status
- command
- wait type
- wait time
- blocking session id
- cpu time
- logical reads
- writes
- SQL text

### Lock fields

- resource type
- request mode
- request status
- owner type
- database id / object id where available

### Source surfaces

- `sys.dm_exec_sessions`
- `sys.dm_exec_requests`
- `sys.dm_tran_locks`

### Candidate actions

- kill session

## Configuration

### Purpose

Expose key server-wide configuration options and whether configured values are currently in use.

### Fields

- name
- configured value
- running value
- minimum
- maximum
- is dynamic
- is advanced
- description

### Source surface

- `sys.configurations`

## Availability

### Purpose

Expose SQL Server HA/DR posture where available, especially Always On availability groups.

### Fields

- replica role
- synchronization state
- synchronization health
- database state
- suspend reason
- lag
- availability mode

### Source surfaces

- `sys.dm_hadr_availability_replica_states`
- `sys.dm_hadr_database_replica_states`

### Fallback behavior

If Always On is not configured:

- show `Availability not configured`
- do not treat as error

## Resource Estimate

### If SQL Server runtime already existed

Estimated effort:

- moderate

### In current codebase state

Estimated effort:

- medium-high

Practical conclusion:

- not a tiny task
- better treated as a mini-epic

## Suggested Delivery Plan

### Step 1

Add SQL Server runtime dependency and driver adapter support.

### Step 2

Add SQL Server metadata/query/domain adapters needed by the app shell.

### Step 3

Implement SQL Server `Instance Insights` tabs and API handlers.

### Step 4

Validate against a real SQL Server environment, plus optional Always On topology.

## Conclusion

`support-sql-server` không phải việc quá khó ở level domain/observability, nhưng trong repo hiện tại nó **không đơn giản** vì thiếu runtime support nền.

Kết luận ngắn:

- domain define: khá straightforward
- implementation trong repo hiện tại: medium-high effort
- resource cost: không nặng như Oracle, nhưng nặng hơn đáng kể so với “thêm 1 DB type nhỏ”

## References

- `sys.dm_exec_sessions`: https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-exec-sessions-transact-sql?view=sql-server-ver16
- `sys.dm_exec_requests`: https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-exec-requests-transact-sql?view=sql-server-ver17
- `sys.dm_os_performance_counters`: https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-os-performance-counters-transact-sql?view=sql-server-ver15
- `sys.dm_tran_locks`: https://learn.microsoft.com/lb-lu/sql/relational-databases/system-dynamic-management-views/sys-dm-tran-locks-transact-sql?view=sql-server-ver17
- `sys.configurations`: https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-configurations-transact-sql?view=sql-server-ver17
- availability group overview: https://learn.microsoft.com/en-us/sql/database-engine/availability-groups/windows/overview-of-always-on-availability-groups-sql-server?view=sql-server-2016
- AG DMVs overview: https://learn.microsoft.com/en-us/sql/database-engine/availability-groups/windows/dynamic-management-views-and-system-catalog-views-always-on-availability-groups?view=sql-server-ver17
- `sys.dm_hadr_availability_replica_states`: https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-hadr-availability-replica-states-transact-sql?view=azuresqldb-current
- `sys.dm_hadr_database_replica_states`: https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-hadr-database-replica-states-transact-sql?view=azuresqldb-current
