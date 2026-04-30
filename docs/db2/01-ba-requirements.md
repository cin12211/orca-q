# BA Requirements: Db2 Support

## Background

HeraQ hiện support thực tế cho các nhóm DB chính như:

- PostgreSQL
- MySQL
- MariaDB
- Oracle
- SQLite
- Redis

SQL Server đã có một số surface chuẩn bị trước trong codebase.

Db2 thì chưa ở trạng thái đó.

Hiện tại chưa có:

- enum DB type riêng cho Db2
- UI option trong connection flow
- connection-string parsing awareness
- runtime adapter
- metadata/query integration

## Problem Statement

Db2 là một relational database enterprise quan trọng nhưng HeraQ hiện chưa có path support rõ ràng.

Điều này tạo ra các vấn đề:

- thiếu coverage cho nhóm enterprise SQL databases
- không thể onboard team đang dùng Db2 LUW
- không có nền tảng để làm query, schema, instance insights cho Db2
- nếu sau này làm vội, dễ lẫn scope giữa `Db2 LUW`, `Db2 for i`, và `Db2 for z/OS`

## Goal

Define và delivery task `support-db2` để `Db2 LUW` trở thành một supported SQL family trong HeraQ.

Support ở đây được hiểu theo nghĩa product-level:

- tạo / test connection
- runtime query support
- metadata support đủ để đi vào app shell
- mở đường cho các feature cấp cao như `Instance Insights`

## Non-Goals

- Không support `Db2 for z/OS` ở phase đầu
- Không support `Db2 for i` ở phase đầu
- Không support HADR management workflows ở phase đầu
- Không support backup/restore orchestration UI ở phase đầu
- Không support federation / nickname administration ở phase đầu
- Không support workload management / pureScale operations ở phase đầu

## Product Principles

### 1. Chỉ support một Db2 line rõ ràng trong phase đầu

Scope phase đầu phải khóa vào `Db2 LUW`.

### 2. Không fake support

Không được hiển thị như supported nếu runtime thực tế chưa dùng được.

### 3. Support phải usable end-to-end

Không chỉ thêm DB type vào enum/UI rồi dừng lại.

### 4. Capability-driven rollout

Feature nào chưa support cho Db2 phải ẩn hoặc disable có lý do rõ ràng.

## In Scope

### Product scope phase 1

- connection support cho `Db2 LUW`
- basic runtime query support
- metadata plumbing tối thiểu để tích hợp vào app shell
- schema browsing foundation
- capability gating rõ ràng cho các feature chưa hỗ trợ

### Product scope phase 2

- schema-level workflows hoàn chỉnh hơn
- SQL workspace integration sâu hơn
- chuẩn bị nền cho `Instance Insights`

### Product scope phase 3

- Db2-specific observability và advanced features

## Out Of Scope

- Db2 administration console
- HADR failover operations
- backup/restore management UI
- role/security administration UI
- package/cache analysis UI
- multi-product support cho `Db2 for i` và `Db2 for z/OS`

## Users

### Primary users

- backend engineers
- database engineers
- platform / operations engineers

### Secondary users

- enterprise teams dùng mixed SQL stacks
- migration teams cần tooling support thêm Db2

## Functional Requirements

### FR1. Connection Creation

Người dùng có thể tạo Db2 connection trong connection workflow với:

- host
- port
- database
- username
- password
- optional SSL / certificate settings nếu được hỗ trợ

### FR2. Connection Validation

Người dùng có thể test Db2 connection trước khi lưu.

### FR3. Query Execution

Người dùng có thể execute query trên Db2 qua query surface của app.

### FR4. Metadata Discovery

Hệ thống có thể đọc metadata tối thiểu để tích hợp Db2 vào navigation/app shell.

### FR5. Capability Exposure

Các feature chưa support cho Db2 phải được:

- ẩn
- hoặc disable với message rõ ràng

### FR6. Future Feature Path

Kiến trúc support Db2 phải đủ tốt để làm nền cho:

- schema workflows
- instance insights
- database tools

## UX Requirements

### UX1. Clear Product Naming

Trong UI và docs phải ghi rõ `Db2` phase đầu là `Db2 LUW`, tránh hiểu sai sang `Db2 for i` hoặc `z/OS`.

### UX2. Consistent Connection Experience

Flow tạo connection Db2 phải nhất quán với các SQL DB khác.

### UX3. Clear Capability Messaging

Nếu workspace hoặc tooling chưa support đủ, UI phải nói rõ capability nào có / chưa có.

## Business Value

- mở rộng coverage cho một enterprise SQL family quan trọng
- tăng khả năng cạnh tranh multi-db của HeraQ
- tạo nền để tiếp cận thêm các team đang dùng IBM stack
- tránh việc design future support trên nền giả định sai về Db2 product line

## Dependencies

- lựa chọn Node.js driver strategy cho Db2
- xác nhận yêu cầu runtime/client library của driver
- môi trường test `Db2 LUW` thực tế
- định nghĩa capability matrix cho phase rollout

## Risks

- underestimate effort vì coi Db2 như “chỉ thêm một SQL DB khác”
- driver/runtime setup phức tạp hơn MySQL/Postgres
- metadata/catalog model khác hiện trạng các adapter đang có
- nhầm lẫn scope giữa `Db2 LUW`, `Db2 for i`, `Db2 for z/OS`
- privilege / monitoring access có thể ảnh hưởng coverage

## Acceptance Criteria

### AC1

Có tài liệu requirement rõ cho task `support-db2`.

### AC2

Có technical plan tách phase delivery.

### AC3

Có backlog breakdown đủ để tạo epic/stories.

### AC4

Task support Db2 được chốt rõ là `Db2 LUW` trong phase đầu.

### AC5

Task support Db2 được phân biệt rõ giữa:

- phase enable runtime foundation
- phase feature completion

## Epic Suggestion

### Epic 1

Enable Db2 LUW as a runtime-supported SQL family.

### Epic 2

Integrate Db2 into metadata/app shell flows.

### Epic 3

Enable advanced Db2 features such as Instance Insights.

## BA Task Breakdown

### Task Group 1: Scope Definition

- chốt product line là `Db2 LUW`
- define supported versions/environments
- define what is explicitly not included in phase đầu

### Task Group 2: Product Enablement

- define product scope cho connection, validation, query execution
- define minimum metadata experience
- define capability matrix theo phase

### Task Group 3: UX / Experience Alignment

- define connection form fields cho Db2
- define wording cho availability state
- define UX rule cho hidden vs disabled features

### Task Group 4: Future Expansion Planning

- define follow-up scope cho schema workflows
- define follow-up scope cho Instance Insights
- define follow-up scope cho Db2-specific database tools

## References

- IBM Db2 connection requirements:
  https://www.ibm.com/docs/en/data-product-hub/5.2.x?topic=connections-db2-connection
- IBM catalog views:
  https://www.ibm.com/docs/en/db2/11.5.x?topic=sql-catalog-views
