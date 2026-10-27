# Project F — Backend Service (Spring Boot 3 + PostgreSQL + AWS)

> Hướng dẫn cấu hình Supabase Auth/RBAC: [docs/LOCAL_FEATURE_SETUP.md](../docs/LOCAL_FEATURE_SETUP.md). File `src/main/resources/application.yml` và `.env.example` là nguồn cấu hình hiện hành.

Dịch vụ Backend RESTful API cho **Hệ thống Quản lý Tổ chức Sự kiện Câu lạc bộ (Project F)**, được thiết kế theo kiến trúc **Package-by-Feature (Vertical Slice)** và triển khai trên hạ tầng **AWS (EC2, RDS PostgreSQL 15+, S3, CloudWatch)**.

---

## 📌 Công Nghệ Sử Dụng

- **Ngôn ngữ**: Java 21 (LTS)
- **Framework**: Spring Boot 3.3.4 (`spring-boot-starter-web`, `spring-boot-starter-data-jpa`, `spring-boot-starter-validation`, `spring-boot-starter-security`)
- **Cơ sở dữ liệu**: PostgreSQL 15+ (Amazon RDS for PostgreSQL trên Production / PostgreSQL Local hoặc Cloud ở môi trường Dev)
- **Database Migration**: SQL trong `supabase/migrations/`; backend chạy `JPA_DDL_AUTO=validate`
- **Lưu trữ đối tượng**: AWS SDK for Java v2 — Amazon S3 (Pre-signed PUT/GET URL)
- **Build Tool**: Apache Maven (kèm sẵn Maven Wrapper `mvnw`, `mvnw.cmd`)

---

## 📁 Cấu Trúc Package (`com.projectf`)

```text
com.projectf
├── common/                        # Các thành phần dùng chung toàn hệ thống
│   ├── config/                    # Cấu hình Spring Security, CORS, AWS S3 Client, OpenAPI...
│   ├── exception/                 # GlobalExceptionHandler, Custom Business Exceptions
│   ├── response/                  # Chuẩn hóa cấu trúc trả về (ApiResponse<T>, PageResponse<T>)
│   └── utils/                     # Các hàm tiện ích dùng chung
└── features/                      # Các phân hệ nghiệp vụ độc lập (Vertical Slices)
    ├── member/                    # Quản lý thành viên CLB (club_members)
    ├── event/                     # Chuỗi sự kiện, mùa sự kiện & phân công BTC (event_series, events, event_organizers)
    ├── finance/                   # Danh mục chi, bảng giá chuẩn, dự trù, thực chi, hóa đơn & 2 Views dự toán
    ├── storage/                   # Dịch vụ sinh S3 Pre-signed URL & kiểm tra định dạng/dung lượng tệp (15MB/50MB)
    └── knowledge/                 # Tài liệu, ấn phẩm, sự cố, FAQ và feedback JSONB (5 bảng)
```

> Xem chi tiết quy ước tổ chức từng feature tại: [`src/main/java/com/projectf/features/README.md`](./src/main/java/com/projectf/features/README.md).

---

## ⚙️ Cấu Hình Môi Trường (`application.yml`)

Copy `.env.example` thành `.env` trong thư mục `backend/`, điền PostgreSQL, Supabase Auth và S3. Chạy với working directory là `backend/`. Hibernate dùng `JPA_DDL_AUTO=validate`; nó không tự tạo bảng. Xem [hướng dẫn chạy local](../docs/LOCAL_FEATURE_SETUP.md) trước khi áp dụng migration trên database thử nghiệm.

---

## 🛡️ Quy Tắc Nghiệp Vụ & Ràng Buộc Quan Trọng

1. **Quản lý Tệp Đính Kèm (Amazon S3)**:
   - Không lưu trữ dữ liệu nhị phân (`BYTEA`) trong PostgreSQL.
   - Hóa đơn (`expense_receipts`): Tối đa **15MB**, định dạng `JPG`, `PNG`, `WEBP`, `PDF`.
   - Tài liệu kế hoạch (`event_documents`): Tối đa **50MB**.
2. **Ràng Buộc Duyệt Chi (`expenses`)**:
   - Bắt buộc đính kèm ít nhất 1 chứng từ hợp lệ trong bảng `expense_receipts` trước khi chuyển trạng thái khoản chi sang `APPROVED`.
3. **Ràng Buộc Báo Cáo Sự Cố (`event_incidents`)**:
   - Bắt buộc điền đầy đủ (`@NotBlank`) cả 4 trường: `incident_description`, `root_cause`, `immediate_solution`, và `lesson_learned`.
4. **Kiểu Dữ Liệu PostgreSQL Nâng Cao**:
   - Các cột `total_estimated_amount` (`budget_items`) và `total_amount` (`expenses`) là cột `GENERATED ALWAYS AS (...) STORED` trong PostgreSQL — trong JPA Entity cần cấu hình `insertable = false, updatable = false`.
   - Ánh xạ 2 SQL Views (`v_event_budget_summary` và `v_projected_budget_from_previous_season`) bằng các Entity chỉ đọc (`@Immutable`).

---

## 🚀 Khởi Chạy Dự Án

Sử dụng Maven Wrapper có sẵn trong thư mục `backend/`:

- **Windows (PowerShell / CMD)**:
  ```powershell
  .\mvnw.cmd spring-boot:run
  ```
- **Linux / macOS**:
  ```bash
  ./mvnw spring-boot:run
  ```
- **Chạy kiểm thử (Unit / Integration Tests)**:
  ```powershell
  .\mvnw.cmd test
  ```
