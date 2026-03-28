# App Update UX Report

## Mục tiêu

Tài liệu này trả lời câu hỏi:

- app desktop lớn đang làm flow update như thế nào
- có nên hiện thông báo update mới ở status bar của `orcaq` hay không
- nếu làm thì nên làm theo kiểu nào

Ngữ cảnh hiện tại:

- `orcaq` là desktop productivity app
- user có thể đang mở connection, query, export, xem dữ liệu hoặc giữ context làm việc lâu
- user request muốn nếu có version mới thì hiện ở [StatusBar.vue](/Volumes/Cinny/Cinny/Project/HeraQ/components/modules/app-shell/status-bar/components/StatusBar.vue) bên phải để user click và manual update

## Tóm tắt ngắn

Kết luận ngắn:

- Có, nên làm.
- Nhưng không nên auto-install hoặc auto-restart khi user đang mở app theo mặc định.
- Pattern phù hợp nhất cho `orcaq` là:
  - tự check update ở background
  - hiện một tín hiệu persistent nhưng không phá luồng làm việc ở status bar
  - user click để xem version mới, release notes ngắn, và chọn `Update now` hoặc `Later`
  - sau khi user đồng ý thì download/install
  - chỉ apply khi relaunch hoặc khi user bấm restart

Đây là pattern cân bằng nhất giữa:

- an toàn và cập nhật
- không cắt ngang công việc
- dễ hiểu với user
- phù hợp với app thao tác dữ liệu

## Quan sát từ các app lớn

### 1. VS Code

VS Code mặc định auto-update trên macOS và Windows. Ở tài liệu chính thức, Microsoft nói VS Code mặc định tự cập nhật, nhưng cũng cho phép tổ chức hoặc user đổi sang mode `start`, `manual`, hoặc `none`.

Điểm rút ra:

- default là auto-check
- vẫn có control để chuyển sang manual
- phù hợp với app dev tool, nhưng có tùy chọn cho môi trường enterprise

Nguồn:

