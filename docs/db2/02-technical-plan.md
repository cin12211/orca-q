# Technical Plan: Db2 Support

## Objective

Biến `Db2 LUW` từ trạng thái `not-present-in-platform` thành một SQL family có thể dùng thực tế trong HeraQ.

## Current Technical State

### Already present

- hầu như chưa có surface nào dành riêng cho Db2

### Missing or not active

- không có `DatabaseClientType.DB2`
- không có default port mapping cho Db2
- không có connection-string parser awareness cho Db2
- không có UI listing cho Db2 trong connection selection
- không có runtime Db2 driver dependency
- không có Db2 adapter trong `server/infrastructure/driver/factory.ts`
- không có metadata/query/domain adapters cho Db2

References:

- [core/constants/database-client-type.ts](/Volumes/Cinny/Cinny/Project/HeraQ/core/constants/database-client-type.ts:1)
- [components/modules/connection/constants/index.ts](/Volumes/Cinny/Cinny/Project/HeraQ/components/modules/connection/constants/index.ts:1)
- [core/helpers/parser-connection-string.ts](/Volumes/Cinny/Cinny/Project/HeraQ/core/helpers/parser-connection-string.ts:32)
- [server/infrastructure/driver/factory.ts](/Volumes/Cinny/Cinny/Project/HeraQ/server/infrastructure/driver/factory.ts:1)
- [package.json](/Volumes/Cinny/Cinny/Project/HeraQ/package.json:1)

## Feasibility Assessment

## Product complexity

- medium-high

Reason:

- Db2 vẫn là relational SQL database nên product direction không mơ hồ
- nhưng phải chốt đúng product line ngay từ đầu
- nếu không khóa scope vào `Db2 LUW`, complexity sẽ tăng mạnh

## Codebase complexity

- high

Reason:

- hiện chưa có bất kỳ runtime foundation nào cho Db2
- phải mở rộng từ enum, parser, UI, driver factory, metadata, query runtime
- Node.js integration cho Db2 có setup/runtime caveat riêng

## Recommendation

Treat `support-db2` as a mini-program với 3 lớp:

1. Foundation enablement
2. Product feature integration
3. Runtime/infra validation

## Driver and Runtime Considerations

Db2 cần được đánh giá theo một driver strategy rõ ràng.

Open technical decision:

- dùng `ibm_db` làm primary runtime driver
- hoặc chọn strategy khác nếu cần bridge qua lớp abstraction hiện tại

Important constraint:

- Db2 Node.js driver có yêu cầu runtime/client setup riêng theo tài liệu IBM
- điều này làm task nặng hơn các adapter hiện tại vốn dựa trên driver setup đơn giản hơn

## Technical Workstreams

### Workstream 1: Core Type and Platform Enablement

Goal:

- đưa Db2 vào platform model như một SQL family hợp lệ

Tasks:

1. add `DatabaseClientType.DB2`
2. add default port mapping
3. add connection type metadata cho UI
4. add parser awareness cho Db2 connection input nếu cần
5. define capability profile entry cho Db2

### Workstream 2: Runtime Driver Enablement

Goal:

- làm cho Db2 connection và query runtime hoạt động thực tế

Tasks:

1. choose driver strategy
2. add package dependency
3. implement Db2 adapter
4. register adapter in `factory.ts`
5. validate connection lifecycle và destroy flow

### Workstream 3: Query Layer Integration

Goal:

- allow query execution qua existing SQL surfaces

Tasks:

1. validate parameter binding behavior cho Db2
2. validate result mapping
3. normalize execution errors
4. validate streaming/non-streaming path expectations

### Workstream 4: Metadata / App Shell Integration

Goal:

- integrate Db2 vào workspace experience bình thường

Tasks:

1. implement metadata adapters bằng Db2 catalog views
2. support databases / schemas / tables / views path tối thiểu
3. plug Db2 vào schema tree / workspace capability checks
4. gate unsupported surfaces rõ ràng

### Workstream 5: Future Feature Enablement

Goal:

- prepare Db2 cho feature-level expansion

Potential follow-up features:

- Instance Insights
- Schema Diff
- Backup / Restore
- Role / privilege inspection

Các feature này không nên block phase 1 runtime support.

## Suggested Delivery Phases

## Phase 0: Discovery / Architecture Decision

Deliverables:

- confirm product line là `Db2 LUW`
- confirm driver choice
- confirm minimal supported Db2 versions / environments
- confirm runtime prerequisites cho local/dev/container environments

Output:

- driver decision
- capability matrix
- infra risk confirmation

## Phase 1: Platform Foundation

Deliverables:

- `DatabaseClientType.DB2`
- UI listing / default port / parser awareness
- capability profile skeleton

Acceptance:

- Db2 được platform nhận diện như một DB family hợp lệ, nhưng chưa claim full runtime support

## Phase 2: Runtime Enablement

Deliverables:

- Db2 driver package
- Db2 runtime adapter
- adapter factory registration
- health check working

Acceptance:

- có thể create và validate Db2 connection

## Phase 3: Query Support

Deliverables:

- execute query support
- result handling support
- error normalization support

Acceptance:

- Db2 query có thể chạy trong query surfaces chính

## Phase 4: Metadata / Workspace Integration

Deliverables:

- metadata adapters
- schema/app shell integration
- capability gating

Acceptance:

