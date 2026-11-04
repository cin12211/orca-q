# DB Editor Agent — User Workspace

## Tổng quan

User Workspace là hệ thống file cho phép user và team tuỳ chỉnh hành vi của agent mà không cần thay đổi code. Toàn bộ workspace được lưu dưới dạng file trong một folder đặc biệt, tích hợp với tree file/folder sẵn có của app.

---

## Cấu trúc thư mục

```
.db-agent/
├── rules/
│   ├── general.md           ← rule áp dụng cho mọi request
│   ├── naming.md            ← naming convention của project
│   └── security.md          ← quy tắc bảo mật data
│
├── instructions/
│   ├── users.md             ← context riêng cho table users
│   ├── orders.md            ← context riêng cho table orders
│   └── _schema.md           ← mô tả tổng quan về database này
│
├── skills/
│   ├── monthly-report.md    ← skill: tạo báo cáo tháng
│   ├── find-duplicates.md   ← skill: workflow tìm duplicate
│   └── audit-changes.md     ← skill: audit trail workflow
│
└── mcp.config.json          ← kết nối MCP servers bên ngoài
```

---

## Rules

Rules là các chỉ dẫn luôn được inject vào system prompt của agent, áp dụng cho **mọi** request trong project.

### Khi nào dùng Rules

- Naming convention của team (snake_case, camelCase...)
- Quy tắc về loại query được phép chạy
- Ngôn ngữ agent nên dùng để trả lời
- Quy định về format output

### Format file

```markdown
# Rule: Naming Convention

- Luôn dùng snake_case cho tên column và table
- Primary key luôn là `id` kiểu uuid, không dùng serial integer
- Timestamp columns luôn có suffix `_at` (created_at, updated_at)
- Boolean columns luôn có prefix `is_` hoặc `has_`

# Rule: Query Safety

- Không bao giờ SELECT \* trên bảng có hơn 50 columns
- Luôn thêm LIMIT khi query không có WHERE clause
- Với bảng logs hoặc events, luôn filter theo time range
```

### Cách server load rules

```typescript
// server/api/ai/agent.post.ts
const rules = await loadWorkspaceFiles(projectId, '.db-agent/rules/');
// → nối tất cả rules thành 1 string, inject vào system prompt đầu tiên
```

---

## Instructions

Instructions là context riêng cho từng **table** hoặc **schema**, giúp agent hiểu business logic mà không thể đọc được từ schema thuần.

### Khi nào dùng Instructions

- Giải thích ý nghĩa business của một table
- Mô tả các enum values và ý nghĩa của chúng
- Cảnh báo về data quirk đặc biệt của table
- Ghi chú các relationship phức tạp không thể express qua FK

### Format file

Tên file = tên table (hoặc `_schema.md` cho toàn bộ DB).

```markdown
# Table: orders

Bảng này lưu tất cả đơn hàng, bao gồm cả đơn đã huỷ và đơn test.

## Status values

| status       | Ý nghĩa                                   |
| ------------ | ----------------------------------------- |
| `draft`      | Đơn chưa được submit, user đang điền form |
| `pending`    | Đã submit, chờ payment confirmation       |
| `processing` | Payment xong, đang chuẩn bị hàng          |
| `shipped`    | Đã giao cho shipper                       |
| `delivered`  | Shipper xác nhận giao thành công          |
| `cancelled`  | Đơn bị huỷ (có thể ở bất kỳ stage nào)    |

## Lưu ý quan trọng

- Đơn có `is_test = true` là đơn test nội bộ, KHÔNG tính vào doanh thu
- Column `metadata` là JSONB, không có fixed schema — hỏi team backend trước khi query
- Không bao giờ DELETE orders, chỉ UPDATE status = 'cancelled'

## Query patterns thường dùng

Doanh thu thực (bỏ test orders):
SELECT SUM(total) FROM orders
WHERE status = 'delivered' AND is_test = false
```

### Server load instructions

```typescript
// inject context của table liên quan khi user hỏi về table đó
const tableInstruction = await loadInstruction(projectId, tableName);
// prepend vào system prompt trước schema context
```

---

## Skills

Skills là các **workflow có tên** mà user có thể gọi bằng câu lệnh tắt. Thay vì mô tả lại toàn bộ quy trình mỗi lần, user chỉ cần nói "chạy skill monthly-report".

### Khi nào dùng Skills

- Workflow phức tạp nhiều bước mà team dùng lặp lại
- Query patterns đặc thù của business
- Report templates cần chạy định kỳ

### Format file

