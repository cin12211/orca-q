# BA Requirements: Multi-DB Instance Insights

## Background

`Instance Insights` hiện đang được implement chủ yếu cho PostgreSQL.

Biểu hiện:

- data shape mang đặc thù Postgres
- UI sections mang đặc thù Postgres
- adapter contract đang assume các DB type khác có cùng capability

Điều này không phù hợp vì:

- MySQL / MariaDB có status, process, replication model khác
- Oracle có dynamic performance views và Data Guard model riêng
- SQLite không phải server instance theo nghĩa truyền thống

## Problem Statement

Sản phẩm hiện có entry point `Instance Insights` cho nhiều DB type, nhưng chưa có define riêng cho:

- MySQL
- MariaDB
- Oracle
- SQLite

Hậu quả:

- requirement mơ hồ
- dễ implement sai mental model của DB
- khó thiết kế adapter contract đúng
- UI có nguy cơ generic giả, không hữu ích thực tế

## Goal

Define lại `Instance Insights` theo hướng:

- giữ experience chung ở level product
- nhưng có define riêng theo từng DB type
- mỗi DB type có tab, metric, source query, capability, fallback behavior riêng
- có follow-up path rõ ràng cho SQL Server

## Non-Goals

- Không redesign toàn bộ tab shell ở phase này
- Không implement Snowflake / Redis trong scope này
- SQL Server không nằm trong wave delivery đầu tiên, nhưng phải được track như follow-up scope
- Không chuẩn hoá charting/visualization nâng cao ở phase đầu
- Không build cluster-level insights cho Oracle RAC hay MySQL Group Replication phase 1

## Product Principles

### 1. Same Product Name, Different Domain Model

Tên feature vẫn là `Instance Insights`, nhưng data model không ép đồng nhất giữa các DB type.

### 2. Database-Native Monitoring

Mỗi DB type phải expose metric theo đúng khả năng và đặc thù vận hành của nó.

### 3. Graceful Degradation

Nếu một capability cần privilege, plugin, hoặc server mode riêng:

- UI phải báo unsupported / unavailable rõ ràng
- không throw generic server error nếu có thể detect trước

### 4. SQLite Is Not A Server Instance

Với SQLite, feature này phải được hiểu là `database/file insights`, không phải session/process monitoring như server DB.

## In Scope

### Shared scope

- define product behavior cho MySQL, MariaDB, Oracle, SQLite
- track follow-up requirement cho SQL Server
- define tab model cho từng DB type
- define metric groups
- define capability/fallback behavior
- define action availability per DB type

### Per-DB scope

- MySQL
  - overview
  - sessions/locks
  - configuration
  - replication
- MariaDB
  - overview
  - sessions/locks
  - configuration
  - replication
- Oracle
  - overview
  - sessions/locks
  - memory/limits
  - configuration
  - Data Guard
- SQLite
  - overview
  - storage health
  - configuration
  - integrity
- SQL Server
  - overview
  - sessions & locks
  - configuration
  - availability / HA

## Out Of Scope

- PostgreSQL rewrite
- kill session / terminate action for DB types chưa xác nhận permission path
- advanced forecasting / anomaly detection
- alerting / notification workflows

## Current-State Constraint

Current adapter contract:

- `getDashboard()`
- `getState()`
- `getConfiguration()`
- `getReplication()`
- PG-specific actions như cancel query, terminate connection, drop replication slot

Điều này không phù hợp cho toàn bộ DB type.

## Required Future-State

Hệ thống cần hỗ trợ:

### 1. Per-DB insight definition

Mỗi DB type có:

- section/tabs riêng
- metrics riêng
- sources riêng
- actions riêng

### 2. Capability-driven UI

UI phải render dựa trên:

- DB type
- supported capabilities
- privilege availability
- optional plugin availability

### 3. Explicit unsupported behavior

Ví dụ:

- MariaDB metadata lock section unavailable nếu plugin chưa có
- Oracle Data Guard section empty nếu database không ở Data Guard mode
- SQLite không có sessions/replication tab

## Functional Requirements

### FR1. Product entry

Người dùng có thể mở `Instance Insights` từ các DB type supported trong phase này:

- MySQL
- MariaDB
- Oracle
- SQLite

SQL Server là follow-up delivery sau khi runtime support được xác nhận.

### FR2. Context-aware tabs

Khi mở `Instance Insights`, hệ thống render bộ tab đúng theo DB type.

### FR3. Context-aware metrics

Mỗi tab phải hiển thị metric phù hợp với DB type đó.

### FR4. Configuration visibility

Mỗi DB type phải có section config/tuning visibility theo surface native của DB đó.

### FR5. Replication/storage specialization

- MySQL/MariaDB: replication-centric
- Oracle: Data Guard-centric
- SQLite: storage/integrity-centric

### FR6. Error / unsupported messaging

Nếu feature phụ không khả dụng, hệ thống phải hiển thị message có nghĩa thay vì generic failure.

## UX Requirements

### UX1. Shared shell

Các DB type vẫn dùng chung shell `Instance Insights` để giữ consistency.

### UX2. Different tab semantics

Không ép user thấy các tab vô nghĩa.

Ví dụ:

- SQLite không nên có `Replication`
- Oracle nên có `Memory & Limits`

### UX3. Consistent terminology

Label tab phải bám ngôn ngữ vận hành phổ biến của DB đó.

Ví dụ:

- MySQL dùng `Sessions & Locks`
- Oracle dùng `Data Guard`
- SQLite dùng `Integrity`

## Business Value

- tăng coverage thực sự của multi-db product
- giảm misleading UX
- làm feature hữu ích hơn cho vận hành production
- tạo nền cho DB-specific observability sau này

## Acceptance Criteria

### AC1

Có tài liệu define riêng cho từng DB type trong scope.

### AC2

Mỗi DB type có tab model rõ ràng.

### AC3

Mỗi tab có metric group rõ ràng.

### AC4

Mỗi DB type có source/query surface được define.

### AC5

Mỗi DB type có action capability được define rõ:

- supported
- unsupported
- conditional

### AC6

SQLite được define như database/file insights, không phải server-instance monitoring.

## Dependencies

- database privileges / grants
- optional plugins ở MariaDB
- environment with replication / standby topology để test
- agreement về architecture refactor từ team engineering

## Risks

- cố generic hoá quá mức sẽ làm feature mất giá trị
- thiếu privilege model sẽ làm implementation fail ở môi trường thực
- Oracle scope có thể nặng hơn ước tính do privilege/surface phức tạp

## Recommended Epic Split

### Epic 1

Refactor `Instance Insights` architecture to capability-driven / DB-specific contracts.

### Epic 2

Deliver MySQL + MariaDB instance insights.

### Epic 3

Deliver SQLite insights.

### Epic 4

Deliver Oracle instance insights.

### Epic 5

Enable SQL Server runtime support and deliver SQL Server instance insights.
