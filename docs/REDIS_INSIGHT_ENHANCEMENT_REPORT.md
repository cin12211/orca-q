# 📋 Báo Cáo Đánh Giá & Đề Xuất Cải Tiến Redis Insights (HeraQ / OrcaQ)

> **Mục tiêu:** Đưa ra phương án cải tiến toàn diện trải nghiệm người dùng (UX), giao diện (UI) và tính năng cho phân hệ **Redis Insights**, giúp phân biệt rõ ràng Scope dữ liệu (Instance vs DB), đồng nhất Design System, nâng cao hiệu quả làm việc với bảng (Table Search & Scroll) và tối ưu từng khối thông tin.
>
> **Cập nhật mới (Tabs Clients Layout):** Khối Connected Clients, Suspicious Clients và Client List Table hiển thị gom chung trên cùng 1 MÀN HÌNH (Viewport height của cha `h-full min-h-0`), cuộn độc lập bên trong từng khối, không cuộn nguyên trang.

---

## 🔍 1. Phân Tích Hiện Trạng & Vấn Đề Cốt Lõi

Qua khảo sát toàn bộ codebase Redis Insights tại `components/modules/instance-insights/` và service `server/infrastructure/nosql/redis/redis-instance-insights.service.ts`, chúng tôi nhận thấy 4 nhóm vấn đề chính như bạn đã nêu:

### ❌ Vấn đề 1: Nhập nhằng giữa Dữ liệu Full Instance vs Dữ liệu DB / Slot (`/0`, `/10`, `/12`)

- **Hiện trạng:**
  - Header có dropdown `RedisDBSelector` chọn DB Index (ví dụ DB 0, DB 10, DB 12).
  - Tuy nhiên, phần lớn dữ liệu hiển thị (Uptime, Total Used Memory, Connected Clients, Ops/sec, Persistence RDB/AOF, Replication, Command Stats, Config, Slowlog) thực chất là **thông tin của toàn bộ Redis Server Instance**.
  - Chỉ một số metric như `Sampled Keys`, `Top Prefixes`, `Big Keys`, `Avg TTL`, `Keys Without TTL` là thuộc phạm vi **Database/Slot hiện tại được chọn**.
- **Hậu quả:** User nhầm tưởng toàn bộ các chỉ số (Memory, Clients, Performance) thay đổi theo DB Index được chọn, hoặc không biết thông tin nào mang tính hệ thống, thông tin nào thuộc về DB cụ thể.

---

### ❌ Vấn đề 2: Style chưa đồng nhất (Inconsistent UI & Design System)

- **Hiện trạng:**
  - Các section (`Overview`, `Keyspace`, `Memory`, `Performance`, `Clients`, `Persistence`, `Replication`, `Config`) đang dùng các container thẻ thô `div.rounded-lg.border.p-3` hoặc `div.rounded-md.bg-muted/20.px-3.py-2` viết rải rác.
  - Thiếu việc tái sử dụng các primitive UI chuẩn của HeraQ (thẻ `Card`, `Badge`, `BaseNotice`, `Table`/`DataGrid`).
  - Thiếu status color indicators (xanh/vàng/đỏ) cho các chỉ số quan trọng (như Fragmentation ratio cao, Memory > 85%, Master/Replica disconnect, Slowlog count).

---

### ❌ Vấn đề 3: Bảng khó dùng, thiếu ô Tìm kiếm (Search) và lỗi Scroll tràn trang

- **Hiện trạng:**
  - **Thiếu Search:** Danh sách `Config` (10+ tham số), `Client List` (nhiều kết nối), `Slowlog`, `Command Stats`, `Big Keys` đều hiển thị danh sách tĩnh dạng `div v-for`, người dùng **không thể search / filter** theo từ khóa.
  - **Lỗi Scroll:** Container outer `div.overflow-y-auto` cuộn toàn bộ trang web. Mỗi khi danh sách Config hoặc Client dài, cả trang bị kéo dài thượt, làm mất thanh Tabs cố định ở trên đỉnh, bắt user phải scroll lên xuống liên tục.

---

### ❌ Vấn đề 4: Các Block chưa được tối ưu UX theo đặc thù dữ liệu

