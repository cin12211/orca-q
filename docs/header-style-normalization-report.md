# Header Style Normalization Report

## Scope

Chuẩn hoá header của các màn:

1. `Instance Insights`
2. `Schema Diff`
3. `Backup & Restore`
4. `Redis Instance Insights`
5. `Redis Pub/Sub`

Mục tiêu: đưa các header chưa có card border về cùng pattern với `Instance Insights`.

## Canonical Style

Lấy `Instance Insights` làm chuẩn.

Reference:

- [components/modules/instance-insights/InstanceInsightsPanel.vue](/Volumes/Cinny/Cinny/Project/HeraQ/components/modules/instance-insights/InstanceInsightsPanel.vue:98)

Pattern chuẩn:

- Header là một card riêng: `rounded-lg border bg-background p-3`
- Bên trái: `icon + title`
- Dòng phụ: context metadata như connection/database/version
- Bên phải: action group như refresh, selector, toggle
- Title level cố định: `h2 text-base font-medium`
- Metadata dùng `text-sm text-muted-foreground`
- Badge phụ dùng cùng token: `outline`, `h-5`, `px-1.5`, `text-xxs`, `font-normal`

## Current Differences

### 1. Instance Insights

Status: chuẩn nhất, dùng làm canonical style.

Điểm đúng:

- Có card header riêng
- Có title hierarchy rõ
- Có metadata row rõ
- Có action cluster bên phải

### 2. Redis Instance Insights

Reference:

- [components/modules/instance-insights/RedisInstanceInsightsPanel.vue](/Volumes/Cinny/Cinny/Project/HeraQ/components/modules/instance-insights/RedisInstanceInsightsPanel.vue:58)

Status: gần đúng nhưng chưa đồng bộ hoàn toàn.

Khác biệt:

- Tên đang là `Redis Instance Insight`, lệch với kiểu plural của `Instance Insights`
- Chưa có pattern metadata giống hẳn bản SQL
- Action layout khá gần chuẩn nhưng vẫn là variant riêng

Recommendation:

- Đổi naming về `Redis Instance Insights`
- Giữ card header hiện tại nhưng align spacing, metadata và badge token theo `Instance Insights`

### 3. Schema Diff

Reference:

- [components/modules/database-tools/schema-diff/containers/SchemaDiffContainer.vue](/Volumes/Cinny/Cinny/Project/HeraQ/components/modules/database-tools/schema-diff/containers/SchemaDiffContainer.vue:54)

Status: header text trần, chưa theo chuẩn.

Khác biệt:

- Không có card border
- Chỉ có title + description
- Không có action zone rõ trong header

Recommendation:

- Bọc title area thành card header giống `Instance Insights`
- Thêm icon `git-compare`
- Giữ `SchemaDiffConnectionSelector` ở hàng dưới, không nhét vào shared header

### 4. Backup & Restore

Reference:

- [components/modules/database-tools/backup-restore/containers/BackupRestoreContainer.vue](/Volumes/Cinny/Cinny/Project/HeraQ/components/modules/database-tools/backup-restore/containers/BackupRestoreContainer.vue:160)

Status: header text trần, chưa theo chuẩn.

Khác biệt:

- Không có card border
- Chỉ có title + db name / connection label
- Tabs nằm dưới nhưng không có visual separation mạnh với header

Recommendation:

- Bọc phần title/context thành card header
- Thêm icon phù hợp cho `Backup & Restore`
- Giữ tabs ở layer riêng bên dưới header

### 5. Redis Pub/Sub

Reference:

- [components/modules/redis-workspace/components/RedisPubSubPanel.vue](/Volumes/Cinny/Cinny/Project/HeraQ/components/modules/redis-workspace/components/RedisPubSubPanel.vue:310)

Status: lệch nhiều nhất.

Khác biệt:

- Không có card border
- Title dùng `text-sm font-semibold`, nhìn như section title hơn là page header
- DB selector và refresh đứng cùng hàng nhưng chưa nằm trong header card pattern
- Summary badges đang tách thành một hàng riêng giữa header và content, tạo cảm giác layout rời

