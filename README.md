# TOEIC Studio · ETS 2024 & 2026

Web luyện TOEIC cá nhân, gồm **10 đề năm 2024 và 10 đề năm 2026**. Dùng nút **2024 / 2026** để chọn năm; mỗi năm gộp câu theo từng Part và lưu tiến độ riêng. Có đủ **4.000 câu hỏi, 4.000 đáp án gốc và 4.000 lời giải**; chọn đáp án sẽ hiện ngay kết quả và lời giải.

## Dùng trên máy khác

```sh
git clone https://github.com/nguyenthanhduc0901/toiec.git
cd toiec
```

**Mở `index.html` bằng Edge hoặc Chrome là dùng được.** Đây là file HTML độc lập, đã chứa CSS, JavaScript và toàn bộ dữ liệu đề. Không cần Node.js, npm install, tài khoản Zenlish hoặc remote debugging để dùng bản đã đóng gói.

Ảnh và audio phát trực tiếp từ URL nguồn Zenlish nên **vẫn cần Internet**. Kho Git chứa nội dung đề, đáp án, lời giải và các URL media; không chứa bản sao các file âm thanh/ảnh.

## Các chức năng

| Part | Nội dung | Số câu từ 10 đề trong mỗi năm |
| --- | --- | ---: |
| 1 | Mô tả tranh | 60 |
| 2 | Hỏi & đáp | 250 |
| 3 | Hội thoại | 390 |
| 4 | Bài nói ngắn | 300 |
| 5 | Hoàn thành câu | 300 |
| 6 | Hoàn thành đoạn văn | 160 |
| 7 | Đọc hiểu | 540 |

- Chọn năm **2024 / 2026** ở thanh bên. Trong mỗi Part của năm đã chọn, luyện liên tục Test 1 → Test 10.
- Tiến độ 2024 cũ tiếp tục dùng được; chuyển năm không xóa hoặc trộn lựa chọn, đánh dấu và vị trí học.
- Chọn một đáp án để hiện ngay đáp án đúng và lời giải nguồn. Lựa chọn khóa sau lượt đầu; có nút làm lại Part.
- Giữ chung nội dung/audio cho các câu thuộc cùng một nhóm.
- Audio tự phát khi chuyển sang nhóm nghe mới bằng nút trước/sau, bản đồ câu, đổi Part hoặc bộ lọc; đổi câu trong cùng nhóm giữ nguyên vị trí và trạng thái phát. Khi mới mở trang, bấm Play để bắt đầu nghe.
- Khi chạy bằng `npm start`, app tải nền tất cả audio của Part đang chọn theo thứ tự ngẫu nhiên (ưu tiên đoạn hiện tại, hai lượt tải đồng thời). Câu có audio tải xong được tô xanh nhạt trên bản đồ; màu đúng/sai và đánh dấu vẫn giữ nguyên. Bộ lọc không giới hạn hàng đợi tải của Part.
- Audio hoàn tất được giữ trong `work/audio-cache/` trên máy này và dùng lại sau khi mở lại web. Đổi Part/năm sẽ chuyển hàng đợi sang lựa chọn mới; các lượt đang tải trên server có thể hoàn tất nốt. File lỗi được thử tối đa ba lần và có nút thử lại. Audio cache không được đưa lên Git hoặc kèm file tiến độ.
- Lọc theo đề, câu chưa làm, câu sai, câu đánh dấu; có bản đồ câu và điều hướng trước/sau.
- Lưu tiến độ tự động trong trình duyệt; xuất/nhập JSON để chuyển tiến độ sang máy khác.
- Giao diện thích ứng màn hình máy tính và điện thoại.

## Chuyển tiến độ sang máy khác

Git chứa app và bộ đề, **không tự đồng bộ các lựa chọn cá nhân** trong trình duyệt.

1. Máy cũ: chọn đúng năm, rồi **Dữ liệu & sao lưu → Xuất tiến độ**.
2. Chuyển file JSON vừa xuất sang máy mới.
3. Máy mới: chọn cùng năm, rồi **Dữ liệu & sao lưu → Nhập tiến độ**. Tệp của năm khác bị từ chối để tránh nhập nhầm. Bản sao lưu chứa cả vị trí học và đáp án bổ sung.

Không commit file tiến độ hoặc dữ liệu đăng nhập. `localStorage` tách theo trình duyệt và địa chỉ mở app: bản `file://` và bản `http://127.0.0.1:4173` có vùng lưu khác nhau. Hãy giữ một cách mở ổn định hoặc chuyển bằng xuất/nhập.

## Phát triển bằng Node.js

Cần Node.js **18 trở lên**, không có thư viện phụ thuộc.

```sh
npm run build
npm run check
npm start
```

Mở `http://127.0.0.1:4173`. Dừng máy chủ bằng Ctrl+C. Có thể chạy trực tiếp `node scripts/build.mjs`, `node scripts/check.mjs`, `node scripts/serve.mjs` nếu PowerShell chặn `npm.ps1`.

Tải trước audio cần server local này để lưu file đầy đủ từ Zenlish; mở `index.html` trực tiếp vẫn luyện bài và phát từ nguồn như cũ, nhưng không có tải nền. Ảnh và các audio chưa tải vẫn cần Internet. Chạy `npm run test:audio-cache` để kiểm tra hàng đợi, thử lại, lưu file đầy đủ và tua audio từ cache.

Sau mỗi lần sửa nguồn/dữ liệu, chạy build và check rồi commit **cả nguồn lẫn `index.html`**. Script build dùng đường dẫn tương đối theo repository, không phụ thuộc tên thư mục, máy tính hoặc thư mục shell hiện tại.

## Cấu trúc repository

```text
index.html                 Bản chạy ngay, được tạo bởi build
src/template.html          Cấu trúc HTML và placeholder
src/app.css                Giao diện responsive
src/app.js                 Chọn câu, chấm, lời giải, audio, lưu tiến độ
data/ets2024.json           Bộ đề đã chuẩn hóa, đáp án và lời giải đầy đủ
data/ets2026.json           Bộ đề 2026 đã chuẩn hóa
scripts/library.mjs        Gộp dữ liệu hai năm vào bản HTML
scripts/build.mjs          Đóng gói thành HTML độc lập
scripts/check.mjs          Kiểm tra bộ đề, thứ tự, cấu trúc và bản build
scripts/serve.mjs          Máy chủ local tùy chọn, chỉ lắng nghe loopback
AGENTS.md                  Hướng dẫn cho agent làm việc trên máy khác
docs/ARCHITECTURE.md        Thiết kế và hợp đồng dữ liệu
docs/DATA-SOURCES.md        Nguồn dữ liệu và cách cập nhật
docs/VALIDATION.md          Những gì đã kiểm thử và giới hạn
```

## Nguồn

Nội dung, đáp án và lời giải được đọc từ [Zenlish](https://zenlishtoeic.vn/test-online-new/), phạm vi TEST 1–10 các năm 2024 và 2026. Bản này tổ chức lại để luyện tập cá nhân; không phải sản phẩm chính thức của Zenlish hoặc ETS. Không có đáp án/lời giải do AI suy đoán.

Repository không chứa cookie, token, thông tin tài khoản, lịch sử bài làm hoặc hồ sơ Edge. Nguồn có thể đổi hoặc chặn URL media trong tương lai; xem hướng dẫn cập nhật trong `docs/DATA-SOURCES.md`.
