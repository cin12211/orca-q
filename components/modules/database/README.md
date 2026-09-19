# components/modules/database

Per-DB feature modules. Mỗi DB type là 1 folder, trong đó chia theo module lớn mà DB đó support.

## Structure

- `postgres/` : schemas, raw-query, quick-query, erd, roles, tools (6 - full SQL)
- `maria/`    : schemas, raw-query, quick-query, erd, roles, tools (6 - full SQL, roles có thể limited)
- `sqlite3/`  : schemas, raw-query, quick-query, erd, tools (5 - không roles)
- `mongo/`    : schemas, raw-query, quick-query (3)
- `redis/`    : schemas, raw-query, quick-query, tools (4)

## Quy ước

- `schemas/` gom `ManagementSchemas.vue` (SQL), `ManagementMongoSchemas.vue`, `ManagementRedisBrowser.vue` đang loạn ở `management/`
- `manifest.ts` mỗi DB khai báo `modules` để `PrimarySideBar.vue` và `getVisibleActivityItems` load dynamic
- `_shared/` nếu có logic chung thì để ngoài, không duplicate per-DB

## Migration TODO

1. Move `management/schemas/*` -> `database/postgres/schemas` + `database/mongo/schemas`
2. Move `management/redis-browser/*` -> `database/redis/schemas`
3. Move `quick-query/*` -> `database/postgres/quick-query` (giữ `quick-query/mongodb` -> `database/mongo/quick-query`)
4. Move `raw-query/components/pg|mongo|redis` -> `database/<type>/raw-query`
5. Move `erd-diagram/*` -> `database/postgres/erd` (và `maria/sqlite3/erd`)
6. Move `management/role-permission` -> `database/postgres/roles`
7. Move `management/database-tools|redis-tools` -> `database/<type>/tools`