Recommendation:

- Đổi sang header card giống `Instance Insights`
- Trái: icon + `Redis Pub/Sub`
- Dòng phụ: context connection/database + `DB n` badge
- Phải: `RedisDBSelector` + `Refresh`
- Dời summary badges xuống dưới header như sub-toolbar hoặc summary row

## Naming Inconsistencies

Hiện tại naming chưa đồng bộ:

- `Instance Insight` ở launcher database tools
- `Instance Insights` ở panel chính
- `Redis Instance Insight` ở Redis tools và Redis panel

References:

- [components/modules/management/database-tools/ManagementDatabaseTools.vue](/Volumes/Cinny/Cinny/Project/HeraQ/components/modules/management/database-tools/ManagementDatabaseTools.vue:97)
- [components/modules/management/redis-tools/ManagementRedisTools.vue](/Volumes/Cinny/Cinny/Project/HeraQ/components/modules/management/redis-tools/ManagementRedisTools.vue:47)

Recommendation:

- Dùng thống nhất:
  - `Instance Insights`
  - `Redis Instance Insights`
  - `Schema Diff`
  - `Backup & Restore`
  - `Redis Pub/Sub`

## Proposed Shared Header Contract

Không nên shared cả tabs/content toolbar. Chỉ shared phần header.

Shared component nên cover:

- `icon`
- `title`
- `subtitle` hoặc `context row`
- `badges`
- `actions`
- optional `meta` như `Last updated`

Nên dùng:

- `props` cho dữ liệu đơn giản: `title`, `icon`, `description`
- `slots` cho phần linh hoạt: `context`, `actions`, `meta`

Không nên:

- hardcode tabs vào component này
- nhét logic riêng của từng màn vào component chung

## Implementation Plan

### Phase 1: Define Style Contract

- Chốt `Instance Insights` là canonical pattern
- Chốt naming chuẩn
- Chốt spacing/token cho title, metadata, badges, actions

### Phase 2: Create Shared Header Component

Component đề xuất:

- `ToolPageHeader.vue` hoặc `ModulePageHeader.vue`

Responsibility:

- Render header card thống nhất
- Expose slots cho context/actions/meta
- Không render tabs

### Phase 3: Migrate Low-Risk Screens First

Thứ tự nên làm:

1. `Schema Diff`
2. `Backup & Restore`
3. `Redis Pub/Sub`
4. `Redis Instance Insights`

Lý do:

- `Schema Diff` và `Backup & Restore` chỉ cần bọc lại header
- `Redis Pub/Sub` cần chỉnh layout nhiều hơn
- `Redis Instance Insights` đã gần chuẩn, làm cuối để fine-tune

### Phase 4: Align Launchers

Update copy ở các launcher card để cùng naming với page header:

- [components/modules/management/database-tools/ManagementDatabaseTools.vue](/Volumes/Cinny/Cinny/Project/HeraQ/components/modules/management/database-tools/ManagementDatabaseTools.vue:97)
- [components/modules/management/redis-tools/ManagementRedisTools.vue](/Volumes/Cinny/Cinny/Project/HeraQ/components/modules/management/redis-tools/ManagementRedisTools.vue:47)

### Phase 5: Visual QA

Check lại:

- title hierarchy
- left/right alignment
- spacing giữa header và content
- responsive khi action nhiều
- consistency giữa SQL tools và Redis tools

## Suggested Tasks

### Task 1

Define canonical header style for tool pages based on `Instance Insights`.

### Task 2

Create shared `ToolPageHeader` component with slot-based API.

### Task 3

Migrate `Schema Diff` to shared header component.

### Task 4

Migrate `Backup & Restore` to shared header component.

### Task 5

Migrate `Redis Pub/Sub` to shared header component and reorganize summary badges.

### Task 6

Align `Redis Instance Insight(s)` naming and header metadata with canonical pattern.

### Task 7

