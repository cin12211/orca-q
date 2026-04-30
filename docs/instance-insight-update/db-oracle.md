# Oracle Instance Insights Definition

## Product Goal

Expose Oracle instance health using Oracle dynamic performance views, with focus on sessions, waits, memory/limits, configuration, and Data Guard.

## Tabs

1. Overview
2. Sessions & Locks
3. Memory & Limits
4. Configuration
5. Data Guard

## Overview

### Purpose

Provide top-level instance state and throughput metrics.

### Fields

- instance name
- host name
- version
- startup time
- instance status
- active state
- instance role

### Throughput metrics

- logical reads/sec
- physical reads/sec
- executions/sec
- redo generated/sec
- user calls/sec

### Source surfaces

- `V$INSTANCE`
- `V$SYSMETRIC`

## Sessions & Locks

### Purpose

Show live sessions, waits, blocking, and current locks.

### Session fields

- SID
- SERIAL#
- username
- machine
- program
- module
- event
- wait class
- status

### Lock fields

- SID
- lock type
- held mode
- requested mode
- blocking flag
- lock age

### Source surfaces

- `V$SESSION`
- `V$LOCK`

### Candidate action

- kill session in later phase

## Memory & Limits

### Purpose

Expose memory pressure and process/session ceilings.

### Fields

- SGA summary
- PGA statistics
- sessions utilization
- processes utilization
- transactions utilization

### Source surfaces

- `V$SGA`
- `V$PGASTAT`
- `V$RESOURCE_LIMIT`

## Configuration

### Purpose

Expose instance-level parameter visibility and search.

### Fields

- name
- display value
- default value
- modifiable flags
- deprecated flag
- description

### Source surfaces

- `V$SYSTEM_PARAMETER`

## Data Guard

### Purpose

Expose standby/apply and archive destination health.

### Fields

- apply lag
- apply finish time
- destination status
- synchronization status
- gap status
- recovery mode
- protection mode

### Source surfaces

- `V$DATAGUARD_STATS`
- `V$ARCHIVE_DEST_STATUS`

## Capability Notes

- Oracle should be delivered as single-instance first
- RAC / `GV$` support is future scope
- privileges must be defined before implementation begins

## References

- `V$INSTANCE`: https://docs.oracle.com/en/database/oracle/oracle-database/19/refrn/V-INSTANCE.html
- `V$SYSMETRIC`: https://docs.oracle.com/en/database/oracle/oracle-database/19/refrn/V-SYSMETRIC.html
- `V$SESSION`: https://docs.oracle.com/en/database/oracle/oracle-database/21/refrn/V-SESSION.html
- `V$LOCK`: https://docs.oracle.com/en/database/oracle/oracle-database/21/refrn/V-LOCK.html
- `V$SGA`: https://docs.oracle.com/en/database/oracle/oracle-database/23/refrn/V-SGA.html
- `V$PGASTAT`: https://docs.oracle.com/cd/E96517_01/refrn/V-PGASTAT.html
- `V$RESOURCE_LIMIT`: https://docs.oracle.com/en/database/oracle/oracle-database/18/refrn/V-RESOURCE_LIMIT.html
- `V$SYSTEM_PARAMETER`: https://docs.oracle.com/en/database/oracle/oracle-database/26/refrn/V-SYSTEM_PARAMETER.html
- `V$DATAGUARD_STATS`: https://docs.oracle.com/en/database/oracle/oracle-database/19/refrn/V-DATAGUARD_STATS.html
- `V$ARCHIVE_DEST_STATUS`: https://docs.oracle.com/en/database/oracle/oracle-database/21/refrn/V-ARCHIVE_DEST_STATUS.html
