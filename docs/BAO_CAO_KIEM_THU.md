# Báo cáo kiểm thử chức năng

Kết quả: **36/36 trường hợp đạt**. Kiểm thử chạy tự động ngày 05/10/2026 bằng trình duyệt Chromium (Playwright), độ phân giải 1440×900, trên bộ dữ liệu mẫu (41 thủ tục, 6 cổng quyết định, 26 văn bản, 28 dòng ma trận, 14 rủi ro, 14 việc kế hoạch).

## Phạm vi

Tìm kiếm, lọc, mở chi tiết thủ tục, sơ đồ cây, ma trận pháp lý, rủi ro, kế hoạch (Kanban, tiến độ, quá hạn), xuất CSV, xuất danh sách cần xin ý kiến, phân quyền thao tác, nhật ký, nhập CSV và cỡ chữ.

## Kết quả chi tiết

| Mã | Trường hợp kiểm thử | Kết quả | Ghi nhận |
| --- | --- | --- | --- |
| KT01 | Tải trang, hiển thị 5 KPI | ĐẠT | KPI=41,17,22,1,22 |
| KT02 | Không có lỗi JavaScript khi tải | ĐẠT |  |
| KT03 | Lọc theo giai đoạn (Nhánh 2) cập nhật KPI | ĐẠT | 41 → 8 |
| KT04 | Lọc theo trạng thái pháp lý | ĐẠT | tổng=15 |
| KT05 | Hiển thị 05 việc ưu tiên | ĐẠT |  |
| KT06 | Hiển thị cổng quyết định gần nhất | ĐẠT |  |
| KT07 | Sơ đồ cây hiển thị đủ nút (41 thủ tục + 6 cổng) | ĐẠT | 47 nút |
| KT08 | Bấm nút trên sơ đồ mở khung chi tiết | ĐẠT | Hồ sơ đề nghị giao khu vực biển để khảo sát |
| KT09 | Khung chi tiết hiển thị văn bản kèm ngày ban hành, hiệu lực, nguồn | ĐẠT |  |
| KT10 | Thu gọn nhánh 4 | ĐẠT | 38 nút |
| KT11 | Mở chi tiết cổng quyết định | ĐẠT |  |
| KT12 | Danh mục hiển thị 15 cột | ĐẠT |  |
| KT13 | Tìm kiếm theo căn cứ “Điều 30 NĐ 58” | ĐẠT | TT-1.6,TT-3.4 |
| KT14 | Tìm kiếm không có kết quả hiển thị thông báo | ĐẠT |  |
| KT15 | Lọc danh mục theo mức ưu tiên Cao | ĐẠT | 13 dòng |
| KT16 | Bấm dòng danh mục mở chi tiết | ĐẠT |  |
| KT17 | Xuất CSV danh mục đang lọc (UTF-8, tiếng Việt) | ĐẠT | 13 dòng |
| KT18 | Ma trận hiển thị cảnh báo văn bản | ĐẠT |  |
| KT19 | So sánh “đã rõ” và “khoảng trống” | ĐẠT | 18 quy định đã rõ · 10 khoảng trống |
| KT20 | Tìm văn bản trong danh mục văn bản | ĐẠT | 2 văn bản |
| KT21 | Bảng rủi ro đủ 14 dòng, 13 cột | ĐẠT |  |
| KT22 | Bản đồ nhiệt có đủ mã rủi ro | ĐẠT |  |
| KT23 | Lọc rủi ro theo nhóm | ĐẠT |  |
| KT24 | Xuất “Nội dung cần xin ý kiến Lãnh đạo PVEP/Petrovietnam” | ĐẠT | 22 nội dung, cấp=['PVEP', 'Petrovietnam'] |
| KT25 | Kanban 4 cột, 14 thẻ | ĐẠT |  |
| KT26 | Bảng tiến độ có thanh thời gian | ĐẠT |  |
| KT27 | Danh sách quá hạn (không có việc quá hạn tại 05/10/2026) | ĐẠT |  |
| KT28 | Người xem không thấy khung cập nhật | ĐẠT |  |
| KT29 | Người cập nhật đổi tình trạng công việc (Kanban) | ĐẠT |  |
| KT30 | Nhật ký ghi người sửa, thời gian, nội dung thay đổi | ĐẠT |  |
| KT31 | Người cập nhật không được nhập tệp | ĐẠT |  |
| KT32 | Quản trị viên nhập CSV (kiểm tra cột, mã trùng) | ĐẠT | Đã nhập 14 dòng vào bảng ke_hoach. Thay đổi chỉ lưu trên trì |
| KT33 | Từ chối CSV sai cấu trúc | ĐẠT |  |
| KT34 | Xóa thay đổi cục bộ, quay về dữ liệu gốc | ĐẠT |  |
| KT35 | Tăng cỡ chữ | ĐẠT | 17.6px |
| KT36 | Không có lỗi JavaScript trong toàn bộ phiên kiểm thử | ĐẠT |  |

## Giới hạn của lần kiểm thử

- Chưa kiểm thử trên Microsoft Edge/Firefox và màn hình dưới 1280 px; giao diện được tối ưu cho máy tính.
- Việc quá hạn (KT27) chưa phát sinh vì mọi hạn đề xuất đều sau ngày kiểm thử; logic so sánh hạn với ngày hiện tại đã có trong mã.
- Phân quyền được kiểm thử ở mức giao diện. Kiểm soát truy cập thực sự phụ thuộc máy chủ nội bộ (xem HUONG_DAN_QUAN_TRI.md, mục 5).
- Kịch bản kiểm thử: `tools/test_app.py` (chạy lại sau mỗi lần sửa mã).
