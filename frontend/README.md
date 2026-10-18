# Project F — Frontend Application (React 19 + TypeScript + Vite)

Giao diện người dùng (Client Layer) cho **Hệ thống Quản lý Tổ chức Sự kiện Câu lạc bộ (Project F)**, kết nối với Backend Spring Boot qua RESTful API và hỗ trợ tải tệp trực tiếp lên **Amazon S3** qua cơ chế **Pre-signed URL**.

---

## 📌 Công Nghệ Sử Dụng

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 8
- **Linter**: Oxlint (`.oxlintrc.json`)

---

## 📁 Cấu Trúc Thư Mục (`src/`)

```text
src/
├── assets/        # Hình ảnh tĩnh, biểu tượng, logo CLB
├── components/    # Các UI components dùng chung (Button, Modal, Table, FileUploader, Badge...)
├── constants/     # Các hằng số, Enum mapping (Department, EventStatus, ApprovalStatus, Severity...)
├── context/       # React Context quản lý trạng thái toàn cục (AuthContext, EventSeasonContext...)
├── hooks/         # Custom React Hooks (usePresignedUpload, useDebounce, useEventRole...)
├── pages/         # Các trang giao diện chính theo phân hệ nghiệp vụ
├── services/      # Tầng giao tiếp API (apiClient, s3UploadService, eventService, financeService...)
├── types/         # Định nghĩa TypeScript interfaces/types khớp với DTO Backend & Schema PostgreSQL
└── utils/         # Hàm tiện ích định dạng tiền tệ (VNĐ), ngày tháng, kiểm tra dung lượng file (15MB/50MB)
```

---

## 🖥️ Các Phân Hệ Màn Hình Chính (`src/pages`)

1. **Quản lý Thành viên & Sự kiện Đa mùa (Dev 1)**:
   - Danh sách & hồ sơ thành viên CLB (`club_members`), lọc theo ban chuyên môn (`HR`, `PLAN`, `MEDIA`, `ACADEMIC`).
   - Quản lý Chuỗi sự kiện (`event_series`), Mùa sự kiện (`events`) và Phân công nhân sự BTC (`event_organizers`).
2. **Tài chính, Ngân sách & Dự toán Thông minh (Dev 2)**:
   - Quản lý Danh mục kinh phí (`budget_categories`) & Bảng giá chuẩn thị trường (`item_price_benchmarks` - Master Catalog).
   - Lập và phê duyệt Dự trù kinh phí (`budget_items`), Theo dõi Thực chi & đính kèm Hóa đơn (`expenses`, `expense_receipts`).
   - **Dashboard Ngân sách Thời gian thực** (`v_event_budget_summary`) và công cụ **Dự toán Tự động Mùa mới** (`v_projected_budget_from_previous_season`).
3. **Tài liệu, Ấn phẩm & Tri thức Đa mùa (Dev 3)**:
   - Quản lý Tài liệu kế hoạch & lịch sử phiên bản (`event_documents`), Ấn phẩm truyền thông & trạng thái in ấn (`event_media_assets`).
   - Nhật ký sự cố & Post-Mortem (`event_incidents`), Kho FAQ đa mùa (`event_faqs`), và Biểu mẫu/Thống kê Khảo sát động (`event_feedbacks` với `custom_responses`).

---

## ☁️ Luồng Tải Tệp Lên Amazon S3 (Pre-signed URL Flow)

Khi người dùng tải lên ảnh hóa đơn (`<= 15MB`, định dạng `JPG/PNG/WEBP/PDF`) hoặc tài liệu kế hoạch (`<= 50MB`):
1. **Kiểm tra tại Client**: Validate kích thước tệp và định dạng MIME trước khi gửi yêu cầu.
2. **Xin quyền tải lên**: Gọi API Backend để nhận `presignedPutUrl` và `fileUrl`.
3. **Tải trực tiếp lên S3**: Dùng `fetch` / `axios.put(presignedPutUrl, file, { headers: { 'Content-Type': file.type } })` đẩy thẳng file nhị phân lên Amazon S3.
4. **Lưu Metadata**: Gửi `fileUrl` về Backend API để lưu bản ghi vào cơ sở dữ liệu.

---

## 🚀 Hướng Dẫn Khởi Chạy

```powershell
# Cài đặt dependencies
npm install

# Chạy môi trường phát triển (HMR)
npm run dev

# Kiểm tra lỗi lint & kiểu dữ liệu
npm run lint
npm run build
```
