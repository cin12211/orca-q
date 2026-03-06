# DB Editor Agent — Block Renderer System

## Khái niệm

Mỗi response từ agent được render thành một danh sách **blocks** — mỗi block là một đơn vị UI độc lập. Cách tiếp cận này cho phép agent trả về nhiều loại content khác nhau trong cùng một response mà không cần hardcode layout.

```
Agent response
    ↓
processMessageParts()
    ↓
blocks[]  =  [block, block, block, ...]
    ↓
Vue render từng block theo kind
```

---

## Block Types

### Blocks mặc định (AI chat nào cũng có)

#### `text`
Plain string, không có formatting đặc biệt.

```typescript
{ kind: 'text'; content: string }
```

Render: `<p>{{ content }}</p>`

Khi nào xuất hiện: AI trả lời ngắn gọn, không có markdown.

---

#### `markdown`
Formatted text có heading, bold, list, table. Detect tự động từ content của AI.

```typescript
{ kind: 'markdown'; content: string }
```

Render: `<MDC :value="content" />` (Nuxt Content)

Detect pattern:
```typescript
/^#{1,6}\s|(\*\*|__).+(\*\*|__)|^```|^[-*]\s|^\|.+\|/m
```

Khi nào xuất hiện: AI trả lời dạng list, có heading, có table markdown.

---

#### `code`
Code block standalone, extract từ fenced code block.

```typescript
{ kind: 'code'; code: string; language: string }
```

Render: `<pre><code class="language-{lang}">` + Shiki highlight

Detect pattern: `` ```lang\n...\n``` ``

Khi nào xuất hiện: AI trả về snippet SQL, JS, Python, curl.

---

#### `loading`
Thinking indicator khi tool đang execute.

```typescript
{ kind: 'loading'; label: string }
```

Render: animated dot + label text

Labels per tool:
- `generate_query` → "Đang tạo query..."
- `render_table` → "Đang chạy query..."
- `explain_query` → "Đang phân tích query..."
- `detect_anomaly` → "Đang quét dữ liệu..."
- `describe_table` → "Đang đọc schema..."

Lifecycle: xuất hiện khi tool `state === 'call'`, bị swap ra khi `state === 'result'`.

---

#### `error`
Lỗi từ tool execution hoặc network.

```typescript
{ kind: 'error'; message: string }
```

Render: inline banner đỏ với message.

---

### Blocks đặc thù DB Editor

#### `approval`
Gate bắt buộc trước khi thực hiện mutation. Xuất hiện khi tool có `needsApproval: true` hoặc khi `generate_query` trả về `isMutation: true`.

```typescript
{
  kind:       'approval'
  toolName:   ToolName
  input:      unknown   // params của tool call
  approvalId: string    // ID để addToolApprovalResponse()
}
```

Render: `AgentApprovalBlock`

```
┌─────────────────────────────────────────┐
│ ⚠️  Thao tác này sẽ thay đổi dữ liệu   │
│                                         │
│  DELETE FROM sessions                   │
│  WHERE expires_at < now()              │
│                                         │
│  Ước tính: ~12,450 rows bị xoá         │
│                                         │
│       [✗ Huỷ]    [✓ Xác nhận]          │
└─────────────────────────────────────────┘
```

Flow sau approval:
```typescript
// approve
addToolApprovalResponse({ approvalId, approved: true })
// deny
addToolApprovalResponse({ approvalId, approved: false })
```

---

#### `tool` (dynamic)
Kết quả từ một trong 5 agent tools. Component được resolve động qua `TOOL_COMPONENT_MAP`.

```typescript
{
  kind:      'tool'
  toolName:  ToolName
  result:    ToolResultMap[ToolName]
  isLoading: boolean
}
```

Map tool → component:

| toolName | Component |
|----------|-----------|
| `generate_query` | `AgentQueryBlock` |
| `render_table` | `AgentTableBlock` |
| `explain_query` | `AgentExplainBlock` |
| `detect_anomaly` | `AgentAnomalyBlock` |
| `describe_table` | `AgentDescribeBlock` |

---

## useAgentRenderer Composable

Hook trung tâm của toàn bộ block system.

### API

```typescript
const {
  // state
  blocks,           // Ref<AgentBlock[]>
  isStreaming,      // ComputedRef<boolean>
  hasMutationPending, // ComputedRef<boolean>

  // chat
  input,            // Ref<string>
  handleSubmit,     // () => void

  // actions
  handleApproval,   // (approvalId: string, approved: boolean) => void
  getComponent,     // (block: AgentBlock) => string | null
} = useAgentRenderer(schemaContext)
```

### processMessageParts logic

```
for each part in message.parts:
  part.type === 'text'
    → detect code block   → { kind: 'code' }
    → detect markdown     → { kind: 'markdown' }
    → else                → { kind: 'text' }

  part.type === 'tool-invocation'
    → state === 'call'    → { kind: 'loading', label }
    → state === 'result'  → swap loading → { kind: 'tool', result }

  part.type === 'tool-approval-request'
                          → { kind: 'approval', approvalId }

  part.type === 'error'   → { kind: 'error', message }
```

### Watch strategy

```typescript
// Re-process realtime trong lúc stream
watch(
  () => messages.value.at(-1)?.parts,
  (parts) => { if (parts) processMessageParts(parts) },
  { deep: true }
)
```

---

## Block render trong template

```vue
<template v-for="(block, i) in blocks" :key="i">

  <p v-if="block.kind === 'text'">{{ block.content }}</p>

  <MDC v-else-if="block.kind === 'markdown'" :value="block.content" />

  <pre v-else-if="block.kind === 'code'">
    <code :class="`language-${block.language}`">{{ block.code }}</code>
  </pre>

  <AgentLoadingBlock v-else-if="block.kind === 'loading'" :label="block.label" />

  <AgentApprovalBlock
    v-else-if="block.kind === 'approval'"
    :tool-name="block.toolName"
    :input="block.input"
    @approve="handleApproval(block.approvalId, true)"
    @deny="handleApproval(block.approvalId, false)"
  />

  <component
    v-else-if="block.kind === 'tool' && !block.isLoading"
    :is="getComponent(block)"
    :data="block.result"
  />

  <AgentErrorBlock v-else-if="block.kind === 'error'" :message="block.message" />

</template>
```

---

## Thêm block type mới

Khi cần block type mới (ví dụ `render_chart`):

1. Thêm vào `AgentBlock` union type trong `types/agent.ts`
2. Thêm case vào `processMessageParts()` trong composable
3. Tạo Vue component tương ứng
4. Thêm vào `TOOL_COMPONENT_MAP` nếu là tool result
5. Thêm `v-else-if` vào template

Không cần sửa chỗ nào khác — hệ thống thiết kế để open/closed.