```markdown
# Skill: Monthly Revenue Report

## Trigger

User nói: "báo cáo doanh thu tháng", "monthly report", "revenue report"

## Mô tả

Tạo báo cáo doanh thu tháng bao gồm: tổng doanh thu, số đơn hàng,
AOV (average order value), và so sánh với tháng trước.

## Steps

1. Query tổng doanh thu tháng hiện tại:
   SELECT
   COUNT(\*) as total_orders,
   SUM(total) as revenue,
   AVG(total) as aov
   FROM orders
   WHERE status = 'delivered'
   AND is_test = false
   AND date_trunc('month', created_at) = date_trunc('month', now())

2. Query tháng trước để so sánh (thay now() bằng now() - interval '1 month')

3. Tính % thay đổi và render kết quả dạng markdown summary

## Output format

Trả về markdown với bảng tổng hợp và highlight % tăng/giảm
```

### Cách agent nhận diện skill trigger

```typescript
// server/api/ai/agent.post.ts
const skills = await loadSkills(projectId);
const systemPrompt = `
  ...
  Available skills:
  ${skills.map(s => `- ${s.name}: ${s.trigger}`).join('\n')}
  
  When user triggers a skill, follow its steps exactly.
`;
```

---

## MCP Config

File `mcp.config.json` cho phép agent kết nối với các MCP servers bên ngoài để mở rộng khả năng mà không cần build thêm tool.

### Format file

```json
{
  "version": "1.0",
  "servers": [
    {
      "name": "github",
      "description": "Tìm kiếm code và issues trên GitHub repo",
      "transport": "sse",
      "url": "https://mcp.github.com/sse",
      "auth": {
        "type": "bearer",
        "tokenEnvVar": "GITHUB_TOKEN"
      },
      "enabled": true
    },
    {
      "name": "slack",
      "description": "Gửi thông báo kết quả query lên Slack",
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-slack"],
      "env": {
        "SLACK_BOT_TOKEN": "${SLACK_BOT_TOKEN}",
        "SLACK_TEAM_ID": "${SLACK_TEAM_ID}"
      },
      "enabled": false
    },
    {
      "name": "filesystem",
      "description": "Đọc/ghi file CSV để import/export data",
      "transport": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/data/exports"
      ],
      "enabled": true
    }
  ],
  "options": {
    "timeout": 30000,
    "maxToolsPerServer": 10
  }
}
```

### Transport types

| Type    | Mô tả                   | Dùng khi                |
| ------- | ----------------------- | ----------------------- |
| `stdio` | Spawn process local     | MCP server cài trên máy |
| `sse`   | HTTP Server-Sent Events | MCP server remote/cloud |

### Server load MCP config

```typescript
// server/api/ai/agent.post.ts
import { createMCPClient } from 'ai';

const mcpConfig = await loadMCPConfig(projectId);
const mcpClients = await Promise.all(
  mcpConfig.servers
    .filter(s => s.enabled)
    .map(s => createMCPClient({ transport: buildTransport(s) }))
);

const mcpTools = await Promise.all(mcpClients.map(c => c.tools()));
// merge với dbAgentTools
const allTools = { ...dbAgentTools, ...Object.assign({}, ...mcpTools) };
```

---

## File Editor trong App

App đã có sẵn tree file/folder — workspace tích hợp tự nhiên vào đó:

### UX flow

```
Sidebar (file tree)
└── .db-agent/          ← folder đặc biệt, có icon riêng
    ├── rules/
    │   └── general.md  ← click → mở editor markdown
    ├── instructions/
    │   └── users.md
    ├── skills/
    │   └── monthly.md
    └── mcp.config.json ← click → mở JSON editor có schema validation
```

### Tính năng editor cho workspace files

| File type                           | Editor          | Tính năng đặc biệt                        |
| ----------------------------------- | --------------- | ----------------------------------------- |
| `.md` (rules, instructions, skills) | Markdown editor | Preview panel, syntax highlight           |
| `mcp.config.json`                   | JSON editor     | Schema validation, test connection button |

### Validation khi save

- **Rules/Instructions/Skills**: Kiểm tra file không rỗng, có heading `#`
- **mcp.config.json**: Validate theo JSON schema, test ping tới server nếu `enabled: true`

---

## Thứ tự inject vào system prompt

Khi có đầy đủ workspace, agent nhận context theo thứ tự ưu tiên:

```
1. Core system prompt (hardcoded)
2. Rules (từ .db-agent/rules/)           ← luôn inject
3. Schema context (introspect từ DB)     ← luôn inject
4. Table instructions (relevant tables)  ← inject theo context
5. Skills (tên + trigger)               ← luôn inject nếu có
6. MCP tools description                ← inject nếu có server enabled
```

Context càng gần cuối càng có priority cao hơn trong attention của model.
