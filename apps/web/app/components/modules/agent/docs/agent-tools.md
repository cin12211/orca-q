# DB Editor Agent — Tool Specifications

Tài liệu này mô tả chi tiết 5 tools core của agent theo nguyên lý 80/20: đây là 20% tính năng giải quyết 80% nhu cầu người dùng.

---

## 1. `generate_query`

**Mục đích:** Chuyển ngôn ngữ tự nhiên thành SQL query.

**Đây là tool quan trọng nhất** — lý do tồn tại của cả module.

### Input schema

```typescript
{
  prompt:  string   // câu hỏi của user
  schema:  string   // schema context hiện tại
  dialect: 'postgresql' | 'mysql' | 'sqlite'  // default: postgresql
}
```

### Output

```typescript
{
  sql:         string   // câu SQL được sinh ra
  isMutation:  boolean  // true nếu INSERT/UPDATE/DELETE/DROP/TRUNCATE/ALTER
  explanation: string   // giải thích query làm gì bằng plain text
}
```

### Behaviour

- Nếu `isMutation: true` → client **bắt buộc** hiện approval gate, không tự chạy
- AI phải tự gọi `render_table` sau khi sinh query (nếu là SELECT)
- Không execute SQL trong tool này — chỉ sinh text

### UI block: `AgentQueryBlock`

```
┌─────────────────────────────────────────┐
│ 💬 Explanation text                      │
├─────────────────────────────────────────┤
│ SELECT COUNT(*) FROM users              │  ← editable SQL
│ WHERE created_at >= date_trunc(...)     │
├─────────────────────────────────────────┤
│ [READ ONLY]  [▶ Run]  [📋 Copy]         │
└─────────────────────────────────────────┘
```

Badge `MUTATION` màu đỏ thay cho `READ ONLY` nếu `isMutation: true`.

---

## 2. `render_table`

**Mục đích:** Execute một SELECT query và trả về data có cấu trúc để Vue render bảng.

### Input schema

```typescript
{
  sql:   string  // SELECT query cần chạy
  limit: number  // default: 100
}
```

### Output

```typescript
{
  columns:  { name: string; type: string }[]
  rows:     Record<string, unknown>[]
  rowCount: number
  truncated: boolean  // true nếu kết quả bị cắt do limit
}
```

### Behaviour

- Chỉ accept SELECT — reject nếu detect mutation keyword
- `truncated: true` → hiện banner "Chỉ hiện 100 dòng đầu"
- Null values được đánh dấu riêng để highlight phía UI

### UI block: `AgentTableBlock`

```
┌──────┬──────────────┬────────────────┬──────────────┐
│  id  │    email     │   created_at   │   status     │
├──────┼──────────────┼────────────────┼──────────────┤
│  1   │ a@b.com      │ 2024-01-15     │   active     │
│  2   │ [NULL]       │ 2024-01-16     │   inactive   │  ← NULL highlight
└──────┴──────────────┴────────────────┴──────────────┘
  Showing 2 / 2 rows        [📥 Export CSV]
```

---

## 3. `explain_query`

**Mục đích:** Chạy `EXPLAIN ANALYZE` và dịch output thành ngôn ngữ dễ hiểu.

Giải quyết câu hỏi phổ biến nhất của cả 2 nhóm user: *"Query này sao chạy chậm vậy?"*

### Input schema

```typescript
{
  sql: string  // query cần explain
}
```

### Output

```typescript
{
  rawPlan:       string    // raw EXPLAIN ANALYZE output
  summary:       string    // AI dịch sang plain text
  slowestNode:   string    // tên node có cost cao nhất
  estimatedCost: number    // total cost estimate
  suggestions:   string[]  // gợi ý cụ thể: index, rewrite, v.v.
}
```

### UI block: `AgentExplainBlock`

```
┌─────────────────────────────────────────┐
│ ⚡ Query Analysis                        │
│                                         │
│ Query này chậm vì thiếu index trên      │
│ cột user_id. PostgreSQL đang phải       │
│ full scan 1.2M rows.                   │
│                                         │
│ Suggestions:                            │
│ • CREATE INDEX idx_orders_user_id       │
│   ON orders(user_id)                   │
│                                         │
│ ▼ Raw EXPLAIN output                   │ ← accordion
│   Seq Scan on orders  (cost=0..24819)  │
│   Filter: (user_id = $1)               │
└─────────────────────────────────────────┘
```

---

## 4. `detect_anomaly`

