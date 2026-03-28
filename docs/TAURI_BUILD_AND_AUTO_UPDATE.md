# Tauri Build And Auto Update

## Mục tiêu

File này giải thích app desktop `orcaq` hoạt động thế nào sau khi build bằng Tauri, và flow update chạy ra sao sau khi publish release.

## Sau khi build app thì điều gì xảy ra

Khi chạy:

```bash
bun run app:build:tauri
```

trước hết cần nhớ một điều quan trọng:

- repo này đang bật updater qua `bundle.createUpdaterArtifacts = true`
- app cũng đã nhúng sẵn `plugins.updater.pubkey`
- vì vậy mọi lần build updater artifacts đều cần private key để ký

Nếu thiếu key, build sẽ fail với lỗi kiểu:

```text
A public key has been found, but no private key.
Make sure to set `TAURI_SIGNING_PRIVATE_KEY` environment variable.
```

flow build hiện tại là:

1. Tauri đọc config từ `src-tauri/tauri.conf.json`.
2. `beforeBuildCommand` chạy `npm run nuxt:generate`.
3. Nuxt generate frontend tĩnh vào thư mục `dist/`.
4. Rust/Tauri build native shell trong `src-tauri/`.
5. Tauri đóng gói shell + frontend tĩnh thành desktop bundles.
6. Vì `bundle.createUpdaterArtifacts = true`, Tauri tạo thêm updater artifacts và file chữ ký (`.sig`).

Thư mục output chính sau release build:

```text
src-tauri/target/release/
src-tauri/target/release/bundle/<platform>/
```

Ví dụ artifact thường gặp:

- macOS: `.app`, `.dmg`, `.tar.gz`, `.sig`
- Windows: `.msi` hoặc `.exe`, kèm `.sig`
- Linux: `.AppImage`, `.deb`, `.rpm`, kèm `.sig`

## App chạy thế nào sau khi đã build

Sau khi user mở app đã cài:

1. Hệ điều hành launch native Tauri shell.
2. Tauri load frontend đã bundle từ `dist/`, không cần Nuxt dev server.
3. Plugin `plugins/04.tauri-runtime.client.ts` xác nhận runtime Tauri đang sẵn sàng.
4. Plugin `plugins/05.tauri-updater.client.ts` check update khi app chạy ở production build.
5. Nếu có bản mới, app hiện toast và tab `Settings -> Desktop` cũng hiển thị trạng thái update.
6. Nếu user chọn install, updater tải bundle mới, verify chữ ký bằng public key trong app, rồi chờ user restart app để apply bản mới.

## Auto update đang dùng gì

Desktop updater dùng:

- Tauri updater plugin
- Tauri process plugin để relaunch app
- GitHub Releases của repo `cin12211/orca-q`

Endpoint hiện tại:

```text
https://github.com/cin12211/orca-q/releases/latest/download/latest.json
```

Trong `latest.json`, mỗi platform cần:

- `version`
- `notes` hoặc `body`
- `pub_date`
- `platforms.<target>.url`
- `platforms.<target>.signature`

Tauri app sẽ từ chối update nếu signature không khớp với public key đã nhúng trong app.

## Key signing

Updater của Tauri bắt buộc phải có key signing.

Hiện tại trong repo này:

- Public key được nhúng trong `src-tauri/tauri.conf.json`
- Public key đó đang khớp với file local `~/.tauri/orcaq-updater.key.pub`
- Private key tương ứng là `~/.tauri/orcaq-updater.key`

Private key không được commit lên repo.

### Cực kỳ quan trọng

- `TAURI_SIGNING_PRIVATE_KEY` phải được export trong chính shell đang chạy lệnh build
- `.env` files không có tác dụng cho bước này
- nếu đã từng phát hành app bằng key hiện tại thì không được tự ý generate key mới, vì user đang cài app cũ sẽ không verify được update mới

### Cách build đúng ở local

macOS/Linux:

```bash
unset TAURI_SIGNING_PRIVATE_KEY_PATH
export TAURI_SIGNING_PRIVATE_KEY="$(cat "$HOME/.tauri/orcaq-updater.key")"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""
bun run app:build:tauri
```

Hoặc viết gọn một dòng:

