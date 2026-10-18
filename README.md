# Project F — Hệ Thống Quản Lý Tổ Chức Sự Kiện Câu Lạc Bộ

**Project F** là nền tảng quản trị tri thức đa mùa và hỗ trợ tiền kỳ tổ chức sự kiện dành cho các Câu lạc bộ (CLB) sinh viên và tổ chức quy mô vừa/nhỏ, được phát triển theo định hướng **Spec-Driven Development** và triển khai trên hạ tầng đám mây **Amazon Web Services (AWS)**.

---

## 🎯 Mục Tiêu & Phạm Vi (Scope & Objectives)

### Tập trung cốt lõi
1. **Tài chính & Ngân sách (Budgeting & Expense Tracking)**:
   - Quản lý dự trù kinh phí (`budget_items`), theo dõi thực chi (`expenses`), lưu trữ hóa đơn/chứng từ (`expense_receipts`).
   - Kiểm vết phê duyệt (Audit Trail: `DRAFT` -> `PENDING` -> `APPROVED` / `REJECTED`) và tính toán ngân sách hiện còn theo thời gian thực qua View `v_event_budget_summary`.
2. **Dự toán kinh phí thông minh (Smart Price Benchmark Estimation)**:
   - Kế thừa định mức vật tư/hạng mục thực tế từ mùa trước thông qua danh mục chuẩn (`item_price_benchmarks` - Master Catalog) và tự động áp dụng đơn giá thị trường tại thời điểm hiện tại (`v_projected_budget_from_previous_season`).
3. **Nhân sự & Phân công (Core IAM & Event Organizers)**:
   - Quản lý nhân sự CLB (`club_members`), phân loại ban chuyên môn (`HR`, `PLAN`, `MEDIA`, `ACADEMIC`) và phân công nhân sự Ban Tổ Chức theo từng mùa sự kiện (`event_organizers`).
4. **Tài liệu & Ấn phẩm truyền thông (Documents & Media Assets)**:
   - Quản lý vòng đời và lịch sử phiên bản tài liệu kế hoạch (`event_documents` với `parent_document_id`), thiết kế truyền thông (`event_media_assets`) tích hợp lưu trữ trực tiếp qua **Amazon S3 Pre-signed URL**.
5. **Quản trị Tri thức đa mùa (Multi-Season Knowledge Base & Post-Mortem)**:
   - Lưu trữ FAQ tích lũy theo chuỗi sự kiện (`event_faqs`), khảo sát/feedback động sử dụng `JSONB` (`event_feedbacks`), nhật ký sự cố và bài học kinh nghiệm (`event_incidents`).

### Không bao gồm (Non-Goals)
- Check-in QR thời gian thực, bán vé công khai, hoặc quét thẻ tại bàn đón tiếp.

---

## 🏗️ Kiến Trúc Kỹ Thuật & Hạ Tầng AWS

| Tầng (Layer) | Công nghệ / Dịch vụ sử dụng |
| :--- | :--- |
| **Frontend (Client)** | React 19, TypeScript, Vite |
| **Backend (Server)** | Java 21 (LTS), Spring Boot 3.3.4, Spring Data JPA / Hibernate, Spring Security, Jakarta Validation |
| **Database & Migration** | PostgreSQL 15+ (Amazon RDS), Flyway Migration |
| **Cloud Infrastructure (AWS)** | Amazon VPC (Public/Private Subnets), Amazon EC2 (kèm Nginx Reverse Proxy & IAM Instance Profile), Amazon RDS for PostgreSQL, Amazon S3 (Pre-signed URL Upload/Download), Amazon CloudWatch & AWS CloudTrail |

---

## 📂 Cấu Trúc Thư Mục Dự Án

```text
Project-F/
├── README.md                          # Tổng quan dự án và hướng dẫn chung
├── docs/
│   ├── SYSTEM_SPECIFICATION.md        # Bản đặc tả kỹ thuật chi tiết & Lược đồ CSDL (PostgreSQL 15+)
│   ├── ARCHITECTURE_AND_AWS.md        # Kiến trúc hệ thống, luồng S3 Pre-signed URL & Hạ tầng AWS
│   └── TEAM_ALLOCATION.md             # Phân chia nhiệm vụ theo Vertical Slices (Team 3 người)
├── backend/                           # Mã nguồn Backend (Java 21 + Spring Boot 3)
│   ├── README.md                      # Hướng dẫn cài đặt, cấu hình và chạy Backend
│   └── src/main/java/com/projectf/
│       ├── common/                    # Cấu hình chung, Security, S3, Exception, Response Wrapper
│       └── features/                  # Các phân hệ nghiệp vụ theo kiến trúc Package-by-Feature
└── frontend/                          # Mã nguồn Frontend (React + TypeScript + Vite)
    ├── README.md                      # Hướng dẫn cài đặt và cấu trúc Frontend
    └── src/                           # Các tầng giao diện (pages, components, services, types...)
```

---

## 📚 Tài Liệu Chi Tiết (Documentation)

1. **[Bản Đặc Tả Kỹ Thuật (System Specification)](./docs/SYSTEM_SPECIFICATION.md)**:
   - Quy tắc nghiệp vụ, Lược đồ CSDL PostgreSQL 15+ (Enums, 13 Tables, Indexes, 2 Views), Quy chuẩn Validation và Ma trận phân quyền RBAC.
2. **[Kiến Trúc Kỹ Thuật & Hạ Tầng AWS](./docs/ARCHITECTURE_AND_AWS.md)**:
   - Kiến trúc Client-Server, thiết kế mạng VPC (Public/Private Subnet), bảo mật Security Group, IAM Role, và luồng tải tệp qua Amazon S3 Pre-signed URL.
3. **[Phân Chia Công Việc Team 3 Người](./docs/TEAM_ALLOCATION.md)**:
   - Bảng phân công nhiệm vụ chi tiết theo Vertical Slices cho 3 thành viên (Dev 1, Dev 2, Dev 3).
4. **[Tài Liệu Backend (`backend/README.md`)](./backend/README.md)** & **[Cấu trúc Feature (`features/README.md`)](./backend/src/main/java/com/projectf/features/README.md)**.
5. **[Tài Liệu Frontend (`frontend/README.md`)](./frontend/README.md)**.

---

## 🚀 Hướng Dẫn Khởi Chạy Nhanh (Quick Start)

### 1. Khởi chạy Backend
```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

### 2. Khởi chạy Frontend
```powershell
cd frontend
npm install
npm run dev
```

---

## 📄 Giấy Phép (License)
Dự án được phân phối dưới giấy phép [MIT License](./LICENSE).
