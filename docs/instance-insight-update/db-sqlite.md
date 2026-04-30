# SQLite Insights Definition

## Product Goal

Expose SQLite database/file health and integrity. This is not server-instance monitoring.

## Product Positioning

For SQLite, `Instance Insights` should be treated as `SQLite Database Insights` or `SQLite File Insights` at the domain level.

## Tabs

1. Overview
2. Storage Health
3. Configuration
4. Integrity

## Overview

### Purpose

Provide a quick view of file-backed database shape and mode.

### Fields

- file path
- attached databases
- page count
- page size
- approximate file size
- journal mode
- locking mode
- auto vacuum mode

### Source surfaces

- `PRAGMA database_list`
- `PRAGMA page_count`
- `PRAGMA page_size`
- `PRAGMA journal_mode`
- `PRAGMA locking_mode`
- `PRAGMA auto_vacuum`

## Storage Health

### Purpose

Show reclaimable space and WAL/storage behavior.

### Fields

- freelist count
- reclaimable bytes
- WAL enabled or not
- checkpoint-related visibility where possible
- table inventory

### Source surfaces

- `PRAGMA freelist_count`
- `PRAGMA table_list`
- `PRAGMA wal_checkpoint`
- `PRAGMA wal_autocheckpoint`

## Configuration

### Purpose

Show operational settings relevant to durability and behavior.

### Fields

- foreign keys
- synchronous
- mmap size
- cache size
- query only
- read uncommitted
- trusted schema

### Source surfaces

- SQLite `PRAGMA` settings

## Integrity

### Purpose

Make consistency checks visible and actionable.

### Fields

- quick check result
- integrity check result
- warnings for reclaimable space / risky durability modes

### Source surfaces

- `PRAGMA quick_check`
- `PRAGMA integrity_check`

## Capability Notes

- No replication tab
- No session/process monitoring tab
- No cancel query / terminate connection actions
- Optional future actions:
  - checkpoint
  - vacuum recommendation

## References

- SQLite PRAGMA reference: https://www.sqlite.org/pragma.html
- SQLite WAL: https://www.sqlite.org/wal.html
- SQLite auto-checkpoint: https://www.sqlite.org/c3ref/wal_autocheckpoint.html