- **Overview:** Chỉ là các khung chữ tĩnh, thiếu icon trực quan và nhãn phân định scope.
- **Keyspace:** Phân bổ loại Key (String, Hash, List, Set, zset) hiển thị dạng Badge thô, thiếu Progress bar / Percent bar trực quan.
- **Memory:** Chỉ có số bytes thô, thiếu Thanh tiến trình Memory Usage % (so với maxmemory) và Thanh cảnh báo Memory Fragmentation.
- **Performance:** `Slowlog` và `Command Stats` không có bảng phân trang / sắp xếp; `Latency Doctor` chỉ là thẻ `pre` văn bản thô.
- **Clients:** Thẻ client xếp chồng dọc tràn trang, chưa hiển thị vừa vặn 1 màn hình và thiếu Searchable Data Table.
- **Persistence & Replication:** Dữ liệu text liệt kê đơn điệu, thiếu Topology Flowchart / Diagram minh họa mối quan hệ Master-Replica.
- **Config:** Liệt kê phẳng, thiếu phân loại category và ô Search Config Key.

---

## 💡 2. Đề Xuất Giải Pháp Nâng Cấp UX/UI Chi Tiết

---

### 📌 2.1. Phân Định Rõ Scope Dữ Liệu: Full Instance vs DB/Slot Specific

Ta sẽ bổ sung **Visual Scope Badges** và **Scope Header Indicator**:

1. **Scope Header Banner:** Trên đỉnh mỗi tab hiển thị thanh ngữ cảnh:
   - 🌐 **Full Instance Scope:** Các chỉ số đo lường toàn hệ thống Redis Server (Port, Memory Total, Total Clients, Persistence, Replication).
   - 🎯 **DB Scoped (DB /{{ databaseIndex }}):** Các chỉ số đo lường riêng cho Database đang chọn (Key Count, Big Keys, Top Prefixes, Avg TTL).
2. **Visual Badge trên từng Card / Table:**
   - Gắn Badge màu lam nhạt `[Instance]` góc trên bên phải thẻ metric thuộc phạm vi Server.
   - Gắn Badge màu lục nhạt `[DB /0]` (hoặc DB đang chọn) cho thẻ metric thuộc phạm vi Database hiện tại.

```
+-----------------------------------------------------------------------------------+
| 🌐 Instance: Redis 7.2.4 (Standalone)  |  🎯 Selected Scope: DB /0 (2,450 keys)     |
+-----------------------------------------------------------------------------------+
| [Card: Used Memory]         [Instance]  | [Card: Sampled Keys]             [DB /0] |
| 1.25 GB / 4.00 GB                      | 250 keys sampled                         |
+-----------------------------------------------------------------------------------+
```

---

### 📌 2.2. Đồng Nhất Design System & Componentizing

1. **Tái sử dụng Component chuẩn HeraQ:**
   - Sử dụng `UiCard`, `UiCardHeader`, `UiCardTitle`, `UiCardContent` cho tất cả các block.
   - Tạo component dùng chung `InsightKpiCard.vue` hiển thị KPI Metric với Label, Scope Badge, Value lớn, Status Color (Xanh/Vàng/Đỏ).
2. **Color Coding System:**
   - **Memory Usage:** <70% Green, 70-85% Yellow, >85% Red.
   - **Replication Status:** `online` Green, `connecting/sync` Yellow, `disconnected` Red.
   - **Fragmentation Ratio:** 1.0 - 1.4 Green, >1.5 Yellow/Red.

---

### 📌 2.3. Tối Ưu Bảng (Table Usability), Search & Cố Định Height (Internal Scroll)

1. **Khắc phục Scroll tràn trang:**
   - Chuyển layout của `RedisInstanceInsightsPanel` sang chuẩn **Sticky Container Layout**:
     `flex flex-col h-full overflow-hidden`.
   - Body của từng Section sử dụng `flex-1 min-h-0 overflow-y-auto` hoặc layout cố định chiều cao view `h-full`.
2. **Bổ sung Search Input (Quick Filter) cho 5 bảng trọng tâm:**
   - **Config Table:** Search theo `config_key` hoặc `value`.
   - **Client List Table:** Search theo `Client IP`, `Name`, `Command`, `DB Index`.
   - **Slowlog Table:** Search theo `Command`, `Client IP`.
   - **Big Keys Table:** Search theo `Key Name`, `Type`.
   - **Command Stats Table:** Search theo `Command Name`.

---

