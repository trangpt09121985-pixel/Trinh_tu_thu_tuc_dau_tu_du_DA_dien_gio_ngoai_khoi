# Hướng dẫn quản trị dữ liệu và cập nhật căn cứ pháp lý

Áp dụng cho trang “Bản đồ trình tự và thủ tục pháp lý đầu tư dự án điện gió ngoài khơi” của PVEP. Dữ liệu tách khỏi giao diện: giao diện chỉ đọc tệp `data/data.js`, tệp này được sinh từ 06 bảng CSV hoặc từ tệp Excel mẫu.

## 1. Cấu trúc dữ liệu

| Bảng (tệp CSV / trang tính Excel) | Nội dung | Khóa |
| --- | --- | --- |
| `thu_tuc` | Danh mục thủ tục/đầu việc, căn cứ, cơ quan, đầu mối PVEP, trạng thái | `ma` (TT-x.y) |
| `cong_quyet_dinh` | 06 cổng quyết định cuối mỗi nhánh | `ma` (G1–G6) |
| `van_ban` | Danh mục văn bản: số, cơ quan, ngày ban hành, hiệu lực, liên kết, xác minh | `ma_vb` (VBxx) |
| `ma_tran_phap_ly` | Điều khoản, nội dung, tác động, hành động, loại “Quy định đã rõ/Khoảng trống” | `ma` (MTxx) |
| `rui_ro` | Sổ rủi ro, khoảng trống pháp lý, cấp xin ý kiến | `ma` (RRxx) |
| `ke_hoach` | Kế hoạch hành động Quý IV/2026 và năm 2027 | `ma` (KHxx) |

Quy tắc liên kết: cột `ma_van_ban` của `thu_tuc` và cột `ma_vb` của `ma_tran_phap_ly` phải trỏ tới mã có trong `van_ban`. Các mã TT-x.y, RRxx, KHxx, “Cổng Gx” ghi trong cột `buoc_ke_tiep`, `lien_quan` tự động thành liên kết trên giao diện.

### Giá trị được phép (công cụ sẽ từ chối giá trị khác)

| Cột | Giá trị |
| --- | --- |
| `thu_tuc.tinh_trang_can_cu` | Đã rõ · Cần xác minh · Cần hướng dẫn · Cần ý kiến cơ quan có thẩm quyền · Nghiệp vụ nội bộ |
| `thu_tuc.muc_rui_ro`, `uu_tien` | Cao · Trung bình · Thấp |
| `thu_tuc.thoi_diem` | Hiện tại · Chưa đến thời điểm |
| `thu_tuc.trang_thai_thuc_hien`, `ke_hoach.tinh_trang` | Chưa bắt đầu · Đang thực hiện · Hoàn thành · Tạm dừng |
| `thu_tuc.can_xin_y_kien` | Có · Không |
| `ma_tran_phap_ly.loai` | Quy định đã rõ · Khoảng trống |

### Quy tắc tô màu trên sơ đồ cây

1. Xám: `thoi_diem` = “Chưa đến thời điểm” (trừ khi đang thực hiện).
2. Đỏ: `muc_rui_ro` = “Cao”.
3. Xanh đậm: `tinh_trang_can_cu` = “Đã rõ” hoặc “Nghiệp vụ nội bộ”.
4. Vàng: các trường hợp còn lại (cần xác minh, cần hướng dẫn, cần ý kiến).

## 2. Quy trình cập nhật

1. Tải tệp `data/PVEP_DGNK_du_lieu_mau.xlsx` (hoặc các tệp CSV). Trang `Huong_dan` mô tả quy tắc nhập.
2. Sửa hoặc thêm dòng. Không đổi tên trang tính, tên cột. Ngày ghi dạng YYYY-MM-DD.
3. Chạy lệnh tại thư mục gốc (cần Python 3 và `openpyxl`):

   ```
   python tools/build_data.py --from-xlsx data/PVEP_DGNK_du_lieu_mau.xlsx
   ```

   Nếu cập nhật trực tiếp CSV: `python tools/build_data.py`. Công cụ kiểm tra mã trùng, mã văn bản không tồn tại, giá trị ngoài danh sách; có lỗi thì không ghi tệp và liệt kê dòng lỗi.
4. Mở `index.html`, kiểm tra phân hệ liên quan, chạy `python tools/test_app.py` (cần Playwright) để kiểm thử lại.
5. Lưu phiên bản (Git commit hoặc lưu trữ SharePoint) kèm mô tả thay đổi.

### Cập nhật nhanh trên trình duyệt

- Người cập nhật sửa trạng thái thực hiện, tình trạng căn cứ, ghi chú (khung chi tiết thủ tục), tình trạng rủi ro, tình trạng công việc (Kanban/bảng tiến độ). Mỗi thay đổi ghi vào nhật ký: người sửa, thời gian, bảng, mã, trường, giá trị cũ, giá trị mới.
- Quản trị viên nhập tệp CSV thay một bảng, xuất bảng hiện hành, xuất nhật ký, xóa thay đổi cục bộ.
- Thay đổi trên trình duyệt chỉ lưu trên máy đang dùng. Định kỳ, Quản trị viên xuất bảng hiện hành và nhật ký, cập nhật vào tệp gốc theo mục 2.

