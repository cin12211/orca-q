# Tauri Auto Update Audit

Date: 2026-03-29

## Scope

Audit phần auto update của desktop app `orcaq` dựa trên:

- code/config hiện tại trong repo
- tài liệu chính thức của Tauri
- trạng thái endpoint release đang được app trỏ tới ở thời điểm kiểm tra

Lưu ý: phiên Codex này không có MCP/Context7 server được cấu hình, nên phần đối chiếu docs được thực hiện bằng tài liệu chính thức của Tauri và repo chính thức của `tauri-action`.

## Kết luận ngắn

Phần triển khai **trong code app** đang đi đúng hướng và đã có gần đủ các mảnh quan trọng của Tauri updater:

- đã bật `tauri-plugin-updater`
- đã khai báo capability cho updater
- đã cấu hình `pubkey` và `endpoints`
- đã có flow `check -> downloadAndInstall -> relaunch`
- đã có startup check và background check
- đã có CI workflow để upload updater artifacts

Nhưng xét **end-to-end thực tế**, auto update hiện tại **chưa được xem là hoàn chỉnh/đang hoạt động ổn định**, vì có ít nhất 2 vấn đề quan trọng:

1. Endpoint updater hiện cấu hình trong app đang trả về `404`.
2. Version desktop hiện đang lệch giữa `package.json` và cấu hình Tauri.

Nói ngắn gọn: **code-side khá đúng, nhưng release-side hiện chưa khép kín nên updater chưa đáng tin là đang chạy được ngoài production**.

## Tài liệu đối chiếu

### 1. Tauri updater docs

https://v2.tauri.app/ko/plugin/updater/

Các điểm quan trọng từ docs:

- static `latest.json` cần có tối thiểu `version`, `platforms.[target].url`, `platforms.[target].signature`
- Tauri validate toàn bộ file trước khi check version
- luồng JS chuẩn là `check()` -> `update.downloadAndInstall(...)` -> `relaunch()`
- Windows có option `plugins.updater.windows.installMode`, mặc định `passive`

### 2. Tauri distribute docs

https://v2.tauri.app/distribute/

Điểm quan trọng:

- version app nên được quản lý ở `tauri.conf.json > version`

### 3. tauri-action docs

https://github.com/tauri-apps/tauri-action

Điểm quan trọng:

- `uploadUpdaterJson: true` dùng để upload file updater JSON khi updater đã được cấu hình
- action này phù hợp khi dùng GitHub Release làm updater endpoint

## Những gì hiện tại đang đúng

### 1. Plugin updater đã được bật ở Rust side

File: `src-tauri/src/lib.rs`

- Có `tauri_plugin_updater::Builder::new().build()`
- Có `tauri_plugin_process::init()` để hỗ trợ relaunch từ frontend

Nhận định: đúng với flow được Tauri docs khuyến nghị.

### 2. Updater đã được cấp quyền trong capability

File: `src-tauri/capabilities/default.json`

- Có `updater:default`
- Có `process:default`

Nhận định: đúng. Nếu thiếu capability này thì frontend không gọi updater/process được.

### 3. `tauri.conf.json` đã có cấu hình updater cơ bản đúng

File: `src-tauri/tauri.conf.json`

- `bundle.createUpdaterArtifacts = true`
- `plugins.updater.pubkey` đã được nhúng vào app
- `plugins.updater.endpoints` đã trỏ tới GitHub Releases

Nhận định: đúng với mô hình static updater JSON mà Tauri docs mô tả.

### 4. Frontend flow updater được triển khai đúng kiểu Tauri

Files:

- `core/platform/tauri-updater.ts`
- `core/composables/useTauriUpdater.ts`

Hiện tại app đã có:

- `check()` để tìm bản mới
- `downloadAndInstall()` để tải và cài
- progress callback
- `relaunch()` để apply update
- trạng thái `checking`, `available`, `downloading`, `ready-to-restart`, `error`

Nhận định: về mặt API usage, flow này đúng với docs của Tauri updater.

### 5. App đã có startup check và background check

File: `plugins/05.tauri-updater.client.ts`

- check một lần khi app lên
- tiếp tục check nền theo interval 6 giờ

Nhận định: hợp lý cho desktop app. Đây là phần UX bổ sung, không bắt buộc nhưng là hướng tốt.

### 6. Workflow release đã chuẩn bị đúng các biến ký updater

File: `.github/workflows/tauri-release.yml`

- có truyền `TAURI_SIGNING_PRIVATE_KEY`
- có truyền `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- có bật `uploadUpdaterJson: true`
- có bật `uploadUpdaterSignatures: true`

Nhận định: về intent thì đúng với release flow của Tauri updater.

## Những gì đang thiếu hoặc có vấn đề

### 1. Endpoint updater đang hỏng ở thời điểm audit

File cấu hình:

- `src-tauri/tauri.conf.json`

Endpoint hiện tại:

- `https://github.com/cin12211/orca-q/releases/latest/download/latest.json`

Kết quả kiểm tra ngày 2026-03-29:

- `curl` vào URL trên trả về `404`
- GitHub API `https://api.github.com/repos/cin12211/orca-q/releases/latest` trả về latest release là `v1.0.20` xuất bản ngày `2026-01-11`
- release đó có `assets: []`

Tác động:

- app sẽ không lấy được `latest.json`
- auto update thực tế không thể hoạt động end-to-end

Đây là vấn đề lớn nhất hiện tại.

