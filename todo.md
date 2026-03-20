## TODO: check list

- [x] dragable tab view container [done]
- [x] management explored ( maybe move to use json file in backend to store)
- [ ] management control history query
- [x] quick query view need to update
- [x] code editor cần update để show full thông tin của filed ( nâng cao : kiểu dữ liệu , icon cho field )
- [x] need to review UI/UX
- [x] refactor source code
- [x] luồng data flow đi đang có vấn đề , chưa support cho nhiều schema
- [x] //TODO: note for Nhat : when view detail ERD of once table , in related table have option show this table's related
      // ví dụ , xem user -> link tới position , profile , comment,
      // thì khi click vào bảng position có option xem related của position -> add thêm table for ERD
- [x] TODO: add menu context for table
- [x] TODO: Allow delete , delete many
- [x] TODO: Allow add row
- [x] TODO: Allow edit row
- [x] TODO: sync data when edit to row table
- [x] TODO: allow save data in control bar -> sync button -> trigger call api
- [x] TODO: use https://github.com/taozhi8833998/node-sql-parser to parse query and get column name

---- Connection

- [x] connection form pw field need to add show/hide password
- [x] connection form in ssl config | ssh tunnel, input allow drag and drop file to get content need show mini desc for each field for user know can drop

--- Management Connections

- [x] table in columns Connection Details only show `host:databaseName`

--- Command Palette

- [x] in command session convert to icon 'hugeicons'
- [x] show item instance info -> click open instance detail view
- [x] show item what news

--- What's New

- [x] check again in style of agent render markdown content to reuse UI
- [x] update ui of what's new with concept timeline

--- Raw query view

- [x] bug when change config space Density this not apply for codemirror editor | skip
- [x] button in footer raw query not consistent height togheter ( button explain , execute current)
- [x] allow command+j to toggle raw query result panel

--- agent

- [x] in this screen not alow user can toggle botton panel , right panel use definePageMeta -> notAllowBottomPanel
- [x] in useSystemCommands.ts : reuse map.set('cmd-show-instance-insights', async () => { action is the same in StatusBar.tsx -> open instance insight modal -> can refactor lại để tái sử dụng code
- [x] in instance insight modal : có tab watch Active Sessions thì update lại cho BE của OrcaQ khi bản thân connection thì cũng phải có application name để show trong session insight
- [x] config > editor have button reset to default setting editors setting
- [x] in each thread allow user can rename thread ( current default name is get first part of first message)
- [x] check again const chatUiVars = computed(() => ({ in layout/default và useSpaceDisplay(); xem có thể tái xử dụng không
- [x] tính năng search ở command palette chỉ work với data từ schema
- [x] useInstanceInsights //TODO: make it share able for open tab becasue in here not open openInstanceInsights only , check by keyword tabViewStore.openTab({

- [ ] update raw query when use execute query have `SELECT
  "pos"."id" AS "operatorId",
  COUNT(DISTINCT "pe"."id") AS "count"
FROM
  "payroll_errors" "pe"
  INNER JOIN "payrolls" "p" ON "pe"."payroll_id" = "p"."id"
  INNER JOIN "weeks" "sw" ON "p"."start_week_id" = "sw"."id"
  INNER JOIN "weeks" "ew" ON "p"."end_week_id" = "ew"."id"
  INNER JOIN "positions" "pos" ON "pos"."id" = "pe"."operator_position_id"
WHERE
  "p"."division_id" = $1
  AND "p"."season_id" = $2
  AND "sw"."start_date" >= $3
  AND "ew"."end_date" <= $4
GROUP BY
  "pos"."id"
HAVING
  COUNT(DISTINCT "pe"."id") BETWEEN $5 AND $6
  -- PARAMETERS: ["aa52e0f9-d8c2-4a6d-9baa-4641353297cf","0b4c12cb-c9a7-4cd6-bdb2-f8bec2df4110","2026-02-28T17:00:00.000Z","2026-05-29T16:59:59.999Z",0,5]
;
-- openPARAMETERS mode`

- [ ] gen test case for raw query view after update - [ ] with nomal query - [ ] with error query - [ ] with empty result query (just show message query success but no records found , update for case mutation query) - [ ] with explain query - [ ] with query have variable - [ ] with query have variable inline

- [x] check command type by docs https://www.postgresql.org/docs/current/sql-commands.html create factory for scale (update in ResultTabResultView need move this to utils )

- [x] nên tạo 1 hook quản lý tất cả việc mở tab chứ k nên tạo 1 hook chỉ dành riêng cho useInstanceInsights , vì còn nhiều nơi cũng mở tab mà mở tab rất riêng ( ví dụ như ở useManagementExplorerTree ,ManagementSchemas , ManagementSchemas,ManagementUsersAndPermission,...)

- [x] check executeStreamingQuery khi có error
- [ ] update erd (update in sidebar header icon to hugeicons:workflow-square-10, update for each item -> hugeicons:flow-connection)