## 3. Cập nhật căn cứ pháp lý định kỳ

| Tần suất | Việc cần làm | Người thực hiện |
| --- | --- | --- |
| Hằng tháng | Rà soát văn bản mới về điện lực, đầu tư, đấu thầu, biển, môi trường trên Công báo và Cơ sở dữ liệu quốc gia về pháp luật | Ban Pháp chế, Ban PT&KD SPM |
| Khi có văn bản mới/sửa đổi | Thêm dòng `van_ban`; ghi `sua_doi_thay_the` cho văn bản cũ; cập nhật `ma_tran_phap_ly` và cột căn cứ của `thu_tuc` | Ban Pháp chế |
| Hằng quý | Kiểm chứng lại toàn bộ văn bản, cập nhật `ngay_kiem_chung`; trang Ma trận cảnh báo văn bản quá 90 ngày chưa kiểm chứng | Ban Pháp chế |
| Trước mỗi kỳ báo cáo Lãnh đạo | Xuất “Nội dung cần xin ý kiến”, rà soát rủi ro, cập nhật kế hoạch | Ban PT&KD SPM |

Quy tắc nội dung pháp lý:

- Chỉ ghi “Đã rõ” khi đã đối chiếu nguyên văn văn bản gốc và ghi đủ điều, khoản, điểm.
- Cột `lien_ket_chinh_thuc` chỉ điền đường dẫn từ nguồn chính thức (Cơ sở dữ liệu quốc gia về pháp luật, Công báo, Cổng TTĐT Chính phủ, website cơ quan ban hành). Chưa có liên kết thì để trống: giao diện hiển thị “Chưa có liên kết – cần bổ sung”.
- Không điền thời hạn giải quyết, thẩm quyền, biểu mẫu khi chưa có văn bản; ghi “CẦN XÁC MINH”.
- Tiêu chuẩn quốc tế chỉ ghi loại “Tài liệu tham khảo kỹ thuật”.
- Đánh giá tác động/khả năng của rủi ro và hạn trong kế hoạch là đề xuất; cập nhật khi Lãnh đạo phê duyệt.

## 4. Tình trạng dữ liệu mẫu tại 05/10/2026

- Toàn bộ 26 văn bản chưa có liên kết nguồn chính thức; cần bổ sung trước khi phát hành nội bộ.
- Văn bản trích từ bản scan cần đối chiếu Công báo: NĐ 272/2026/NĐ-CP, Luật Dầu khí 10/2026/QH16.
- Chưa có trong bộ tài liệu: QĐ 768/QĐ-TTg (tệp lỗi), Luật Đầu tư 143/2025/QH15, pháp luật về biển, môi trường, xây dựng, hàng hải, khung giá ĐGNK, quy chế phân cấp nội bộ.
- Trạng thái thực hiện mặc định “Chưa bắt đầu”, trừ việc lựa chọn đơn vị khảo sát NTB1. Cần các ban cập nhật thực tế.
- Tên ban chuyên môn PVEP là đề xuất; cần chuẩn hóa theo cơ cấu tổ chức hiện hành.

## 5. Triển khai và phân quyền

Trang là ứng dụng tĩnh (HTML, CSS, JavaScript), chạy được khi mở trực tiếp `index.html` hoặc đặt trên máy chủ web nội bộ.

Chế độ “Người xem/Người cập nhật/Quản trị viên” trên trang chỉ giới hạn thao tác giao diện, không ngăn được người có quyền truy cập tệp. Để đáp ứng yêu cầu phân quyền và không công bố dữ liệu ra ngoài:

1. Đặt trên máy chủ nội bộ hoặc SharePoint/Teams của PVEP, yêu cầu đăng nhập tài khoản công ty; phân quyền đọc/ghi tệp `data/` theo nhóm người dùng.
2. Không dùng GitHub Pages với kho công khai. GitHub Pages của kho riêng tư vẫn công khai trang web, trừ khi tổ chức dùng gói có kiểm soát truy cập Pages (cần Ban CNTT xác minh gói đang dùng).
3. Nếu cần nhiều người cập nhật đồng thời và nhật ký tập trung, bước tiếp theo là chuyển dữ liệu sang SharePoint List hoặc cơ sở dữ liệu nội bộ, giữ nguyên cấu trúc 06 bảng; giao diện chỉ cần thay hàm đọc `data/data.js` bằng hàm gọi API.
4. Thẻ `noindex, nofollow` đã được đặt để công cụ tìm kiếm không lập chỉ mục, nhưng không thay thế kiểm soát truy cập.
