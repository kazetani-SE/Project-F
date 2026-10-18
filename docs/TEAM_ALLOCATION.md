# Danh Sách Tính Năng & Phân Chia Công Việc (Team 3 Người)

Dự án được chia thành **5 phân hệ tính năng cốt lõi** và phân bổ cho **3 thành viên** theo mô hình **Vertical Slices (Package-by-Feature)** để đảm bảo mỗi thành viên làm chủ trọn vẹn luồng nghiệp vụ từ Database -> Backend API -> Frontend UI.

---

## 1. Danh Sách Các Phân Hệ Tính Năng Cốt Lõi

1. **Phân hệ Quản trị Thành viên & Phân quyền (Core IAM & RBAC)**:
   - Quản lý hồ sơ thành viên (`club_members`), phân loại ban chuyên môn (`department_enum`), chức vụ CLB (`club_role_enum`) và kiểm soát quyền hạn theo từng sự kiện (`event_organizers`).
2. **Phân hệ Quản lý Sự kiện Đa mùa & Nhân sự BTC**:
   - Quản lý chuỗi sự kiện (`event_series`), mùa sự kiện (`events`), kiểm soát thời gian dự kiến/thực tế, quỹ cấp phát (`allocated_fund`) và phân công BTC (`event_organizers`).
3. **Phân hệ Tài liệu, Ấn phẩm & Tích hợp Amazon S3**:
   - Dịch vụ sinh Pre-signed URL với Amazon S3, quản lý tài liệu & phiên bản (`event_documents`), quản lý ấn phẩm truyền thông & trạng thái in ấn (`event_media_assets`).
4. **Phân hệ Tài chính, Ngân sách & Dự toán Thông minh**:
   - Quản lý danh mục chi (`budget_categories`), bảng giá chuẩn thị trường (`item_price_benchmarks`), lập/duyệt dự trù (`budget_items`), quản lý thực chi & hóa đơn (`expenses`, `expense_receipts`), Dashboard ngân sách thời gian thực (`v_event_budget_summary`) và tự động dự toán mùa mới (`v_projected_budget_from_previous_season`).
5. **Phân hệ Quản trị Tri thức Đa mùa (Knowledge Base & Post-Mortem)**:
   - Nhật ký sự cố & bài học kinh nghiệm (`event_incidents`), kho FAQ đa mùa (`event_faqs`) và thu thập/thống kê khảo sát động với `JSONB` (`event_feedbacks`).

---

## 2. Bảng Phân Công Nhiệm Vụ Cho 3 Thành Viên (Vertical Slices)

| Thành viên | Vai trò & Trọng tâm Kỹ thuật | Các Bảng / Views Phụ trách | Packages dự kiến (`com.projectf.features.*`) | Chi tiết Công việc (Tasks) |
| :--- | :--- | :--- | :--- | :--- |
| **Thành viên 1**<br/>*(Dev 1 - Tech Lead & Cloud Infra)* | Hạ tầng AWS, Core Backend, Nhân sự CLB & Sự kiện Đa mùa | - `club_members`<br/>- `event_series`<br/>- `events`<br/>- `event_organizers` | - `common.config`<br/>- `common.security`<br/>- `features.member`<br/>- `features.event` | - Thiết lập hạ tầng AWS (VPC, EC2, RDS PostgreSQL, IAM, CloudWatch).<br/>- Khởi tạo dự án Spring Boot, cấu hình Flyway Migration (`V1__init_schema.sql`), Spring Security & RBAC.<br/>- Xây dựng CRUD & bộ lọc cho Thành viên CLB, Chuỗi sự kiện, Mùa sự kiện và Phân công BTC. |
| **Thành viên 2**<br/>*(Dev 2 - Finance & Analytics)* | Quản trị Tài chính, Luồng Duyệt chi & Dự toán Thông minh | - `budget_categories`<br/>- `item_price_benchmarks`<br/>- `budget_items`<br/>- `expenses`<br/>- `expense_receipts`<br/>- `v_event_budget_summary`<br/>- `v_projected_budget_from_previous_season` | - `features.finance`<br/>*(hoặc tách `budget`, `expense`, `benchmark`)* | - Xây dựng CRUD Danh mục kinh phí & Bảng giá thị trường (Master Catalog).<br/>- Xây dựng luồng lập và phê duyệt Dự trù kinh phí (`budget_items`).<br/>- Xây dựng chức năng Thực chi & Hóa đơn (`expenses`, `expense_receipts`), kiểm tra bắt buộc đính kèm hóa đơn trước khi duyệt (`APPROVED`).<br/>- Ánh xạ 2 SQL Views để làm Dashboard ngân sách thời gian thực và API kế thừa dự toán tự động sang mùa sự kiện mới. |
| **Thành viên 3**<br/>*(Dev 3 - Storage, Media & Knowledge)* | Tích hợp Amazon S3, Tài liệu/Ấn phẩm & Tri thức Đa mùa | - `event_documents`<br/>- `event_media_assets`<br/>- `event_incidents`<br/>- `event_faqs`<br/>- `event_feedbacks` | - `features.storage`<br/>- `features.document`<br/>- `features.media`<br/>- `features.knowledge` | - Tích hợp AWS SDK cho Amazon S3 (sinh Pre-signed URL tải lên/tải xuống, kiểm tra dung lượng 15MB/50MB và định dạng tệp).<br/>- Xây dựng module Tài liệu kế hoạch (hỗ trợ quản lý phiên bản qua `parent_document_id`) và Ấn phẩm truyền thông.<br/>- Xây dựng module Nhật ký sự cố (ánh xạ mảng `department_enum[]`), Kho FAQ đa mùa (`is_pinned`) và Khảo sát sự kiện (ánh xạ cột `custom_responses` kiểu `JSONB`). |