**Mục đích:** Chủ động scan table để phát hiện vấn đề data mà user không biết cần hỏi.

Đây là tool có **wow factor cao nhất** — agent tự tìm vấn đề thay vì chờ user hỏi.

### Input schema

```typescript
{
  tableName: string
  checks: ('nulls' | 'duplicates' | 'orphan_fk' | 'outliers')[]
  // default: ['nulls', 'duplicates', 'orphan_fk']
}
```

### Output

```typescript
{
  issues: {
    type:        'nulls' | 'duplicates' | 'orphan_fk' | 'outliers'
    severity:    'high' | 'medium' | 'low'
    column?:     string
    description: string   // mô tả vấn đề bằng plain text
    fixSql?:     string   // câu query fix suggestion
  }[]
  scannedRows: number
  cleanScore:  number  // 0-100, càng cao càng sạch
}
```

### Check logic

| Check | Query pattern |
|-------|--------------|
| `nulls` | `SELECT COUNT(*) WHERE col IS NULL` cho từng NOT NULL column |
| `duplicates` | `GROUP BY ... HAVING COUNT(*) > 1` |
| `orphan_fk` | `LEFT JOIN ... WHERE fk_table.id IS NULL` |
| `outliers` | Z-score hoặc IQR cho numeric columns |

### UI block: `AgentAnomalyBlock`

```
┌─────────────────────────────────────────┐
│ 🔍 Scan kết quả — Clean Score: 72/100   │
│ Đã scan 45,230 rows                    │
├─────────────────────────────────────────┤
│ 🔴 HIGH   │ 1,203 orphan FK            │
│ orders.user_id → users.id không tồn tại│
│ [Fix suggestion ▼]                     │
│   DELETE FROM orders WHERE             │
│   user_id NOT IN (SELECT id FROM users)│
├─────────────────────────────────────────┤
│ 🟡 MEDIUM │ email IS NULL (234 rows)   │
│ Column email có 5.1% giá trị NULL      │
│ [Fix suggestion ▼]                     │
└─────────────────────────────────────────┘
```

---

## 5. `describe_table`

**Mục đích:** Introspect schema của một table và giải thích bằng ngôn ngữ tự nhiên.

Giải quyết blocker đầu tiên của non-tech user khi mở một bảng lạ.

### Input schema

```typescript
{
  tableName: string
}
```

### Output

```typescript
{
  summary:  string   // 2-3 câu AI mô tả table dùng để làm gì
  columns: {
    name:            string
    type:            string
    isPrimaryKey:    boolean
    isForeignKey:    boolean
    isNullable:      boolean
    referencesTable?: string
    description?:    string  // AI hint per column
  }[]
  relatedTables: string[]  // bảng có FK liên quan trực tiếp
}
```

### Nguồn data

Query từ `information_schema` và `pg_catalog`:

```sql
SELECT
  c.column_name, c.data_type, c.is_nullable,
  tc.constraint_type, ccu.table_name AS references_table
FROM information_schema.columns c
LEFT JOIN information_schema.key_column_usage kcu
  ON c.column_name = kcu.column_name AND c.table_name = kcu.table_name
LEFT JOIN information_schema.table_constraints tc
  ON kcu.constraint_name = tc.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
WHERE c.table_name = $1
```

### UI block: `AgentDescribeBlock`

```
┌─────────────────────────────────────────┐
│ 📋 orders                               │
│                                         │
│ Bảng lưu thông tin đơn hàng của user.  │
│ Mỗi order liên kết với 1 user và       │
│ nhiều order_items.                     │
│                                         │
│ Columns:                                │
│ [PK] id          uuid                  │
│ [FK] user_id     uuid → users.id       │
│      total       numeric               │
│      status      text      [nullable]  │
│      created_at  timestamptz           │
│                                         │
│ Related: users, order_items, payments  │
└─────────────────────────────────────────┘
```

---

## Tool Priority Matrix

| Tool | Non-tech | Dev | Phase |
|------|----------|-----|-------|
| `generate_query` | ⭐ Must | ⭐ Must | 1 |
| `render_table` | ⭐ Must | ⭐ Must | 1 |
| `explain_query` | ✅ | ⭐ Must | 1 |
| `detect_anomaly` | ⭐ | ⭐ | 1 |
| `describe_table` | ⭐ Must | ✅ | 1 |

Tất cả 5 tools đều thuộc Phase 1 vì chúng giải quyết nhu cầu cốt lõi nhất của 2 nhóm user.