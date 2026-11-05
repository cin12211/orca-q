# Reasoning Block Review

## Scope

Review tập trung vào luồng hiển thị reasoning của agent tại:

- `components/modules/agent/components/tool-message/AgentReasoningBlock.vue`
- `components/modules/agent/hooks/useDbAgentRenderer.ts`
- `components/modules/agent/components/AgentMessageBubble.vue`

Mục tiêu của file này là review và suggestion בלבד, không áp dụng thay đổi hành vi.

## Findings

### 1. Reasoning đang bị gom toàn bộ về đầu message

Ở `useDbAgentRenderer.ts`, tất cả `reasoning` part trong cùng một assistant message đang bị merge thành một block duy nhất rồi push lên trước `otherBlocks`.

Tác động:

- Mất thứ tự gốc giữa reasoning, tool call, tool result, text.
- Nếu model emit reasoning trước và sau tool call, UI vẫn hiển thị như reasoning xảy ra trước toàn bộ tool flow.
- Khi user nhìn timeline, cảm giác agent “nghĩ xong hết rồi mới gọi tool”, trong khi stream thực tế có thể xen kẽ.

Rủi ro:

- Gây hiểu sai về tiến trình thực thi của agent.
- Khó debug khi reasoning phụ thuộc vào output của tool nhưng lại xuất hiện như một block reasoning thống nhất.

### 2. Reasoning block tự đóng ngay khi stream kết thúc

Ở `AgentReasoningBlock.vue`, watcher đang dùng logic:

- `streaming === true` -> mở block
- `streaming === false` -> đóng block

Tác động:

- User vừa thấy reasoning xong thì block lập tức collapse.
- Nếu user muốn đọc lại reasoning cuối cùng, phải mở lại thủ công mỗi lần.
- Trải nghiệm này khá gắt đối với streaming UI vì component tự thay đổi state ngay khi token cuối về.

Rủi ro:

- UX bị giật.
- Làm giảm khả năng scan lại reasoning sau khi output hoàn tất.

### 3. Trạng thái hiển thị single-step reasoning chưa nhất quán với stream smoothing

Trong `AgentReasoningBlock.vue`, danh sách `steps` được build từ `smoothedContent`, nhưng trường hợp chỉ có một đoạn reasoning thì phần render cuối đang dùng `content` thay vì cùng nguồn dữ liệu đó.

Tác động:

- Hai nhánh render dùng hai nguồn state khác nhau.
- Trong lúc stream nhanh, branch nhiều bước và một bước có thể cho cảm giác update khác nhau.

Rủi ro:

- Hành vi hiển thị không nhất quán.
- Khó maintain nếu sau này thay đổi smoothing strategy.

### 4. Nút toggle reasoning còn thiếu trạng thái accessibility quan trọng

Hiện tại button toggle reasoning chưa có:

- `aria-expanded`
- `aria-controls`

Tác động:

- Screen reader không biết block đang mở hay đóng.
- Quan hệ giữa button và panel không rõ ràng.

Rủi ro:

- Giảm accessibility của component.

### 5. Nội dung copy của assistant message không bao gồm reasoning

Ở `AgentMessageBubble.vue`, `messageText` chỉ gom:

- `text`
- `markdown`
- `code`

Reasoning bị bỏ qua hoàn toàn.

Tác động:

- Khi user copy một câu trả lời để audit/debug, reasoning context không đi theo.
- Điều này có thể đúng nếu sản phẩm cố tình ẩn reasoning khỏi copy flow, nhưng hiện tại code không thể hiện rõ đây là quyết định chủ đích.

Rủi ro:

- Hành vi “copy thiếu dữ liệu” dễ gây khó hiểu.

## Suggestions

### Suggestion A

Nếu mục tiêu là timeline trung thực, nên giữ reasoning theo đúng thứ tự part gốc và chỉ merge các reasoning block liền kề.

Phù hợp khi:

- Muốn debug agent flow.
- Muốn user thấy rõ reasoning trước và sau tool execution.

### Suggestion B

Nếu mục tiêu là UI gọn, vẫn có thể gom reasoning thành một block nhưng không nên ép nó luôn đứng trước toàn bộ tool blocks.

Phù hợp khi:

- Muốn giảm số block render.
- Vẫn cần giữ tương đối ngữ cảnh theo từng phase của response.

### Suggestion C

Nên để reasoning block auto-open trong lúc stream, nhưng không auto-close khi stream kết thúc. Sau đó quyền đóng/mở nên để user quyết định.

Lý do:

- Giảm cảm giác UI “giật”.
- Tăng khả năng đọc lại reasoning sau khi output hoàn tất.

### Suggestion D

Chuẩn hóa render source cho reasoning về một nguồn duy nhất, ưu tiên `smoothedContent` cho cả:

- danh sách nhiều step
- single-step paragraph

Lý do:

- Tránh divergence giữa hai branch render.
- Dễ maintain hơn.

### Suggestion E

Bổ sung accessibility attributes cho toggle button:

- `aria-expanded`
- `aria-controls`

Và gán id ổn định cho panel reasoning.

### Suggestion F

Cần chốt rõ product decision cho hành vi copy:

- Nếu reasoning không được phép copy, nên giữ nguyên nhưng thêm comment hoặc naming rõ ý đồ.
- Nếu reasoning nên đi theo khi copy, cần append reasoning vào `messageText` theo format tách biệt.

## Recommendation Priority

Ưu tiên nên làm nếu tiếp tục cải thiện reasoning UX:

1. Không auto-close khi stream kết thúc.
2. Giữ reasoning theo đúng thứ tự part hoặc ít nhất chỉ merge reasoning liền kề.
3. Chuẩn hóa `smoothedContent` cho mọi nhánh render.
4. Bổ sung accessibility cho toggle.
5. Chốt rõ hành vi copy reasoning theo yêu cầu sản phẩm.

## Summary

Logic hiện tại đang thiên về UI gọn hơn là timeline trung thực. Điều này không sai, nhưng nó đánh đổi khả năng đọc tiến trình reasoning theo đúng thứ tự stream. Nếu sản phẩm ưu tiên tính minh bạch và khả năng debug, reasoning nên được render sát thứ tự gốc hơn. Nếu sản phẩm ưu tiên sự tối giản, có thể giữ cách gom block hiện tại nhưng vẫn nên bỏ auto-close và cải thiện accessibility.