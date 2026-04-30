# Instance Insight Update

## Purpose

Bộ tài liệu này define lại `Instance Insights` để hỗ trợ nhiều DB type thay vì chỉ tối ưu cho PostgreSQL.

Hiện trạng code:

- Contract hiện tại đang PG-first:
  - `dashboard`
  - `state`
  - `configuration`
  - `replication`
- Adapter contract hiện tại đang assume mọi DB đều có cùng shape dữ liệu và cùng action set.

Code references:

- `core/types/instance-insights.types.ts`
- `server/infrastructure/database/adapters/instance-insights/types.ts`
- `components/modules/instance-insights/InstanceInsightsPanel.vue`

## Files

- `01-ba-requirements.md`
  - BA requirement tổng
- `02-technical-plan.md`
  - PM / Tech delivery plan tổng
- `db-mysql.md`
  - Define riêng cho MySQL
- `db-mariadb.md`
  - Define riêng cho MariaDB
- `db-oracle.md`
  - Define riêng cho Oracle
- `db-sqlite.md`
  - Define riêng cho SQLite

## Recommended Delivery Order

1. MySQL
2. MariaDB
3. SQLite
4. Oracle

Lý do:

- MySQL gần model server-based hiện tại nhất
- MariaDB gần MySQL nhưng cần tách source surfaces
- SQLite cần đổi product mental model
- Oracle có nhiều phụ thuộc quyền truy cập và surface riêng
