# MongoDB QuickQuery Add-ons Design Document

**Date:** 2026-09-11  
**Status:** Approved  
**Topic:** MongoDB QuickQuery Enhancement (Remove Table View, Add Insert/Import Modal, Add Export Data, Restore Database Overview '#' Column)

---

## 1. Overview & Objectives

Tài liệu thiết kế này chuẩn hóa 4 cải tiến chính cho phân hệ MongoDB QuickQuery trong OrcaQ:

1. **Loại bỏ Table View Mode**: Chế độ Table view (`MongoCollectionTableView`) không phù hợp với dữ liệu NoSQL dạng lồng nhau sâu và biến thiên schema cao của MongoDB. Loại bỏ Table view để tập trung vào `List` view và `Info` view, dọn sạch code và tests thừa.
2. **Bổ sung '+ Insert' Document & Import File**: Thêm nút `+ Insert` vào thanh điều khiển MongoDB QuickQuery, mở popup với 2 tabs:
   - *Tab 1: Insert Document* — Soạn thảo document mới với code editor (`BaseCodeEditor`), có sẵn mẫu `_id: ObjectId('...')`.
   - *Tab 2: Import JSON or CSV file* — Kéo thả (drag & drop) hoặc duyệt file `.json`/`.csv` (tương tự trải nghiệm của `RestoreDataPanel`), tải lên server để import số lượng lớn vào collection.
3. **Bổ sung 'Export Data'**: Thêm dropdown cạnh switcher chế độ hiển thị với 2 options: `Current results` và `Full collections`. Mở popup cấu hình xuất file (CSV hoặc JSON). Với JSON, hỗ trợ **Advanced JSON Format** gồm 3 chuẩn EJSON: Default Extended JSON, Relaxed Extended JSON, và Canonical Extended JSON. Server stream file download trực tiếp về máy.
4. **Khôi phục cột '#' trong MongoDatabaseOverview**: Thêm lại cột số thứ tự hàng (`#`) trong bảng danh sách collections tại trang tổng quan database MongoDB.

---

## 2. Architectural Decisions & Seams

```mermaid
graph TD
  A[MongoQuickQueryControlBar] -->|+ Insert Click| B[MongoInsertModal]
  A -->|Export Click| C[MongoExportModal]
  A -->|Switch List/Info| D[MongoCollectionDetail]
  
  B -->|Tab 1: Single Insert| E[/api/mongodb/quick-query-mutation]
  B -->|Tab 2: Upload File| F[/api/mongodb/import-collection]
  
  C -->|Stream Export| G[/api/mongodb/export-collection]
  
  D --> H[MongoCollectionListView]
  D --> I[MongoCollectionInfoView]
```

