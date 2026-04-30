# Db2 Support

## Purpose

Bộ tài liệu này tách riêng task `support-db2` khỏi các scope DB khác.

Mục tiêu:

- đánh giá việc support IBM Db2 trong HeraQ
- define requirement ở góc nhìn BA
- phân tích delivery ở góc nhìn PM / technical planning

## Scope Boundary

Trong bộ tài liệu này, `Db2` được hiểu là:

- `Db2 for Linux, UNIX, and Windows (Db2 LUW)`

Không bao gồm trong phase đầu:

- `Db2 for z/OS`
- `Db2 for i`

Lý do:

- 3 dòng sản phẩm này có catalog, connectivity, privilege model, và operational surface khác nhau
- nếu không chốt ngay từ đầu, task sẽ bị mở rộng sai scope

## Files

- `01-ba-requirements.md`
  - requirement, scope, business value, acceptance criteria
- `02-technical-plan.md`
  - technical analysis, delivery phases, dependencies, risk, backlog breakdown

## Current Assessment

Db2 không phải task nhỏ trong codebase hiện tại.

So với `SQL Server`, Db2 còn nặng hơn ở bước enable nền tảng vì:

- hiện chưa có `DatabaseClientType.DB2`
- chưa có UI entry / parser awareness / default port mapping
- chưa có runtime adapter trong `server/infrastructure/driver/factory.ts`
- chưa có dependency Node.js driver cho Db2 trong `package.json`
- Db2 Node.js runtime còn kéo theo yêu cầu driver/client setup riêng

Code references:

- [core/constants/database-client-type.ts](/Volumes/Cinny/Cinny/Project/HeraQ/core/constants/database-client-type.ts:1)
- [components/modules/connection/constants/index.ts](/Volumes/Cinny/Cinny/Project/HeraQ/components/modules/connection/constants/index.ts:1)
- [core/helpers/parser-connection-string.ts](/Volumes/Cinny/Cinny/Project/HeraQ/core/helpers/parser-connection-string.ts:32)
- [server/infrastructure/driver/factory.ts](/Volumes/Cinny/Cinny/Project/HeraQ/server/infrastructure/driver/factory.ts:1)
- [package.json](/Volumes/Cinny/Cinny/Project/HeraQ/package.json:1)

## External References

- IBM Db2 connection requirements:
  https://www.ibm.com/docs/en/data-product-hub/5.2.x?topic=connections-db2-connection
- IBM node-ibm_db driver:
  https://www.ibm.com/docs/ja/db2/11.1.0?topic=applications-nodejs
- IBM node-ibm_db installation on Linux/UNIX:
  https://www.ibm.com/docs/en/db2/12.1.x?topic=nodejs-installing-node-db-driver-linux-unix-systems
- IBM catalog views:
  https://www.ibm.com/docs/en/db2/11.5.x?topic=sql-catalog-views