### 📌 2.4. Đánh Giá & Thiết Kế Chi Tiết Cho Tab Clients (Theo Yêu Cầu Mới)

> 🎯 **Mục tiêu Tab Clients:** Tất cả khối **Connected Clients KPI**, **Suspicious Clients** và **Client List Table** NẰM TRỌN TRONG 1 MÀN HÌNH (Viewport Height của Container Cha `h-full min-h-0 flex-col`). Không bị kéo dài tràn trang, mỗi khối tự có scrollbar riêng nếu dữ liệu dài.

#### Mô hình Layout Tab Clients (Single Viewport Layout):

```
+-----------------------------------------------------------------------------------+
| Top KPI Bar: [ Connected clients: 42 ] [ Suspicious clients: 3 ]                  |
+-----------------------------------------------------------------------------------+
| ┌──────────────────────────────┬────────────────────────────────────────────────┐ |
| │ ⚠️ Suspicious Clients        │ 📋 Client List Data Table                      │ |
| │ (Height 100%, Scroll nội bộ) │ Search: [ Input search client IP / cmd... ]    │ |
| │                              │ (Height 100%, Sticky Header & Scroll nội bộ)   │ |
| │ • 192.168.1.10: idle > 1h    │ ---------------------------------------------- │ |
| │ • 10.0.0.5: blocked client   │ 127.0.0.1:5432 | db 0 | GET  | Age 320s | [Kill] │ |
| │ • 10.0.0.8: multi conns      │ 127.0.0.1:5433 | db 1 | SET  | Age 12s  | [Kill] │ |
| └──────────────────────────────┴────────────────────────────────────────────────┘ |
+-----------------------------------------------------------------------------------+
```

1. **Top Bar (Compact KPI Summary):**
   - Đặt 2 thẻ KPI nhỏ gọn ở đầu tab: `Connected clients` & `Suspicious clients count`.
2. **Split Main Viewport (`flex-1 min-h-0 flex gap-3 overflow-hidden`):**
   - **Khối Left Panel (Suspicious Clients):** Rộng ~30-35% (chỉ hiện khi có Suspicious Clients). Chứa danh sách cảnh báo kèm đốm đỏ/vàng, có thanh cuộn riêng `overflow-y-auto h-full`.
   - **Khối Right Panel (Client List Data Table):** Rộng ~65-70% (hoặc 100% nếu không có suspicious clients). Cố định chiều cao `h-full flex-col min-h-0`:
     - Header bảng chứa **Ô Search tìm kiếm nhanh Client IP / Name / Command**.
     - Data Table chuẩn với Sticky Header, hover row highlight và **thanh cuộn riêng nội bộ** (`overflow-y-auto flex-1`).
     - Nút **Kill Client** kèm Confirm Modal ngay trên từng dòng.

---

### 📌 2.5. Ma Trận Tối Ưu UX Chi Tiết Cho Các Block Khác

