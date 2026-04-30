# BA Requirements: SQL Server Support

## Background

HeraQ hiện support thực tế cho các nhóm DB chính như:

- PostgreSQL
- MySQL
- MariaDB
- Oracle
- SQLite
- Redis

Trong codebase đã có dấu hiệu chuẩn bị cho SQL Server:

- enum `DatabaseClientType.MSSQL`
- default port `1433`
- option hiển thị trong connection UI ở trạng thái `Coming soon`

Tuy nhiên SQL Server hiện chưa được support end-to-end ở runtime.

## Problem Statement

SQL Server đang ở trạng thái nửa chừng:

- product đã biết đến nó
- UI đã expose tên DB type
- nhưng user chưa thể dùng như một DB family thực thụ

Điều này tạo ra các vấn đề:

- coverage sản phẩm chưa hoàn chỉnh cho nhóm relational databases phổ biến
- expectation mismatch khi UI đã có `SQL Server` nhưng thực tế chưa dùng được
- không thể mở rộng các feature như query, schema, instance insights cho SQL Server

## Goal

Define và delivery task `support-sql-server` để SQL Server trở thành một supported SQL family trong HeraQ.

Support ở đây được hiểu theo nghĩa product-level:

- tạo / test connection
- runtime query support
- metadata support đủ để đi vào app shell
- mở đường cho các feature cấp cao như `Instance Insights`

## Non-Goals

- Không triển khai toàn bộ advanced SQL Server ecosystem trong phase đầu
- Không support Azure SQL riêng như một product line riêng biệt ở phase đầu
- Không support Always On full management workflows ở phase đầu
- Không support SQL Server Agent, SSIS, SSRS, CDC, replication management UI ở phase đầu

## Product Principles

### 1. SQL Server phải là first-class SQL family

Không coi SQL Server như alias của DB khác.

### 2. Support phải end-to-end

Không chỉ thêm enum hay UI entry, mà phải usable thực tế ở runtime.

### 3. Progressive delivery

Có thể ship theo phase, nhưng mỗi phase phải có giá trị sử dụng rõ ràng.

### 4. Capability-driven feature exposure

Feature nào chưa support thì phải ẩn hoặc disable có lý do rõ ràng.

## In Scope

### Product scope phase 1

- connection support cho SQL Server
- basic runtime query support
- metadata plumbing tối thiểu để tích hợp vào app shell
- schema browsing foundation
- mở đường cho feature-level extension sau đó

### Product scope phase 2

- schema-level workflows hoàn chỉnh hơn
- database tools / instance insights foundation

### Product scope phase 3

- SQL Server-specific advanced observability

## Out Of Scope

- SQL Server administration console
- backup/restore orchestration UI
- HA topology management
- Always On failover operations
- BI / reporting / ETL features

## Users

### Primary users

- backend engineers
- database engineers
- operators / technical power users

### Secondary users

- teams đang dùng mixed relational database stacks
- migration teams cần tooling hỗ trợ nhiều DB

## Functional Requirements

### FR1. Connection Creation

Người dùng có thể tạo SQL Server connection trong connection workflow với:

- host
- port
- username
- password
- database
- optional secure connection settings nếu được hỗ trợ

### FR2. Connection Validation

Người dùng có thể test SQL Server connection trước khi lưu.

### FR3. Query Execution

Người dùng có thể execute query trên SQL Server qua query surface của app.

### FR4. Metadata Discovery

Hệ thống có thể đọc metadata tối thiểu để tích hợp SQL Server vào navigation/app shell.

### FR5. Capability Exposure

Các feature chưa support cho SQL Server phải được:

- ẩn
- hoặc disable với message rõ ràng

### FR6. Future Feature Path

Kiến trúc support SQL Server phải đủ tốt để làm nền cho:

- schema workflows
- instance insights
- database tools

## UX Requirements

### UX1. Clear Availability State

Nếu SQL Server chưa support đủ ở phase hiện tại, UI phải nói rõ capability nào có / chưa có.

### UX2. Consistent Connection Experience

Flow tạo connection SQL Server phải nhất quán với các SQL DB khác.

### UX3. No Fake Support

Không được hiển thị như fully supported nếu runtime thực tế chưa dùng được.

## Business Value

- mở rộng coverage cho một DB family enterprise rất phổ biến
- tăng sức cạnh tranh multi-db của HeraQ
- giảm gap giữa positioning và implementation
- tạo nền để mở thêm SQL Server-specific features sau này

## Dependencies

- lựa chọn runtime driver cho SQL Server
- định nghĩa capability matrix cho SQL Server
- môi trường test SQL Server thực tế
- alignment giữa app shell, metadata, query runtime, and future feature teams

## Risks

- underestimate effort vì thấy đã có enum/UI surface sẵn
- driver/runtime integration phức tạp hơn 예상
- metadata model của SQL Server không map 1:1 với các DB đang support
- privilege/security settings có thể ảnh hưởng test coverage

## Acceptance Criteria

### AC1

Có tài liệu requirement rõ cho task `support-sql-server`.

### AC2

Có technical plan tách phase delivery.

### AC3

Có backlog breakdown đủ để tạo epic/stories.

### AC4

Task support SQL Server được phân biệt rõ giữa:

- phase enable runtime foundation
- phase feature completion

## Epic Suggestion

### Epic 1

Enable SQL Server as a real runtime-supported database family.

### Epic 2

Integrate SQL Server into metadata/app shell flows.

### Epic 3

Enable advanced SQL Server features such as Instance Insights.

## BA Task Breakdown

### Task Group 1: Product Enablement

- define product scope for SQL Server phase 1
- define supported user journeys for connection, validation, and query execution
- define capability matrix between `supported`, `coming soon`, and `not supported`

### Task Group 2: UX / Experience Alignment

- align connection form fields for SQL Server
- define UI wording for availability state
- define UX rule for hidden vs disabled features

### Task Group 3: Workspace Integration

- define minimum workspace experience after successful connection
- define minimum metadata visibility expected by users
- define unsupported areas that must not appear as usable

### Task Group 4: Future Expansion Planning

- define follow-up scope for Instance Insights
- define follow-up scope for schema workflows
- define follow-up scope for SQL Server-specific database tools