### 2.1 Low Coupling & High Cohesion
- Tuân thủ nghiêm ngặt quy tắc [Module Architecture](file:///Volumes/Cinny/Cinny/Project/orca-q-projects/OrcaQ/.agent/rules/module-architecture.md):
  - Các components UI mới (`MongoInsertModal.vue`, `MongoExportModal.vue`) đặt trong `components/modules/quick-query/mongodb/components/`.
  - Mọi export/import phải qua `components/index.ts`, `hooks/index.ts`, `utils/index.ts`, `types/index.ts`.
  - Không import trực tiếp file nội bộ từ bên ngoài module.
- Tái sử dụng các system primitives từ `components/ui/` (`Dialog`, `Button`, `Tabs`, `DropdownMenu`, `RadioGroup`, `Label`, `Input`, `Tooltip`) và `components/base/` (`BaseCodeEditor`, `BaseDataGrid`).

---

## 3. Detailed Component Designs

### 3.1 Task 1: Xóa Table View Mode & Dọn dẹp Code thừa

#### Thay đổi Enum & Types
- File `components/modules/quick-query/mongodb/types/mongo-quick-query.types.ts`:
  ```typescript
  export enum MongoCollectionViewMode {
    List = 'list',
    Info = 'info',
  }
  ```

#### Cập nhật Switcher
- File `components/modules/quick-query/mongodb/components/MongoViewModeSwitcher.vue`:
  - Xoá `TabsTrigger` có `value="table"`.
  - Cập nhật `TabsList` class: từ `grid-cols-3` thành `grid-cols-2`.
  - Chỉ hiển thị 2 tab: `List` và `Info`.

#### Cập nhật Container Detail
- File `components/modules/quick-query/mongodb/containers/MongoCollectionDetail.vue`:
  - Xoá import `MongoCollectionTableView`.
  - Xoá `tableViewRef`.
  - Xoá block `<MongoCollectionTableView ... />`.
  - Xoá lệnh `tableViewRef.value?.scrollToTop()` trong watch `skip`.

#### Xoá File Thừa
- `components/modules/quick-query/mongodb/components/MongoCollectionTableView.vue`
- `components/modules/quick-query/mongodb/utils/buildMongoColumnDefs.ts`
- `test/unit/components/modules/quick-query/mongodb/buildMongoColumnDefs.spec.ts`
- Dọn re-export trong `components/index.ts` và `utils/index.ts`.

---

### 3.2 Task 2: Button '+ Insert' & Modal Insert/Import

#### Vị trí Button trên Control Bar
- File `components/modules/quick-query/mongodb/components/MongoQuickQueryControlBar.vue`:
  - Thêm nút `+ Insert` bên cạnh Filter / Refresh button:
    ```vue
    <Button
      variant="outline"
      size="xxs"
      class="gap-1 h-7"
      @click="emit('onInsertClick')"
    >
      <Icon name="hugeicons:plus-sign" class="size-3.5" />
      <span>Insert</span>
    </Button>
    ```
  - Emit event `onInsertClick: []`.

#### Component Modal: `MongoInsertModal.vue`
- Props:
  - `open: boolean`
  - `connection: Connection | undefined`
  - `databaseName: string`
  - `collectionName: string`
- Emits:
  - `'update:open': [value: boolean]`
  - `'inserted': []` (trigger refetch collection)
- Cấu trúc Tabs:
  1. **Tab 1: Insert Document** (`value="document"`)
     - Code editor: `BaseCodeEditor.vue` với JSON mode.
     - Hàm khởi tạo sinh ngẫu nhiên ObjectId 24-hex:
       ```typescript
       function generateRandomMongoObjectId(): string {
         const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
         const randomHex = Array.from({ length: 16 }, () =>
           Math.floor(Math.random() * 16).toString(16)
         ).join('');
         return timestamp + randomHex;
       }
       ```
     - Initial Value mặc định:
       ```javascript
       `{\n  _id: ObjectId('${generateRandomMongoObjectId()}')\n}`
       ```
     - Nút "Insert": Parse JSON hoặc EJSON, gửi payload lên `/api/mongodb/quick-query-mutation` với `operation: 'insert'`.
     - Thành công: Toast success, đóng modal, emit `inserted`.
  2. **Tab 2: Import JSON or CSV file** (`value="import"`)
     - Dùng `@vueuse/core`'s `useDropZone` kết hợp thẻ `<input type="file" accept=".json,.csv" class="hidden" />`.
     - Vùng dropzone dashed border, icon `hugeicons:upload-cloud-01`, text hướng dẫn `Drop file here or click to browse`, subtext `Supports .json and .csv files`.
     - Khi đã chọn file: Hiển thị box file name, size (formatBytes), icon `hugeicons:file-01` và nút xoá file `hugeicons:x-close`.
     - Nút "Import": Gửi `FormData` lên endpoint `/api/mongodb/import-collection`.
     - Hiển thị loading spinner trong nút và vô hiệu hóa tương tác khi đang import.
     - Thành công: Toast `Successfully imported X documents`, đóng modal, emit `inserted`.

#### Server Endpoint: `server/api/mongodb/import-collection.post.ts`
- Sử dụng `readMultipartFormData(event)` từ `h3`:
  - Trích xuất: `file`, `connection`, `database`, `collection`.
  - Phân tích cú pháp:
    - Nếu là `.json`: Parse mảng JSON hoặc NDJSON qua `BSON.EJSON.deserialize`.
    - Nếu là `.csv`: Parse CSV dùng thư viện parser có sẵn hoặc custom stream parser, chuyển các hàng thành documents.
  - Sử dụng `collection.insertMany(docs, { ordered: false })`.
  - Trả về `{ success: true, insertedCount: result.insertedCount }`.

---

### 3.3 Task 3: Button 'Export Data' & Modal Cấu hình Export

#### Vị trí Dropdown trên Control Bar
- Đặt ngay bên phải `<MongoViewModeSwitcher />` trong `MongoQuickQueryControlBar.vue`:
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

#### Component Modal: `MongoExportModal.vue`
- Props:
  - `open: boolean`
  - `exportScope: 'current' | 'full'`
  - `connection: Connection | undefined`
  - `databaseName: string`
  - `collectionName: string`
  - `activeFilterPayload?: Record<string, unknown>`
- Giao diện:
  1. **Query Box** (khi `exportScope === 'current'`):
     ```
     Export results from the query below

     db.getCollection('roles').find({});
     ```
     - Sinh động theo tên collection và filter hiện tại: `db.getCollection('${collectionName}').find(${filterStr});`.
  2. **Export Type Radio**:
     - `CSV`
     - `JSON`
  3. **Advanced JSON Format** (chỉ hiển thị khi Export Type là `JSON`):
     - Lựa chọn 1: **Default Extended JSON**
       - Ví dụ: `{ "fortyTwo": 42, "oneHalf": 0.5, "bignumber": { "$numberLong": "5000000000" } }`
     - Lựa chọn 2: **Relaxed Extended JSON**
       - Ví dụ: `{ "fortyTwo": 42, "oneHalf": 0.5, "bignumber": 5000000000 }`
       - Ghi chú: *Large numbers (>= 2^^53) will change with this format.*
     - Lựa chọn 3: **Canonical Extended JSON**
       - Ví dụ: `{ "fortyTwo": { "$numberInt": "42" }, "oneHalf": { "$numberDouble": "0.5" }, "bignumber": { "$numberLong": "5000000000" } }`
  4. **Nút Export**:
     - Gửi POST request tải stream file từ `/api/mongodb/export-collection`.
     - Tự động download file về máy người dùng qua thẻ `<a>` blob download hoặc streaming response.

#### Server Endpoint: `server/api/mongodb/export-collection.post.ts`
- Nhận thông tin: `connection`, `database`, `collection`, `scope`, `filter`, `format`, `jsonFormat`.
- Query cursor:
  ```typescript
  const queryFilter = scope === 'current' ? normalizeMongoFilter(filter) : {};
  const cursor = collection.find(queryFilter);
  ```
- Định dạng xuất:
  - JSON:
    - `canonical`: `BSON.EJSON.stringify(doc, { relaxed: false })`
    - `relaxed`: `BSON.EJSON.stringify(doc, { relaxed: true })`
    - `default`: Chuẩn format default BSON Extended JSON
  - CSV:
    - Thu thập danh sách flatten keys của các documents để làm CSV headers.
    - Xuất dòng CSV với dấu phẩy và quote hợp lệ.
- Headers:
  - `Content-Type: application/json` hoặc `text/csv`
  - `Content-Disposition: attachment; filename="${collectionName}_export.${format}"`

---

### 3.4 Task 4: Khôi phục Cột '#' trong MongoDatabaseOverview

#### Cập nhật Column Definitions
- File `components/modules/quick-query/mongodb/containers/MongoDatabaseOverview.vue`:
  - Import `createHashIndexColumnDef` từ `~/components/base/data-grid/utils/gridColumnDefs`.
  - Chèn cột `#` vào đầu mảng `columnDefs`:
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
      // ... các cột còn lại
    ];
    ```

---

## 4. Verification & Testing Standards

- **Typecheck**: `bun run typecheck` phải vượt qua 100% không có lỗi.
- **Unit Tests**: Chạy `bun test:unit`.
- **Nuxt Tests**: Chạy `bun test:nuxt` kiểm tra các component `MongoViewModeSwitcher.test.ts` và `MongoCollectionDetail.test.ts`.
- **Manual Verification**:
  - Chuyển view mode giữa `List` và `Info` mượt mà, không còn tab `Table`.
  - Mở popup Insert, test insert document với initial `_id: ObjectId(...)`.
  - Test import file CSV và JSON.
  - Test export với Current results và Full collections (cả 3 format JSON và CSV).
  - Kiểm tra bảng Database Overview có cột `#` với số thứ tự chính xác.