### 2. Version desktop đang lệch nhau

Files:

- `package.json`: `1.0.32`
- `src-tauri/tauri.conf.json`: `1.0.31`
- `src-tauri/Cargo.toml`: `1.0.31`

Theo Tauri docs, version app nên lấy từ `tauri.conf.json > version`.

Tác động:

- desktop app hiện build ra sẽ nhận version `1.0.31`, không phải `1.0.32`
- rất dễ gây lệch tag release, changelog, UX hiển thị version, và logic so sánh update
- repo đã có `scripts/sync-version.mjs` để đồng bộ version, nhưng hiện trạng đang cho thấy sync chưa được chạy hoặc chưa được enforce

Vấn đề này không chắc chắn luôn làm updater fail, nhưng là một rủi ro release đáng sửa ngay.

### 3. Release workflow đúng cấu hình nhưng chưa chứng minh được artifact updater thật sự đang được publish

File:

- `.github/workflows/tauri-release.yml`

Workflow có vẻ đúng, nhưng trạng thái release public hiện tại cho thấy:

- latest release không có asset
- `latest.json` không tồn tại

Tức là một trong các khả năng sau đang xảy ra:

- workflow chưa được chạy cho các version mới
- workflow chạy lỗi
- tag release không khớp version Tauri
- assets được upload vào release khác, hoặc release draft, hoặc không phải latest release

Đây là gap ở layer phát hành, không phải layer code.

### 4. UX hiện tại assume mọi platform đều “download xong rồi restart thủ công”

File:

- `core/composables/useTauriUpdater.ts`

Sau `downloadAndInstall()`, app luôn chuyển sang:

- `ready-to-restart`
- hiện toast yêu cầu user bấm restart

Tauri docs cho biết Windows có behavior cài đặt riêng và có `installMode`.

Nhận định:

- không sai hoàn toàn
- nhưng là chỗ nên audit kỹ hơn trên Windows, vì hành vi thật có thể không giống hoàn toàn macOS/Linux
- nếu sản phẩm phát hành cho Windows thì nên test packaged build thực tế, không chỉ test logic ở dev

Đây là **thiếu test/validation platform-specific**, chưa phải lỗi chắc chắn.

### 5. Chưa thấy bằng chứng test packaged updater flow

Tôi thấy code UI/composable khá đầy đủ, nhưng chưa thấy trong repo:

- checklist smoke test cho updater packaged build
- test release artifact availability
- verify `latest.json` sau publish
- verify macOS / Windows / Linux đều có entry hợp lệ trong updater JSON

Tauri docs lưu ý static JSON phải hợp lệ cho toàn bộ platforms hiện có; nếu một entry sai, updater có thể fail trước cả bước compare version.

Đây là thiếu ở release validation.

## Đánh giá theo từng lớp

### Code/app layer

Đánh giá: **đúng phần lớn**

Lý do:

- đã dùng đúng plugin
- đúng capability
- đúng flow API
- có UI/status/progress tương đối đầy đủ

### Config layer

Đánh giá: **gần đúng nhưng còn một lỗi quan trọng**

Lý do:

- updater config cơ bản đúng
- nhưng version desktop đang lệch

### Release/distribution layer

Đánh giá: **chưa đạt**

Lý do:

- endpoint `latest.json` hiện không phục vụ file hợp lệ
- release public hiện tại không có assets updater

## Cần làm gì để hoàn thiện

### Mức bắt buộc

1. Đồng bộ version ngay:
   - `package.json`
   - `src-tauri/tauri.conf.json`
   - `src-tauri/Cargo.toml`

2. Chạy lại flow release để đảm bảo GitHub Release thực sự có:
   - installers/bundles
   - `.sig`
   - `latest.json`

3. Verify sau release:
   - `https://github.com/cin12211/orca-q/releases/latest/download/latest.json` trả `200`
   - JSON có đủ platform entries hợp lệ
   - asset URL trong JSON tải được

4. Smoke test trên packaged app thật:
   - cài bản cũ
   - publish bản mới
   - app cũ detect được update
   - download/install/restart apply thành công

### Mức nên làm

1. Thêm release checklist ngắn cho updater:
   - sync version
   - tag đúng version
   - confirm release assets
   - confirm `latest.json`

2. Thêm một bước CI/CD verify sau publish:
   - `curl` `latest.json`
   - parse JSON
   - assert có đủ keys bắt buộc

3. Nếu Windows là target quan trọng:
   - review `plugins.updater.windows.installMode`
   - test UX thực tế trên Windows installer path

## Kết luận cuối

Nếu câu hỏi là:

> “Cách làm hiện tại có đúng không?”

Thì câu trả lời là:

- **Đúng ở tầng implementation trong app**
- **Chưa đủ ở tầng release để gọi là hoàn thiện**

Nếu câu hỏi là:

> “Auto update có đang hoạt động end-to-end không?”

Thì tại thời điểm audit ngày 2026-03-29:

- **Chưa thể xem là hoạt động**, vì endpoint updater hiện trả `404` và latest public release không có updater assets.

## File/code đã đối chiếu

- `src-tauri/src/lib.rs`
- `src-tauri/capabilities/default.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`
- `package.json`
- `core/platform/tauri-updater.ts`
- `core/composables/useTauriUpdater.ts`
- `plugins/05.tauri-updater.client.ts`
- `.github/workflows/tauri-release.yml`
- `scripts/sync-version.mjs`