```bash
TAURI_SIGNING_PRIVATE_KEY="$(cat "$HOME/.tauri/orcaq-updater.key")" \
TAURI_SIGNING_PRIVATE_KEY_PASSWORD="" \
bun run app:build:tauri
```

Repo cũng đã có file mẫu [`.env.example`](/Volumes/Cinny/Cinny/Project/HeraQ/.env.example) cho bước này.
Nhưng cần nhớ: Tauri không tự load `.env` ở bước signing, nên vẫn phải `source` file đó vào shell trước khi build.

Nếu muốn kiểm tra key có tồn tại không:

```bash
ls -la ~/.tauri/orcaq-updater.key ~/.tauri/orcaq-updater.key.pub
```

### Nếu chưa có key

Chỉ làm bước này nếu app chưa phát hành cho user, hoặc anh biết chắc mình đang khởi tạo một key chain mới.

```bash
bunx tauri signer generate -w ~/.tauri/orcaq-updater.key
```

Sau đó:

1. giữ private key ở `~/.tauri/orcaq-updater.key`
2. copy nội dung `~/.tauri/orcaq-updater.key.pub` vào `plugins.updater.pubkey` trong `src-tauri/tauri.conf.json`
3. export `TAURI_SIGNING_PRIVATE_KEY` rồi mới build

### Nếu chỉ muốn build local để test UI

Nếu chỉ smoke test local và chưa cần updater artifacts, có thể tạm thời tắt:

```json
"bundle": {
  "createUpdaterArtifacts": false
}
```

Nhưng đây chỉ nên là cách test local tạm thời. Không nên quên bật lại trước khi phát hành release có auto-update.

GitHub Actions cần secrets:

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

Nếu key không có password thì secret password có thể để trống.

## Release flow cho auto update

Workflow mới:

```text
.github/workflows/tauri-release.yml
```

Workflow này:

1. Trigger khi push tag `v*` hoặc chạy thủ công.
2. Build desktop app trên macOS, Linux, Windows.
3. Dùng `tauri-apps/tauri-action`.
4. Upload bundles, `.sig` files, và `latest.json` lên GitHub Release.

Khi release đã publish xong, app desktop đang cài sẽ check endpoint `latest.json` và biết có bản mới.

## Version sync

Script:

```text
scripts/sync-version.mjs
```

Giờ sync version cho:

- `npx-package/package.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`

Flow bump version chuẩn:

```bash
npm run version:patch
```

hoặc:

```bash
npm run version:minor
npm run version:major
```

## Cách release một bản desktop mới

1. Bump version:

```bash
npm run version:patch
```

2. Đảm bảo GitHub repo đã có 2 secrets:

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

3. Commit và push code.
4. Tạo tag:

```bash
git tag v1.0.32
git push origin main --tags
```

5. Chờ workflow `Tauri Desktop Release` chạy xong.
6. Mở GitHub Release và kiểm tra có đủ:

- bundle cho platform
- `.sig` files
- `latest.json`

## Cách test nhanh

### Local dev

```bash
bun run dev:tauri
```

Kiểm tra:

- app mở bằng Tauri shell
- `Settings -> Desktop` xuất hiện
- bấm `Check now` không crash

### Local build smoke test

```bash
cargo check --manifest-path src-tauri/Cargo.toml
bun test test/unit/core/helpers/environment.spec.ts
```

Nếu muốn chạy build đóng gói thật ở local:

```bash
unset TAURI_SIGNING_PRIVATE_KEY_PATH
export TAURI_SIGNING_PRIVATE_KEY="$(cat "$HOME/.tauri/orcaq-updater.key")"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""
bun run app:build:tauri
```

### Release smoke test

1. Cài một bản cũ hơn.
2. Publish tag version mới hơn lên GitHub Releases.
3. Mở app cũ.
4. Xác nhận toast update xuất hiện hoặc vào `Settings -> Desktop`.
5. Bấm `Download update`.
6. Sau khi app mở lại, kiểm tra version mới đã chạy.

## Giới hạn hiện tại

- Flow updater đã sẵn sàng cho packaged Tauri app, không dành cho Electron cũ.
- Check update ở dev mode chỉ nên dùng để smoke test, không phải flow chính.
- Desktop runtime vẫn còn các phần nghiệp vụ đang phụ thuộc Nitro `/api/*`; updater không thay đổi điểm này, nó chỉ giải quyết phát hành và cập nhật binary desktop.
