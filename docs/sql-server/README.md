# SQL Server Support

## Purpose

Bộ tài liệu này tách riêng task `support-sql-server` khỏi scope `instance-insight-update`.

Mục tiêu:

- đánh giá việc support SQL Server trong HeraQ
- define requirement ở góc nhìn BA
- phân tích delivery ở góc nhìn PM / technical planning

## Files

- `01-ba-requirements.md`
  - requirement, scope, business value, acceptance criteria
- `02-technical-plan.md`
  - technical analysis, delivery phases, dependencies, risk, backlog breakdown

## Current Assessment

SQL Server không phải là một task “cắm thêm nhẹ” trong codebase hiện tại.

Lý do:

- đã có `DatabaseClientType.MSSQL` ở một số bề mặt UI / parser
- nhưng chưa có runtime driver adapter trong SQL driver factory
- chưa có metadata/query/domain adapters cho MSSQL
- chưa có dependency runtime tương ứng trong `package.json`

Code references:

- [core/constants/database-client-type.ts](/Volumes/Cinny/Cinny/Project/HeraQ/core/constants/database-client-type.ts:20)
- [components/modules/connection/constants/index.ts](/Volumes/Cinny/Cinny/Project/HeraQ/components/modules/connection/constants/index.ts:70)
- [server/infrastructure/driver/factory.ts](/Volumes/Cinny/Cinny/Project/HeraQ/server/infrastructure/driver/factory.ts:16)
