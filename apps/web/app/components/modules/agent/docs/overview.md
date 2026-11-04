# DB Editor Agent — Module Overview

## Mục tiêu

Module Agent là tính năng AI tích hợp trực tiếp vào DB Editor, cho phép user tương tác với database thông qua ngôn ngữ tự nhiên. Module không thay thế editor truyền thống mà hoạt động song song — user vẫn có thể tự viết SQL, nhưng agent giúp tăng tốc và giảm barrier cho cả 2 nhóm người dùng.

## Đối tượng người dùng

| Nhóm | Nhu cầu chính | Agent giải quyết gì |
|------|---------------|---------------------|
| **Non-technical** (analyst, PM, ops) | Muốn lấy data nhưng không biết SQL | Hỏi bằng tiếng Việt/Anh → agent sinh query → hiện kết quả |
| **Developer** | Biết SQL nhưng muốn nhanh hơn | Debug query, explain plan, gen migration, tìm anomaly |

## Triết lý thiết kế

**"Brain thuộc về app, không phải AI."**

Agent không được tự động thực thi các thao tác nguy hiểm. Mọi mutation (INSERT / UPDATE / DELETE / DROP) đều phải qua bước xác nhận của user. AI đóng vai trò execution layer, còn routing logic và safety gate nằm ở phía app.

```
User intent
    ↓
Intent classification (app)    ← app quyết định, không phải AI
    ↓
Agent execution (AI SDK)
    ↓
Result rendering (block system)
    ↓
User confirmation (nếu cần)
```

## Scope của module

Module Agent gồm 4 phần chính:

1. **Agent Core** — server-side: tools, prompt, routing
2. **Block Renderer** — client-side: hiển thị kết quả theo từng loại
3. **User Workspace** — nơi user định nghĩa rules, instructions, skills
4. **MCP Config** — kết nối external tools qua Model Context Protocol

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | Nuxt 3, Vue 3, TypeScript |
| AI SDK | `ai` (Vercel AI SDK v4) |
| Model | Claude (Anthropic) |
| DB | PostgreSQL (multi-DB sau) |
| Block render | Vue dynamic components |
| Markdown | `@nuxtjs/mdc` |
| ERD | Vue Flow |
| Chart | vue-echarts |
| Table | TanStack Table |

## Phạm vi tài liệu này

```
00-overview.md          ← file này
01-architecture.md      ← system design, data flow
02-agent-tools.md       ← 5 tools spec chi tiết
03-block-renderer.md    ← FE block system
04-user-workspace.md    ← rules, skills, MCP config
```