- [VS Code FAQ](https://code.visualstudio.com/Docs/supporting/FAQ)
- [VS Code enterprise updates](https://code.visualstudio.com/docs/enterprise/updates)

### 2. Slack

Slack không ép restart ngay giữa lúc user đang dùng. Tài liệu chính thức mô tả khi có update thì icon Help được badge, user click vào rồi chọn restart để apply update.

Điểm rút ra:

- có signal trong app
- user được biết là có bản mới
- apply update vẫn là hành động chủ động của user
- update UX nằm ở một vùng utility nhỏ, không phải modal phá luồng làm việc

Nguồn:

- [Slack desktop update](https://slack.com/help/articles/360048367814-Update-the-Slack-desktop-app)

### 3. Firefox

Firefox tự update theo mặc định, nhưng vẫn cần restart để hoàn tất update.

Điểm rút ra:

- auto-check / auto-download là bình thường
- apply update vẫn gắn với restart
- user không bị cắt ngang giữa lúc đang dùng

Nguồn:

- [Firefox update help](https://support.mozilla.org/kb/Updating%20Firefox)

### 4. 1Password

1Password có một pattern rất đáng học: nếu app đang locked thì nó có thể tự update; nếu đang unlocked thì nó chỉ notify rằng có update available.

Điểm rút ra:

- app phân biệt trạng thái “safe to update” và “user is active”
- khi user đang active hoặc app đang ở trạng thái nhạy cảm thì ưu tiên notify thay vì tự apply
- đây là một pattern mature

Nguồn:

- [1Password update behavior](https://support.1password.com/update-1password/)

### 5. Obsidian

Obsidian desktop thường xuyên check update. Nếu auto updates bật thì app update trên restart. Nếu user thích thì có thể tắt auto updates và check thủ công.

Điểm rút ra:

- auto-check background
- apply ở restart
- user có option manual
- rất giống nhu cầu của một desktop app có context dài

Nguồn:

- [Obsidian updates](https://obsidian.md/help/updates)

### 6. Zoom

Zoom cho phép auto-update, có kênh `Slow` và `Fast`, nhưng update chỉ được cài khi app restart. Tài liệu còn nói nếu user đang join meeting thì app sẽ defer update để tránh làm chậm user.

Điểm rút ra:

- update có thể automatic
- nhưng install/apply vẫn tránh cắt ngang task chính
- app biết defer nếu user đang ở critical activity

Nguồn:

- [Zoom automatic update release frequencies](https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0063814)

### 7. Figma

Figma nói rõ nếu app không ở latest version thì app sẽ hiện message trong app để prompt user update.

Điểm rút ra:

- in-app prompt là pattern phổ biến
- không nhất thiết phải auto-install để vẫn đạt UX tốt
- app productivity nặng collaboration vẫn chọn notify trước

Nguồn:

- [Figma desktop app guide](https://help.figma.com/hc/en-us/articles/5601429983767-Guide-to-the-Figma-desktop-app)

### 8. Chrome

Chrome và Chrome Enterprise nghiêng mạnh về automatic updates, và Google khuyến nghị giữ auto-update để đảm bảo security patches.

Điểm rút ra:

- browser/security-critical app thường ưu tiên auto-update
- manual-only được xem là ngoại lệ cho enterprise hoặc policy-managed devices

Nguồn:

- [Chrome Enterprise update management](https://support.google.com/chrome/a/answer/6350036?hl=en)
- [Chrome Enterprise auto-update recommendation](https://support.google.com/chrome/a/answer/9838774?hl=en)

## Pattern chung rút ra

Từ các ví dụ trên có thể gom thành 3 nhóm:

### Nhóm A: auto-update mạnh

Ví dụ:

- Chrome
- phần nào đó là Firefox / VS Code mặc định

Thường áp dụng cho:

- browser
- security-sensitive software
- app consumer mass-market

Đặc điểm:

- background check tự động
- background download tự động
- update được apply sớm
- restart thường là bước cuối

### Nhóm B: auto-check, notify, user chọn restart/apply

Ví dụ:

- Slack
- Obsidian
- Figma
- một phần của VS Code

Thường áp dụng cho:

- productivity app
- dev tool
- creative tool
- app có session làm việc dài

Đặc điểm:

- app chủ động biết có bản mới
- user được thông báo bằng badge/banner/menu/status
- apply update do user quyết định
- rất ít khi app ép update ngay trong active session

### Nhóm C: state-aware updating

Ví dụ:

- 1Password
- Zoom

Đặc điểm:

- app không chỉ nhìn version
- app còn nhìn trạng thái runtime
- nếu user đang bận hoặc app đang ở trạng thái “nhạy cảm” thì app defer việc update

Đây là pattern tốt nhất nếu app có:

- connection đang mở
- task dài
- dữ liệu chưa save
- thao tác có thể bị gián đoạn

## `orcaq` nên đứng ở nhóm nào

`orcaq` không nên theo kiểu Chrome.

Lý do:

- user có thể đang chạy query dài
- user có thể đang mở nhiều tab / context làm việc
- user có thể đang xử lý DB production hoặc staging
- auto-restart hoặc auto-apply giữa session có thể gây bực và mất niềm tin

`orcaq` nên theo kiểu:

- Slack
- Obsidian
- 1Password
- Zoom

Tức là:

- check tự động
- báo nhẹ nhưng persistent
- user click để manual update
- app chỉ apply khi user chấp nhận

## Đánh giá riêng cho ý tưởng hiện ở Status Bar

Tôi nghĩ ý tưởng này là đúng hướng.

### Vì sao hợp lý

- status bar là vùng utility, không phá task chính
- update là thông tin hệ thống, không phải nội dung nghiệp vụ
- user có thể thấy liên tục nếu app đang mở lâu
- click-to-update là hành vi rõ ràng

### Vì sao tốt hơn modal auto-popup

- modal dễ gây khó chịu khi user đang query hoặc đang đọc dữ liệu
- status bar cho phép “thấy nhưng không bị ép”
- app vẫn có thể bổ sung toast một lần đầu để user biết có update, rồi giữ CTA persistent ở status bar

### Điểm cần chú ý

- status bar chỉ nên hiện khi thật sự có update
- nên có trạng thái rõ:
  - `Update available`
  - `Downloading update`
  - `Ready to restart`
- không nên chỉ hiện icon mơ hồ
- nên có tooltip hoặc popover khi click

## Recommendation cho `orcaq`

### Recommendation chính

Nên làm flow sau:

1. App check update tự động khi startup.
2. Sau đó check lại theo chu kỳ nhẹ, ví dụ mỗi 6 hoặc 12 giờ nếu app vẫn đang mở.
3. Nếu có update:
   - show toast một lần
   - show indicator persistent ở bên phải status bar
4. User click indicator:
   - mở popover hoặc dialog nhỏ
   - thấy version mới
   - thấy release notes ngắn
   - có nút `Update now`
   - có nút `Later`
5. Nếu user bấm `Update now`:
   - download/install ở background
   - khi xong thì đổi CTA thành `Restart to update`
6. Chỉ restart khi user bấm.

### Recommendation phụ

Sau này có thể thêm setting:

- `Automatically download updates`
- `Apply updates on next restart`

Nhưng không nên bật auto-install/restart mặc định ở phase đầu.

## Recommendation theo phase

### Phase 1

Làm ngay:

- background check
- toast một lần khi có update
- status bar chip ở bên phải
- click để manual update
- restart do user xác nhận

Đây là phase phù hợp nhất với hiện trạng app.

### Phase 2

Làm sau nếu cần:

- auto-download sau khi phát hiện update
- vẫn không auto-restart
- status bar đổi sang `Restart to update`

### Phase 3

Chỉ cân nhắc nếu sau này có yêu cầu security/compliance:

- forced update cho critical security release
- minimum supported version
- soft-block hoặc hard-block cho version quá cũ

Tôi không khuyến nghị làm phase này bây giờ.

## Khi nào không nên auto-update ngay

Nếu có một trong các trạng thái sau thì không nên auto-apply:

- đang có query chạy
- đang export/import
- đang kết nối DB active
- đang có editor content chưa persist
- đang fullscreen hoặc đang trong flow user thao tác liên tục

Với `orcaq`, việc “notify trước, apply sau” hợp hơn nhiều.

## UI đề xuất cho Status Bar

Ở [StatusBar.vue](/Volumes/Cinny/Cinny/Project/HeraQ/components/modules/app-shell/status-bar/components/StatusBar.vue), bên phải có thể thêm một chip ngay gần version hiện tại.

Ví dụ states:

- `v1.0.31`
- `Update 1.0.32`
- `Downloading 42%`
- `Restart to update`

Hành vi:

- hover: tooltip với version mới + publish date
- click:
  - nếu chưa download: mở update popover/dialog
  - nếu đang download: mở progress
  - nếu xong: hiện `Restart to update`

## Verdict

Kết luận cuối:

- Có nên làm không: Có.
- Có nên auto-update hoàn toàn khi user đang mở app không: Không nên, ít nhất không phải mặc định.
- Flow tốt nhất cho `orcaq`: auto-check + status bar notification + manual install/restart.

Lý do:

- khớp với pattern của nhiều desktop productivity/dev apps
- ít làm gián đoạn user
- phù hợp với app có database session
- vẫn đảm bảo user luôn được biết có bản mới
- dễ triển khai dần từ flow updater hiện đã có

## Nguồn tham khảo

- [VS Code FAQ](https://code.visualstudio.com/Docs/supporting/FAQ)
- [VS Code enterprise updates](https://code.visualstudio.com/docs/enterprise/updates)
- [Slack desktop update](https://slack.com/help/articles/360048367814-Update-the-Slack-desktop-app)
- [Firefox update help](https://support.mozilla.org/kb/Updating%20Firefox)
- [1Password update behavior](https://support.1password.com/update-1password/)
- [Obsidian updates](https://obsidian.md/help/updates)
- [Zoom automatic update release frequencies](https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0063814)
- [Figma desktop app guide](https://help.figma.com/hc/en-us/articles/5601429983767-Guide-to-the-Figma-desktop-app)
- [Chrome Enterprise update management](https://support.google.com/chrome/a/answer/6350036?hl=en)
- [Chrome Enterprise auto-update recommendation](https://support.google.com/chrome/a/answer/9838774?hl=en)
