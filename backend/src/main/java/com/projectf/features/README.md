# Kiến Trúc Package-by-Feature (Vertical Slice)

Hệ thống backend được thiết kế theo tư duy **Package-by-Feature** thay vì Package-by-Layer truyền thống.
Cách tiếp cận này giúp mã nguồn có độ kết dính cao (High Cohesion), độ phụ thuộc thấp (Low Coupling), dễ dàng phân chia công việc cho nhóm 3 thành viên và mở rộng khi dự án phát triển.

---

## 📁 Cấu Trúc Chuẩn Của Một Feature

Mỗi feature đại diện cho một miền nghiệp vụ độc lập. Bên trong mỗi feature bao gồm đầy đủ các tầng liên quan (`Controller -> Service -> Repository -> Entity/DTO/Mapper`):

```text
features/
└── [feature_name]/              # Ví dụ: member, event, finance, storage, document, media, knowledge
    ├── controller/              # REST Controller xử lý HTTP requests, routing & @PreAuthorize RBAC
    │   └── [Feature]Controller.java
    ├── service/                 # Tầng nghiệp vụ (Business Logic & Transaction Management)
    │   ├── [Feature]Service.java          # Service interface
    │   └── [Feature]ServiceImpl.java      # Triển khai logic nghiệp vụ
    ├── repository/              # Tầng truy xuất dữ liệu (Spring Data JPA)
    │   └── [Feature]Repository.java
    ├── entity/                  # JPA Entity ánh xạ bảng/view PostgreSQL 15+ (Amazon RDS)
    │   └── [Feature].java
    ├── dto/                     # Data Transfer Objects
    │   ├── request/             # Request payload kèm Jakarta Validation (@NotNull, @NotBlank, @Positive...)
    │   │   ├── Create[Feature]Request.java
    │   │   └── Update[Feature]Request.java
    │   └── response/            # Response trả về cho Frontend
    │       └── [Feature]Response.java
    └── mapper/                  # Chuyển đổi giữa Entity và DTO
        └── [Feature]Mapper.java
```

---

## 🗂️ Quy Hoạch Các Feature Theo Bản Đặc Tả Kỹ Thuật

| Feature Package | Các Bảng / Views PostgreSQL Ánh Xạ | Thành Viên Phụ Trách |
| :--- | :--- | :--- |
| **`member`** | `club_members` (`department_enum`, `club_role_enum`) | Dev 1 (Tech Lead & Cloud Infra) |
| **`event`** | `event_series`, `events` (`event_status_enum`), `event_organizers` (`event_role_enum`) | Dev 1 (Tech Lead & Cloud Infra) |
| **`finance`** | `budget_categories`, `item_price_benchmarks`, `budget_items`, `expenses`, `expense_receipts`, `v_event_budget_summary`, `v_projected_budget_from_previous_season` | Dev 2 (Finance & Analytics) |
| **`storage`** | Tích hợp AWS SDK v2 S3 (Sinh Pre-signed PUT/GET URL, kiểm tra MIME & giới hạn 15MB/50MB) | Dev 3 (Storage, Media & Knowledge) |
| **`document`** | `event_documents` (Quản lý phiên bản qua `parent_document_id`, luồng duyệt `approval_status_enum`) | Dev 3 (Storage, Media & Knowledge) |
| **`media`** | `event_media_assets` (Quản lý ấn phẩm thiết kế, trạng thái in ấn `is_printed` & phê duyệt) | Dev 3 (Storage, Media & Knowledge) |
| **`knowledge`** | `event_incidents` (`incident_severity_enum`, `department_enum[]`), `event_faqs`, `event_feedbacks` (`JSONB custom_responses`) | Dev 3 (Storage, Media & Knowledge) |

---

## 🎯 Nguyên Tắc Thiết Kế & Lưu Ý Kỹ Thuật

1. **Khép kín (Self-Contained)**: Toàn bộ file liên quan đến một tính năng nằm gọn trong thư mục của tính năng đó.
2. **Độc lập (Low Coupling)**: Hạn chế feature này gọi trực tiếp vào `Repository` của feature khác. Khi cần kiểm tra dữ liệu chéo (ví dụ: kiểm tra quyền BTC trong `event_organizers` hoặc kiểm tra sự kiện tồn tại), hãy gọi qua `Service` interface hoặc component kiểm quyền chung.
3. **Thành phần dùng chung (`com.projectf.common`)**:
   - Cấu hình AWS S3, Security, CORS đặt tại `common.config`.
   - Xử lý lỗi tập trung (`@RestControllerAdvice`) đặt tại `common.exception`.
   - Cấu trúc phản hồi chuẩn (`ApiResponse<T>`) đặt tại `common.response`.
4. **Ánh xạ CSDL PostgreSQL 15+**:
   - Các cột tính toán tự động (`total_estimated_amount`, `total_amount`) phải được đánh dấu `@Column(..., insertable = false, updatable = false)`.
   - Các SQL Views (`v_event_budget_summary`, `v_projected_budget_from_previous_season`) ánh xạ thành Read-only Entity với `@Immutable` (Hibernate) và `@Table(name = "v_...")`.
   - Cột mảng `department_enum[]` (`event_incidents`) và cột `JSONB` (`event_feedbacks.custom_responses`) sử dụng `@JdbcTypeCode(SqlTypes.ARRAY)` và `@JdbcTypeCode(SqlTypes.JSON)` của Hibernate 6.
