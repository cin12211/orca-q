# DB Editor Agent — Architecture

## Tổng quan hệ thống

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENT (Nuxt/Vue)                  │
│                                                         │
│   AgentChat.vue                                         │
│       │                                                 │
│       ├── useAgentRenderer()   ← composable chính       │
│       │       ├── processMessageParts()                  │
│       │       ├── blocks[]     ← reactive state         │
│       │       └── handleApproval()                      │
│       │                                                 │
│       └── Block Components                              │
│               ├── AgentTableBlock                       │
│               ├── AgentQueryBlock                       │
│               ├── AgentExplainBlock                     │
│               ├── AgentAnomalyBlock                     │
│               ├── AgentDescribeBlock                    │
│               └── AgentApprovalBlock                    │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP stream (POST /api/ai/agent)
┌────────────────────────▼────────────────────────────────┐
│                   SERVER (Nuxt server)                  │
│                                                         │
│   server/api/ai/agent.post.ts                              │
│       │                                                 │
│       ├── streamText()         ← AI SDK                 │
│       │       ├── system prompt + schema context        │
│       │       ├── tools: dbAgentTools                   │
│       │       └── stopWhen: stepCountIs(5)              │
│       │                                                 │
│       └── server/tools/index.ts                         │
│               ├── generate_query                        │
│               ├── render_table                          │
│               ├── explain_query                         │
│               ├── detect_anomaly                        │
│               └── describe_table                        │
└────────────────────────┬────────────────────────────────┘
                         │
            ┌────────────▼────────────┐
            │     PostgreSQL DB       │
            └─────────────────────────┘
```

## Data flow chi tiết

### Flow 1 — Query thông thường (read-only)

```
1. User gõ: "Có bao nhiêu user đăng ký tháng này?"

2. POST /api/ai/agent
   body: { messages, schemaContext }

3. streamText() gọi AI với schema context

4. AI quyết định gọi tool: generate_query
   input: { prompt, schema, dialect: 'postgresql' }

5. execute() sinh SQL:
   SELECT COUNT(*) FROM users
   WHERE created_at >= date_trunc('month', now())

6. AI tự gọi tiếp render_table với SQL vừa sinh

7. execute() chạy query thật → trả về rows

8. Stream parts về client:
   [text] → [tool-invocation: generate_query] → [tool-invocation: render_table]

9. processMessageParts() parse → blocks[]

10. Vue render:
    - AgentQueryBlock (SQL + explanation)
    - AgentTableBlock (kết quả)
```

### Flow 2 — Mutation (có approval gate)

```
1. User gõi: "Xoá toàn bộ session hết hạn"

2. AI sinh query: DELETE FROM sessions WHERE expires_at < now()

3. generate_query trả về: { isMutation: true, sql: '...' }

4. Client detect isMutation → render AgentApprovalBlock
   thay vì tự động run

5. User click "Confirm" → addToolApprovalResponse()

6. Tool execute → chạy query

7. render_table hiện affected rows
```

### Flow 3 — Multi-step agentic

```
1. User: "Tìm slow queries rồi suggest index"

2. Step 1: AI gọi explain_query cho query hiện tại
   → parse EXPLAIN ANALYZE

3. Step 2: AI gọi detect_anomaly để check missing index

4. Step 3: AI tổng hợp → trả text với suggestions

stopWhen: stepCountIs(5) → tối đa 5 vòng
```

## Schema Context

Trước mỗi request, app build schema context và đưa vào system prompt:

```typescript
// server/api/ai/agent.post.ts
const schemaContext = await buildSchemaContext(connectionId);
// → "Table: users (id uuid PK, email text NOT NULL, created_at timestamptz)"
// → "Table: sessions (id uuid PK, user_id uuid FK→users.id, expires_at timestamptz)"
```

Schema context giúp AI không cần gọi `describe_table` mỗi lần → giảm latency.

## Safety Layer

| Tình huống                  | Cơ chế bảo vệ                                     |
| --------------------------- | ------------------------------------------------- |
| Query có DELETE/UPDATE/DROP | `isMutation: true` → approval gate bắt buộc       |
| Query vượt limit rows       | `limit: 100` default trong render_table           |
| Agent loop vô hạn           | `stopWhen: stepCountIs(5)`                        |
| Tool call lỗi               | `experimental_onToolCallFinish` log + error block |
| SQL injection qua input     | Parameterized query trong execute()               |

## User Workspace Integration

Agent đọc thêm context từ User Workspace (xem `04-user-workspace.md`):

```
.db-agent/
├── rules/          → inject vào system prompt
├── instructions/   → per-table hoặc per-schema hints
├── skills/         → custom tool behaviors
└── mcp.config.json → external MCP servers
```

Mỗi request, server load workspace context và prepend vào system prompt:

```typescript
const workspaceContext = await loadWorkspaceContext(projectId);
// → rules + instructions tương ứng với schema hiện tại
```