Update launcher labels for consistency with final page titles.

## Conclusion

Vấn đề chính không phải chỉ là thiếu border, mà là chưa có một header contract chung cho tool pages.

Hướng chuẩn:

- Dùng `Instance Insights` làm canonical style
- Shared phần header card
- Không shared tabs/content toolbar
- Migrate dần theo thứ tự rủi ro thấp trước

## Docker Plan For Native Backup Tools

Context thêm để lên task riêng:

Native backup/export-import hiện không chạy qua driver Node thuần. Runtime đang gọi trực tiếp CLI tools bằng `spawn(...)` trong:

- [server/infrastructure/database/backup/native-backup-jobs.ts](/Volumes/Cinny/Cinny/Project/HeraQ/server/infrastructure/database/backup/native-backup-jobs.ts:454)

Điều đó có nghĩa là nếu app chạy trong Docker thì **runner image phải có sẵn binary tương ứng**, nếu không export/import sẽ fail ở runtime với lỗi kiểu `ENOENT` / `CLI_NOT_FOUND`.

### What The Runtime Actually Needs

Từ code hiện tại:

- PostgreSQL export: `pg_dump`
- PostgreSQL import:
  - `.dump` dùng `pg_restore`
  - `.sql` dùng `psql`
- MySQL/MariaDB export:
  - ưu tiên `mysqlpump`
  - fallback sang `mysqldump`
- MySQL/MariaDB import: `mysql`
- SQLite export/import: `sqlite3`

References:

- [server/infrastructure/database/backup/native-backup.ts](/Volumes/Cinny/Cinny/Project/HeraQ/server/infrastructure/database/backup/native-backup.ts:64)
- [server/infrastructure/database/backup/native-backup-jobs.ts](/Volumes/Cinny/Cinny/Project/HeraQ/server/infrastructure/database/backup/native-backup-jobs.ts:643)
- [server/infrastructure/database/backup/native-backup-jobs.ts](/Volumes/Cinny/Cinny/Project/HeraQ/server/infrastructure/database/backup/native-backup-jobs.ts:830)
- [server/infrastructure/database/backup/native-backup-jobs.ts](/Volumes/Cinny/Cinny/Project/HeraQ/server/infrastructure/database/backup/native-backup-jobs.ts:913)
- [server/infrastructure/database/backup/native-backup-jobs.ts](/Volumes/Cinny/Cinny/Project/HeraQ/server/infrastructure/database/backup/native-backup-jobs.ts:948)
- [server/infrastructure/database/backup/native-backup-jobs.ts](/Volumes/Cinny/Cinny/Project/HeraQ/server/infrastructure/database/backup/native-backup-jobs.ts:1072)
- [server/infrastructure/database/backup/native-backup-jobs.ts](/Volumes/Cinny/Cinny/Project/HeraQ/server/infrastructure/database/backup/native-backup-jobs.ts:1110)

### Current Docker Gap

Dockerfile hiện tại:

- builder stage chỉ cài `bash` và `curl`
- runner stage không cài bất kỳ DB client CLI nào

Reference:

- [Dockerfile](/Volumes/Cinny/Cinny/Project/HeraQ/Dockerfile:1)

Kết luận:

- Native backup feature sẽ không hoạt động ổn định trong container runner hiện tại
- Lỗi sẽ chỉ lộ ra khi user chạy export/import thật

### Recommended Docker Direction

#### 1. Pin Alpine Tag Explicitly

Hiện image đang dùng `node:22-alpine`, tag này có thể trôi giữa các bản Alpine khác nhau.

Nên đổi sang explicit tag, ví dụ:

- `node:22-alpine3.22`

Lý do:

- tránh drift package name giữa Alpine versions
- dễ maintain `apk add` package list

Source:

- Docker Hub Node official image currently exposes explicit tags như `22-alpine3.22` trên trang official image: https://hub.docker.com/_/node

#### 2. Install DB Client Tools In Runner Stage

Chỉ runner stage mới thật sự cần các CLI này để xử lý backup jobs.

