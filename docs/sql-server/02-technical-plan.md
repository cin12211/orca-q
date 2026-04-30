# Technical Plan: SQL Server Support

## Objective

Biến SQL Server từ trạng thái `known-but-not-supported` thành một SQL family có thể dùng thực tế trong HeraQ.

## Current Technical State

### Already present

- `DatabaseClientType.MSSQL`
- default port `1433`
- UI listing for SQL Server in connection selection
- parser-level awareness in some utilities

### Missing or not active

- runtime SQL Server driver dependency
- SQL Server adapter in `server/infrastructure/driver/factory.ts`
- SQL Server database adapter implementation
- metadata/query/domain adapters for SQL Server
- capability profile validation end-to-end

References:

- [core/constants/database-client-type.ts](/Volumes/Cinny/Cinny/Project/HeraQ/core/constants/database-client-type.ts:20)
- [components/modules/connection/constants/index.ts](/Volumes/Cinny/Cinny/Project/HeraQ/components/modules/connection/constants/index.ts:70)
- [server/infrastructure/driver/factory.ts](/Volumes/Cinny/Cinny/Project/HeraQ/server/infrastructure/driver/factory.ts:16)

## Feasibility Assessment

## Product complexity

- medium

Reason:

- SQL Server is still a mainstream relational DB with predictable connection/query/metadata patterns
- not as structurally different as Redis
- not as permission-heavy as Oracle in early phases

## Codebase complexity

- medium-high

Reason:

- support is not only a feature task
- it is also a platform/runtime enablement task
- current code suggests preparatory intent, not usable implementation

## Recommendation

Treat `support-sql-server` as a mini-program with 2 layers:

1. Foundation enablement
2. Product feature integration

## Technical Workstreams

### Workstream 1: Runtime Driver Enablement

Goal:

- make SQL Server connection and query runtime actually work

Tasks:

1. Choose driver strategy
2. Add package dependency
3. Implement SQL Server adapter in `server/infrastructure/driver`
4. Register adapter in `factory.ts`
5. Validate connection lifecycle and destroy flow

Open decision:

- likely `mssql` package or underlying `tedious`-based integration

## Workstream 2: Query Layer Integration

Goal:

- allow query execution and result handling through existing SQL surfaces

Tasks:

1. Validate parameter substitution behavior for MSSQL
2. Validate command/result handling in raw query and editor flows
3. Validate error normalization
4. Validate streaming/non-streaming query paths

Note:

- some parser/query utility awareness for MSSQL already exists, but runtime execution support is still missing

## Workstream 3: Metadata / App Shell Integration

Goal:

- integrate SQL Server into the normal SQL workspace experience

Tasks:

1. Implement metadata adapter(s)
2. Implement tables/views/functions support where needed
3. Integrate schema tree capability
4. Validate connection capability profile
5. Ensure unsupported flows are gated properly

## Workstream 4: Future Feature Enablement

Goal:

- prepare SQL Server for feature-level expansion

Potential follow-up features:

- Instance Insights
- Database Tools
- Backup/restore flows
- Role/user inspection

These should not block phase 1 runtime support.

## Suggested Delivery Phases

## Phase 0: Discovery / Architecture Decision

Deliverables:

- confirm driver choice
- confirm connection model
- confirm minimal supported SQL Server versions / environments

Output:

- driver decision
- capability matrix
- risk confirmation

## Phase 1: Runtime Enablement

Deliverables:

- SQL Server driver package
- SQL Server runtime adapter
- adapter factory registration
- health check working

Acceptance:

- can create and validate a SQL Server connection

## Phase 2: Query Support

Deliverables:

- execute query support
- result handling support
- error normalization support

Acceptance:

- SQL Server query can run in normal query surfaces

## Phase 3: Metadata / Workspace Integration

Deliverables:

- metadata adapters
- schema/app shell integration
- capability gating

Acceptance:

- SQL Server can participate in workspace flows at a meaningful level

## Phase 4: Feature Expansion

Deliverables:

- SQL Server-specific advanced features
- first candidate: `Instance Insights`

Acceptance:

- SQL Server no longer only “connects”, but has feature-level value

## Technical Risks

### Risk 1

Driver integration may require additional connection option mapping.

### Risk 2

Metadata model may differ enough to require extra SQL Server-specific branching.

### Risk 3

Feature coverage may look broad in UI before runtime is truly stable.

### Risk 4

Test environment setup for SQL Server may add infra overhead.

## Mitigations

- keep phase 1 narrow and measurable
- ship gated capabilities instead of pretending full support
- create a real SQL Server integration test path early

## Resource / Effort Estimate

### Engineering effort

- medium-high

### PM / coordination effort

- medium

### Infra / QA effort

- medium

### Compared with existing DB additions

- heavier than adding a light variant of existing support
- lighter than introducing a completely non-SQL product family

## Backlog Breakdown

### Story 1

Choose and validate SQL Server runtime driver strategy.

### Story 2

Add SQL Server driver dependency and runtime adapter.

### Story 3

Register SQL Server adapter in driver factory and health-check path.

### Story 4

Enable SQL Server query execution in raw/editor query flows.

### Story 5

Normalize SQL Server execution errors and result handling.

### Story 6

Implement SQL Server metadata adapters for workspace integration.

### Story 7

Gate unsupported features cleanly in capability/profile layer.

### Story 8

Create SQL Server fixture / test environment and validate end-to-end flows.

### Story 9

Plan feature-level SQL Server expansion, starting with Instance Insights.

## Engineering Task Breakdown

### Track 1: Foundation

1. choose driver package and supported SQL Server version range
2. define connection options mapping
3. implement runtime adapter and register in factory
4. validate connect, ping, and destroy lifecycle

### Track 2: Query Runtime

1. wire MSSQL into query execution path
2. validate parameter binding and result mapping
3. normalize runtime and SQL errors
4. verify behavior in streaming and non-streaming paths where applicable

### Track 3: Metadata Integration

1. implement metadata reader for databases, schemas, tables, and views
2. plug MSSQL into workspace/app shell capability checks
3. gate unsupported metadata surfaces explicitly

### Track 4: Delivery Safety

1. add SQL Server fixture or compose-based test target
2. add end-to-end smoke coverage for connect and query
3. verify UX does not expose unsupported flows as fully available

### Track 5: Follow-up Features

1. prepare capability contract for SQL Server Instance Insights
2. assess Database Tools compatibility such as schema diff and backup/restore
3. define phase 2 and phase 3 rollout gates

## Conclusion

`support-sql-server` là một task hợp lý và có giá trị cao, nhưng không phải việc nhỏ.

Nếu nói ngắn gọn:

- không quá phức tạp về product direction
- nhưng tốn resource vừa phải đến khá do thiếu runtime foundation trong repo hiện tại

Kết luận cuối:

- nên làm
- nên tách phase
- nên coi đây là một mini-epic thay vì một single implementation ticket
