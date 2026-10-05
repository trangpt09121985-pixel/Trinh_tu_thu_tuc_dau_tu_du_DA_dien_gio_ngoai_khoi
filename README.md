# PVEP · Bản đồ trình tự và thủ tục pháp lý đầu tư dự án điện gió ngoài khơi

Web app nội bộ (tĩnh) gồm 06 phân hệ: Tổng quan lãnh đạo · Bản đồ quy trình dạng cây · Danh mục thủ tục · Ma trận pháp lý · Rủi ro và nội dung xin ý kiến · Kế hoạch hành động; kèm trang Dữ liệu và nhật ký.

## Chạy thử

Mở `index.html` bằng Edge/Chrome. Không cần cài đặt.

## Cấu trúc thư mục

```
index.html                 Khung giao diện
assets/styles.css          Giao diện theo nhận diện PVEP (Deep Navy #005088, logo PVEP)
assets/app.js              Xử lý: lọc, tìm kiếm, sơ đồ cây, chi tiết, xuất CSV, vai trò, nhật ký
assets/logo-pvep.png       Logo PVEP (thu nhỏ từ tệp brand kit 250721_Logo_PVEP.png)
data/*.csv                 06 bảng dữ liệu nguồn (UTF-8)
data/PVEP_DGNK_du_lieu_mau.xlsx  Tệp Excel mẫu để cập nhật
data/data.js               Sinh tự động từ CSV/Excel – không sửa tay
tools/build_data.py        Kiểm tra và sinh data.js; chuyển đổi CSV ↔ Excel
tools/test_app.py          Kịch bản kiểm thử tự động (Playwright)
docs/HUONG_DAN_QUAN_TRI.md Hướng dẫn quản trị dữ liệu, cập nhật căn cứ pháp lý, triển khai
docs/BAO_CAO_KIEM_THU.md   Báo cáo kiểm thử chức năng
```

## Cập nhật dữ liệu

```
python tools/build_data.py --from-xlsx data/PVEP_DGNK_du_lieu_mau.xlsx
```

## Lưu ý bảo mật

Không đưa lên kho GitHub công khai hoặc GitHub Pages công khai. Xem mục 5 của `docs/HUONG_DAN_QUAN_TRI.md`.