- Db2 có thể tham gia workspace flows ở mức meaningful

## Phase 5: Feature Expansion

Deliverables:

- Db2-specific advanced features
- first candidate: `Instance Insights`

Acceptance:

- Db2 không chỉ “connect được”, mà có feature-level value

## Technical Risks

### Risk 1

Driver integration có thể cần runtime/client libraries ngoài dependency npm thuần.

### Risk 2

Container/dev environment setup cho Db2 có thể phức tạp hơn các DB đang có.

### Risk 3

Metadata model của Db2 cần branch riêng đáng kể so với Postgres/MySQL.

### Risk 4

Nếu scope line product không chốt, team dễ vô tình mở rộng sang `Db2 for i` hoặc `z/OS`.

## Mitigations

- khóa scope vào `Db2 LUW`
- tách phase foundation với phase runtime
- dựng integration test environment sớm
- ship capability gating thay vì giả vờ full support

## Resource / Effort Estimate

### Engineering effort

- high

### PM / coordination effort

- medium-high

### Infra / QA effort

- medium-high

### Compared with existing DB additions

- nặng hơn `SQL Server` vì thiếu cả runtime lẫn platform surface ban đầu
- nhẹ hơn việc thêm một non-SQL product family hoàn toàn mới

## Backlog Breakdown

### Story 1

Chốt scope `Db2 LUW`, supported versions, và runtime assumptions.

### Story 2

Add `DatabaseClientType.DB2`, default port mapping, và UI entry cho Db2.

### Story 3

Add Db2 parser / connection model awareness.

### Story 4

Choose and validate Db2 runtime driver strategy.

### Story 5

Add Db2 driver dependency và runtime adapter.

### Story 6

Register Db2 adapter trong driver factory và health-check path.

### Story 7

Enable Db2 query execution trong raw/editor query flows.

### Story 8

Normalize Db2 execution errors và result handling.

### Story 9

Implement Db2 metadata adapters cho workspace integration.

### Story 10

Gate unsupported features cleanly trong capability/profile layer.

### Story 11

Create Db2 fixture / test environment và validate end-to-end flows.

### Story 12

Plan feature-level Db2 expansion, starting with `Instance Insights`.

## Engineering Task Breakdown

### Track 1: Foundation

1. add DB2 enum and capability entry
2. add connection form option and default port
3. add parser recognition and normalization rules
4. add feature gating baseline

### Track 2: Runtime

1. evaluate `ibm_db` integration path
2. implement connection adapter
3. validate connect, ping, query, and close lifecycle
4. document runtime prerequisites for local and containerized environments

### Track 3: Query Runtime

1. wire Db2 into query execution path
2. verify parameter placeholder behavior
3. map result metadata into current result views
4. normalize common Db2 error shapes

### Track 4: Metadata Integration

1. read schemas/tables/views from Db2 catalog views
2. integrate Db2 into workspace tree
3. gate unsupported metadata surfaces explicitly

### Track 5: Delivery Safety

1. add Db2 fixture or test target
2. add smoke coverage for connect and query
3. verify UI does not expose unsupported flows as fully available

### Track 6: Follow-up Features

1. prepare capability contract for Db2 Instance Insights
2. assess Database Tools compatibility
3. define phase 2 / phase 3 rollout gates

## Potential Query Sources for Future Db2 Features

Nhóm source phù hợp cho phase sau:

- `SYSCAT.*` views cho metadata
- `MON_GET_DATABASE` cho database-level metrics
- `MON_GET_CONNECTION` cho connection metrics
- `MON_GET_APPL_LOCKWAIT` và `MON_GET_LOCKS` cho lock/wait insights
- `MON_GET_TABLESPACE` cho tablespace/storage metrics

## References

- IBM Db2 connection requirements:
  https://www.ibm.com/docs/en/data-product-hub/5.2.x?topic=connections-db2-connection
- IBM node-ibm_db driver:
  https://www.ibm.com/docs/ja/db2/11.1.0?topic=applications-nodejs
- IBM node-ibm_db installation on Linux/UNIX:
  https://www.ibm.com/docs/en/db2/12.1.x?topic=nodejs-installing-node-db-driver-linux-unix-systems
- IBM verifying node-ibm_db installation:
  https://www.ibm.com/docs/en/db2/11.1?topic=nodejs-verifying-node-db-driver-installation
- IBM catalog views:
  https://www.ibm.com/docs/en/db2/11.5.x?topic=sql-catalog-views
- IBM MON_GET_DATABASE:
  https://www.ibm.com/docs/en/db2/11.1?topic=functions-mon-get-database-get-database-metrics
- IBM MON_GET_CONNECTION:
  https://www.ibm.com/docs/en/db2/11.5?topic=functions-mon-get-connection-get-connection-metrics
- IBM MON_GET_APPL_LOCKWAIT:
  https://www.ibm.com/docs/en/db2/11.1?topic=mpf-mon-get-appl-lockwait-table-function-get-information-about-locks-which-application-is-waiting
- IBM MON_GET_LOCKS:
  https://www.ibm.com/docs/en/db2/11.5.x?topic=mmr-mon-get-locks-table-function-list-all-locks-in-currently-connected-database
- IBM MON_GET_TABLESPACE:
  https://www.ibm.com/docs/en/db2/12.1.x?topic=routines-mon-get-tablespace-get-table-space-metrics
