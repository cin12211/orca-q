# Kế hoạch Triển khai Tính năng MongoDB QuickQuery (Plan Add-on MongoDB)

Tài liệu này đặc tả chi tiết kế hoạch thực hiện 4 nhiệm vụ nâng cấp cho phân hệ MongoDB QuickQuery trong OrcaQ.

---

## Mục lục
1. [Nhiệm vụ 1: Xóa Table View Mode & Dọn dẹp Code thừa](#nhiệm-vụ-1-xóa-table-view-mode--dọn-dẹp-code-thừa)
2. [Nhiệm vụ 2: Thêm Button '+ Insert' & Modal (Insert Document + Import File)](#nhiệm-vụ-2-thêm-button--insert--modal-insert-document--import-file)
3. [Nhiệm vụ 3: Thêm Button 'Export Data' & Modal Cấu hình Export](#nhiệm-vụ-3-thêm-button-export-data--modal-cấu-hình-export)
4. [Nhiệm vụ 4: Thêm lại cột '#' vào MongoDatabaseOverview](#nhiệm-vụ-4-thêm-lại-cột--vào-mongodatabaseoverview)
5. [Kế hoạch Kiểm thử & Xác minh (Verification Plan)](#kế-hoạch-kiểm-thử--xác-minh-verification-plan)

---

## Nhiệm vụ 1: Xóa Table View Mode & Dọn dẹp Code thừa

### 1.1 Mục tiêu
Loại bỏ hoàn toàn chế độ hiển thị dạng Table (`MongoCollectionViewMode.Table`) khỏi MongoDB QuickQuery, chỉ giữ lại 2 chế độ:
- `List`: Duyệt và chỉnh sửa documents dạng danh sách/JSON editor.
- `Info`: Xem thông tin metadata, indexes, validation schema và database stats của collection.

### 1.2 Danh sách file cần xoá bỏ (Delete)
1. `components/modules/quick-query/mongodb/components/MongoCollectionTableView.vue`
   - Wrapper bảng AG Grid hiển thị documents dạng table.
2. `components/modules/quick-query/mongodb/utils/buildMongoColumnDefs.ts`
   - Utility suy diễn mảng cột AG Grid từ các field của document.
3. `test/unit/components/modules/quick-query/mongodb/buildMongoColumnDefs.spec.ts`
   - Unit test riêng cho `buildMongoColumnDefs`.

### 1.3 Danh sách file cần chỉnh sửa (Refactor / Clean up)
1. **`components/modules/quick-query/mongodb/types/mongo-quick-query.types.ts`**:
   - Cập nhật enum `MongoCollectionViewMode`:
     ```typescript
     export enum MongoCollectionViewMode {
       List = 'list',
       Info = 'info',
     }
     ```
2. **`components/modules/quick-query/mongodb/components/MongoViewModeSwitcher.vue`**:
   - Xoá `TabsTrigger` của `MongoCollectionViewMode.Table`.
   - Cập nhật grid CSS của `TabsList` từ `grid-cols-3` thành `grid-cols-2`.
3. **`components/modules/quick-query/mongodb/containers/MongoCollectionDetail.vue`**:
   - Xoá import `MongoCollectionTableView`.
   - Xoá `const tableViewRef = useTemplateRef(...)`.
   - Xoá nhánh `<MongoCollectionTableView v-if="viewMode === MongoCollectionViewMode.Table" ... />`.
   - Xoá logic gọi `tableViewRef.value?.scrollToTop()` trong watch `skip`.
4. **`components/modules/quick-query/mongodb/components/index.ts`**:
   - Xoá re-export `MongoCollectionTableView`.
5. **`components/modules/quick-query/mongodb/utils/index.ts`**:
   - Xoá re-export `buildMongoColumnDefs`.
6. **Cập nhật Unit / Nuxt Tests**:
   - `test/nuxt/components/modules/quick-query/mongodb/MongoViewModeSwitcher.test.ts`: Sửa các test case assert 3 tab thành 2 tab (`List` và `Info`).
   - `test/nuxt/components/modules/quick-query/mongodb/MongoCollectionDetail.test.ts`: Bỏ các mock và test case chuyển sang `Table` view.

---

## Nhiệm vụ 2: Thêm Button '+ Insert' & Modal (Insert Document + Import File)

### 2.1 Mục tiêu
Cho phép người dùng thêm document trực tiếp vào collection qua 2 cách:
- Tab 1: Soạn thảo JSON document trực tiếp trong Code Editor.
- Tab 2: Kéo thả / chọn file `.json` hoặc `.csv` để import vào collection qua server streaming.

### 2.2 UI Control Bar
- Thêm button `+ Insert` vào `MongoQuickQueryControlBar.vue`:
  - Nằm ở khối thao tác bên trái (cạnh nút Filter và Refresh).
  - Thiết kế: `Button variant="outline" size="xxs"` với icon `hugeicons:plus-sign` hoặc `lucide:plus`.
  - Khi click: emit event `onInsertClick` lên container `MongoCollectionDetail.vue`.

### 2.3 Modal Component: `MongoInsertModal.vue`
Tạo mới tại `components/modules/quick-query/mongodb/components/MongoInsertModal.vue`:
- Dialog hệ thống: sử dụng `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` từ `@/components/ui/dialog`.
- Chứa `Tabs` với 2 tab:
  1. `Insert Document` (value `document`)
  2. `Import JSON or CSV file` (value `import`)

#### Tab 1: Insert Document
- Sử dụng `BaseCodeEditor.vue` với JSON syntax highlighting.
- Initial Value mặc định:
  ```json
  {
    _id: ObjectId('6aa41a66635e05041887bac0')
  }
  ```
  *(Sử dụng hàm helper `generateMongoObjectId()` để tự động tạo một ObjectId ngẫu nhiên 24 ký tự hex mỗi khi mở modal).*
- Nút bấm:
  - `Cancel`: Đóng modal.
  - `Insert`: Gửi payload lên `/api/mongodb/quick-query-mutation` với `operation: 'insert'` và `document`.
  - Xử lý sau khi thành công: Hiển thị toast thành công, đóng modal, gọi `fetchDocuments()` để cập nhật danh sách và tăng tổng số documents `total += 1`.

#### Tab 2: Import JSON or CSV file
- Giao diện kéo thả (Dropzone) tuân theo chuẩn của `RestoreDataPanel.vue` / `ImportFileDropzone.vue`:
  - Sử dụng `@vueuse/core`'s `useDropZone` và thẻ `<input type="file" accept=".json,.csv" class="hidden" />`.
  - Hỗ trợ drop hoặc click vào khung để mở file explorer.
  - Chỉ chấp nhận file `.json` và `.csv`.
  - Khi đã chọn file: Hiển thị tên file, icon loại file, kích thước định dạng chuẩn (`B`, `KB`, `MB`), và nút icon `x` để xoá/chọn lại file.
- Nút bấm:
  - `Cancel`: Đóng modal.
  - `Import`: Disabled khi chưa chọn file hoặc đang trong tiến trình import.
  - Khi click: Gọi endpoint `server/api/mongodb/import-collection.post.ts` dưới dạng `FormData` chứa file và metadata kết nối (connection, database, collection).
  - Có trạng thái loading spinner trong lúc server upload và import dữ liệu.
  - Khi hoàn tất: Thông báo toast số lượng bản ghi đã import thành công, reload collection.

### 2.4 Server API: `server/api/mongodb/import-collection.post.ts`
- Tạo mới route server xử lý `multipart/form-data` (hoặc streaming body):
  - Đọc file tải lên.
  - Nếu là `.json`: Hỗ trợ cả 2 định dạng phổ biến:
    - Mảng JSON: `[{...}, {...}]` (parse qua EJSON/BSON).
    - JSON Lines (NDJSON): Mỗi dòng là một document.
  - Nếu là `.csv`: Parse headers và rows (tự động ép kiểu số, boolean, chuỗi).
  - Thực hiện `collection.insertMany(documents, { ordered: false })`.
  - Trả về `{ success: true, insertedCount: number }`.

---

## Nhiệm vụ 3: Thêm Button 'Export Data' & Modal Cấu hình Export

### 3.1 Vị trí và Tương tác Dropdown
- Nằm trong `MongoQuickQueryControlBar.vue` tại khối bên phải, đặt liền kề bên phải của `<MongoViewModeSwitcher />`:
  ```vue
  <div class="flex items-center gap-1">
    <MongoViewModeSwitcher
      :model-value="props.viewMode"
      @update:model-value="mode => emit('update:viewMode', mode)"
    />

    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button variant="outline" size="xxs" class="gap-1 h-7">
          <Icon name="hugeicons:file-download" class="size-3.5" />
          <span>Export</span>
          <Icon name="lucide:chevron-down" class="size-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem @click="emit('openExport', 'current')">
          Current results
        </DropdownMenuItem>
        <DropdownMenuItem @click="emit('openExport', 'full')">
          Full collections
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
  ```

### 3.2 Modal Component: `MongoExportModal.vue`
Tạo mới tại `components/modules/quick-query/mongodb/components/MongoExportModal.vue`:
- Props:
  - `open: boolean`
  - `exportScope: 'current' | 'full'`
  - `databaseName: string`
  - `collectionName: string`
  - `activeFilterPayload?: Record<string, unknown>`

#### Giao diện Modal:
1. **Query Preview Box (Chỉ hiển thị khi `exportScope === 'current'`):**
   - Header: `Export results from the query below`
   - Code box nền tối hoặc `bg-muted/50`:
     ```javascript
     db.getCollection('roles').find({});
     ```
     *(Tự động thay thế tên collection và nội dung filter hiện tại thành dạng chuỗi query).*
2. **Chọn Export Format:**
   - Radio group: `CSV` và `JSON`.
3. **Advanced JSON Format (Hiển thị khi format là `JSON`):**
   - Tiêu đề: `Advanced JSON Format`
   - 3 lựa chọn Radio kèm mô tả và ví dụ trực quan:
     1. **Default Extended JSON**
        - *Example:* `{ "fortyTwo": 42, "oneHalf": 0.5, "bignumber": { "$numberLong": "5000000000" } }`
     2. **Relaxed Extended JSON**
        - *Example:* `{ "fortyTwo": 42, "oneHalf": 0.5, "bignumber": 5000000000 }`
        - *Lưu ý:* `Large numbers (>= 2^^53) will change with this format.`
     3. **Canonical Extended JSON**
        - *Example:* `{ "fortyTwo": { "$numberInt": "42" }, "oneHalf": { "$numberDouble": "0.5" }, "bignumber": { "$numberLong": "5000000000" } }`
4. **Hành động Export:**
   - Nút `Cancel` & Nút `Export`.
   - Khi bấm `Export`: Kích hoạt tải file từ server endpoint `/api/mongodb/export-collection`.

### 3.3 Server API: `server/api/mongodb/export-collection.post.ts`
- Nhận request body:
  - Thông tin kết nối (`connection`, `database`, `collection`).
  - `scope: 'current' | 'full'`.
  - `filter`: Filter object nếu `scope === 'current'`, hoặc `{}` nếu `full`.
  - `format`: `'json' | 'csv'`.
  - `jsonFormat`: `'default' | 'relaxed' | 'canonical'`.
- Cơ chế xử lý:
  - Tìm kiếm cursor từ MongoDB: `collection.find(normalizedFilter)`.
  - Stream dữ liệu chuyển đổi:
    - Nếu `format === 'json'`:
      - `canonical`: serialize với `{ relaxed: false }`.
      - `relaxed`: serialize với `{ relaxed: true }`.
      - `default`: serialize chuẩn BSON Extended JSON.
    - Nếu `format === 'csv'`: Trích xuất header từ các documents và xuất dòng CSV tương ứng.
  - Set Header phản hồi:
    - `Content-Type`: `application/json` hoặc `text/csv`.
    - `Content-Disposition`: `attachment; filename="${collectionName}_export.${format}"`.
  - Stream trả về cho client trigger browser download tự động mà không làm nghẽn bộ nhớ server.

---

## Nhiệm vụ 4: Thêm lại cột '#' vào MongoDatabaseOverview

### 4.1 Mục tiêu
Trong giao diện tổng quan cơ sở dữ liệu `MongoDatabaseOverview.vue` (danh sách các collection, kích thước, số lượng document, số index), bổ sung lại cột số thứ tự `#` chuẩn như các bảng hệ thống khác trong OrcaQ.

### 4.2 Chi tiết thực hiện
File: `components/modules/quick-query/mongodb/containers/MongoDatabaseOverview.vue`:
1. Import helper tạo cột số thứ tự đã có sẵn trong dự án:
   ```typescript
   import { createHashIndexColumnDef } from '~/components/base/data-grid/utils/gridColumnDefs';
   ```
2. Cập nhật mảng `columnDefs`:
   ```typescript
   const columnDefs: ColDef<MongoCollectionSummary>[] = [
     createHashIndexColumnDef({
       valueGetter: params =>
         params.node?.rowIndex != null ? params.node.rowIndex + 1 : '',
     }),
     {
       field: 'name',
       headerName: 'Collection name',
       sortable: true,
       filter: 'agTextColumnFilter',
     },
     // ... các cột dung lượng, documentCount, indexCount giữ nguyên
   ];
   ```
3. Đảm bảo cột `#` hiển thị đúng chỉ số hàng 1, 2, 3... tương thích với việc sắp xếp (sorting) và lọc (filtering) của AG Grid.

---

## Kế hoạch Kiểm thử & Xác minh (Verification Plan)

| Nhiệm vụ | Hạng mục kiểm tra | Phương thức xác minh |
| --- | --- | --- |
| **Nhiệm vụ 1** | Xoá Table view | - `bun run typecheck` không còn lỗi thiếu file/type.<br>- Chạy `bun test:unit` & `bun test:nuxt` đảm bảo các test switcher và container pass.<br>- Mở QuickQuery MongoDB chỉ còn 2 tab List và Info. |
| **Nhiệm vụ 2** | Insert & Import | - Mở popup `+ Insert`, kiểm tra tab Insert Document có sẵn template `_id: ObjectId(...)`.<br>- Thử insert 1 document mới -> collection cập nhật ngay.<br>- Kéo thả file `.json` và `.csv` -> kiểm tra thông tin file hiển thị chính xác -> bấm Import -> dữ liệu được đẩy vào DB thành công. |
| **Nhiệm vụ 3** | Export Data | - Bấm dropdown Export: chọn `Current results` -> popup hiển thị đúng query `db.getCollection(...).find(...)`.<br>- Chọn `Full collections` -> không hiện query box.<br>- Chọn JSON -> hiển thị 3 radio options của Advanced JSON Format với đúng các ví dụ mẫu.<br>- Bấm Export -> browser tải file về máy đúng định dạng CSV/JSON đã chọn. |
| **Nhiệm vụ 4** | Cột '#' Overview | - Vào trang tổng quan database MongoDB -> kiểm tra cột `#` xuất hiện ở đầu bảng với số thứ tự 1, 2, 3... tăng dần. |