| Block                     | Vấn đề UX hiện tại                                                                  | Phương án nâng cấp UX/UI                                                                                                                                                                                                                                                                 |
| :------------------------ | :---------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Overview**           | 11 thẻ vuông nằm phè ra grid, không phân biệt Scope Instance vs DB.                 | • Thêm Scope Badge (`[Instance]` & `[DB /x]`).<br>• Tách thành 2 nhóm thẻ: **Server Overview** (Instance) & **Database Quick Summary** (DB /x).                                                                                                                                          |
| **2. Keyspace**           | Danh sách DB & Top Prefixes dạng list thô, Key Type Distribution là badge tĩnh.     | • **Key Type Distribution:** Thêm biểu đồ phân bổ % (Stacked Bar Chart / Progress Bar) các loại key.<br>• **Databases Table:** Nút **"Switch to DB"** ngay trên từng dòng DB để đổi active DB nhanh chóng.<br>• **Top Prefixes:** Thêm thanh Search & Sort theo số lượng key.            |
| **3. Memory**             | Chỉ có văn bản thô, không thấy mức độ nguy hiểm của Bộ nhớ.                         | • **Memory Gauge:** Visual Progress Bar thể hiện `% Used / Maxmemory` (đổi màu Xanh -> Vàng -> Đỏ).<br>• **Big Keys Detector:** Data Table có Search Key, Filter theo Type, Sort theo Byte.                                                                                              |
| **4. Performance**        | Slowlog & Command Stats là danh sách thô kéo dài; Latency doctor chỉ là `pre` text. | • **Slowlog:** Table có Search theo Command/IP, highlight syntax Redis Command, format timestamp human-readable (`2 phút trước`).<br>• **Command Stats:** Bảng Top Commands kèm Mini Progress Bar theo tỷ lệ `% Calls`.<br>• **Latency Doctor:** Terminal Container với nút Copy Report. |
| **5. Clients (Cập nhật)** | Danh sách cuộn tràn trang, không gom vừa 1 màn hình.                                | • **Single Viewport Layout:** Hiển thị trọn vẹn KPI, Suspicious Panel & Searchable Client Table trong 1 Viewport height của container cha (`h-full min-h-0`).<br>• Split View (Cột trái Suspicious, Cột phải Client Table) đều có thanh cuộn nội bộ độc lập.                             |
| **6. Persistence**        | Các dòng text liệt kê tĩnh đơn điệu.                                                | • **Status Badges:** Indicator đốm sáng (Green/Red dot) cho RDB & AOF Enabled.<br>• **Timeline / Cards:** Card thông tin trực quan cho `Last Save Status`, `AOF Rewrite Status`.                                                                                                         |
| **7. Replication**        | Chữ liệt kê, không hình dung được mô hình Cluster/Replica.                          | • **Visual Topology Diagram / Card:** Hiển thị sơ đồ đơn giản Role (Master vs Replica) kèm đốm trạng thái.<br>• **Replicas Table:** Bảng node Replica với `Node Address`, `State`, `Replication Lag (ms)`.                                                                               |
| **8. Config**             | Danh sách 10+ dòng thô tràn màn hình, không có Search.                              | • **Searchable Config Table:** Bảng có Sticky Header, Search Box lọc nhanh tên cấu hình.<br>• Group theo Category (Memory, Persistence, Connection, Logging).                                                                                                                            |

---

## 🛠️ 3. Kế Hoạch Kỹ Thuật (Technical Implementation Plan)

### Các file sẽ khởi tạo / sửa đổi:

1. **Types (`core/types/instance-insights.types.ts`):**

   - Bổ sung metadata scope cho metric (`scope: 'instance' | 'database'`).

2. **Components (`components/modules/instance-insights/components/`):**

   - 🆕 `InsightScopeBadge.vue`: Component hiển thị nhãn `[Instance]` hoặc `[DB /x]`.
   - 🆕 `InsightKpiCard.vue`: Component hiển thị Card metric chuẩn với progress bar & color tone.
   - ✏️ `RedisOverviewSection.vue`: Phân nhóm Card theo Scope + Status Badges.
   - ✏️ `RedisKeyspaceSection.vue`: Key Type Progress Bar, Table Databases với Switch DB action, Search Top Prefixes.
   - ✏️ `RedisMemorySection.vue`: Memory Usage Progress Bar, Table Big Keys với Search & Filter.
   - ✏️ `RedisPerformanceSection.vue`: Searchable Slowlog Table, Top Command Stats Bar, Terminal Latency Doctor.
   - ✏️ `RedisClientsSection.vue`: **Single Viewport Split Layout** (KPI Top Bar + Left Suspicious Panel + Right Searchable Client Table) với internal scrollbars.
   - ✏️ `RedisPersistenceSection.vue`: RDB/AOF Status Badges & Cards.
   - ✏️ `RedisReplicationSection.vue`: Replication Node Table & Master/Replica Visual Card.
   - ✏️ `RedisConfigSection.vue`: Searchable & Grouped Config Table.

3. **Panel Layout (`components/modules/instance-insights/RedisInstanceInsightsPanel.vue`):**
   - Sửa layout container cố định height (`h-full flex-col min-h-0`), thêm Scope Context Banner trên đỉnh.

---

## 📊 4. Quyết Định Của Bạn

Bạn đã lựa chọn **Option A (Nâng cấp toàn diện UX/UI)** kết hợp với cập nhật layout **Tab Clients nằm vừa 1 Viewport Height với Scroll nội bộ**.

---

## ⏭️ Bước Tiếp Theo

Mọi thông tin trong báo cáo đã được cập nhật chính xác theo yêu cầu mới nhất của bạn.

👉 **Vui lòng xác nhận để tôi khởi chạy bước triển khai mã nguồn (Code & Test)!**