Không cần cài vào builder trừ khi sau này build/test có step phụ thuộc các binary đó.

#### 3. Package Mapping For Alpine

Trên Alpine 3.22, plan package nên là:

- PostgreSQL: `postgresql17-client`
- MySQL/MariaDB: `mariadb-client`
- SQLite: `sqlite`

Lưu ý:

- `mysql-client` trên Alpine 3.22 là dummy migration package; nên cài thẳng `mariadb-client`
- `sqlite` package cung cấp command `sqlite3`

Sources:

- `postgresql17-client` package details: https://pkgs.alpinelinux.org/package/v3.22/main/x86_64/postgresql17-client
- `mariadb-client` package details: https://pkgs.alpinelinux.org/package/v3.22/main/x86/mariadb-client
- `mysql-client` dummy migration package: https://pkgs.alpinelinux.org/package/v3.22/main/x86_64/mysql-client
- `sqlite` provides `cmd:sqlite3`: https://pkgs.alpinelinux.org/package/v3.22/main/x86_64/sqlite

#### 4. Do Not Block On `mysqlpump`

Code đã có fallback:

- export MySQL/MariaDB sẽ thử `mysqlpump`
- nếu binary không có, flow fallback sang `mysqldump`

Vì vậy requirement tối thiểu thực tế là:

- `mysqldump`
- `mysql`

Không nhất thiết phải ép image phải có `mysqlpump`, miễn package client đang cài có `mysqldump`.

Reference:

- [server/infrastructure/database/backup/native-backup-jobs.ts](/Volumes/Cinny/Cinny/Project/HeraQ/server/infrastructure/database/backup/native-backup-jobs.ts:822)
- [server/infrastructure/database/backup/native-backup-jobs.ts](/Volumes/Cinny/Cinny/Project/HeraQ/server/infrastructure/database/backup/native-backup-jobs.ts:1144)

#### 5. Oracle Is Out Of Scope

Không cần thêm `expdp` / `impdp` vào Docker lúc này.

Lý do:

- Oracle native backup hiện đang disabled ở capability layer

Reference:

- [server/infrastructure/database/backup/native-backup.ts](/Volumes/Cinny/Cinny/Project/HeraQ/server/infrastructure/database/backup/native-backup.ts:103)

### Suggested Docker Task Breakdown

#### Task A

Pin base images from `node:22-alpine` to explicit Alpine tag.

#### Task B

Add native backup runtime dependencies to runner stage:

- `postgresql17-client`
- `mariadb-client`
- `sqlite`

#### Task C

Document in Dockerfile comment why these binaries are required:

- `pg_dump`, `pg_restore`, `psql`
- `mysqldump`, `mysql`
- `sqlite3`

#### Task D

Add smoke verification step to CI or container QA:

- `pg_dump --version`
- `pg_restore --version`
- `psql --version`
- `mysql --version`
- `mysqldump --version`
- `sqlite3 --version`

#### Task E

Run an end-to-end manual verification in containerized environment for:

1. PostgreSQL export `.dump`
2. PostgreSQL export `.sql`
3. PostgreSQL import `.dump`
4. PostgreSQL import `.sql`
5. MySQL or MariaDB export/import `.sql`
6. SQLite export/import `.sql`

### Extra Caveat Found In UI

Hiện tại container backup screen còn có một caveat riêng không liên quan trực tiếp đến Docker package:

- `BackupRestoreUnsupportedAlert` đang bị render vô điều kiện do `v-if="!nativeBackupSupported || true"`

Reference:

- [components/modules/database-tools/backup-restore/containers/BackupRestoreContainer.vue](/Volumes/Cinny/Cinny/Project/HeraQ/components/modules/database-tools/backup-restore/containers/BackupRestoreContainer.vue:204)

Điều này không đổi fact rằng runner thiếu CLI tools, nhưng nếu lên task hoàn chỉnh thì nên tách riêng:

- task Docker runtime dependencies
- task fix UI gating / unsupported alert logic
