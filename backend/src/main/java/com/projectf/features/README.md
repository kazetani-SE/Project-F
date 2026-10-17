# Kiến Trúc Package-by-Feature (Vertical Slice)

Hệ thống backend được thiết kế theo tư duy **Package-by-Feature** thay vì Package-by-Layer truyền thống.
Cách tiếp cận này giúp mã nguồn có độ kết dính cao (High Cohesion), độ phụ thuộc thấp (Low Coupling), dễ mở rộng và bảo trì khi dự án phát triển.

---

## 📁 Cấu Trúc Chuẩn Của Một Feature

Mỗi feature đại diện cho một miền nghiệp vụ độc lập (ví dụ: `auth`, `member`, `club`, `event`, `finance`...). Bên trong mỗi feature bao gồm đầy đủ các tầng liên quan:

```
features/
└── [feature_name]/              # Ví dụ: member, club, auth, event
    ├── controller/              # REST Controller xử lý HTTP requests & routing
    │   └── [Feature]Controller.java
    ├── service/                 # Tầng nghiệp vụ (Business Logic)
    │   ├── [Feature]Service.java          # Service interface
    │   └── [Feature]ServiceImpl.java      # Triển khai logic nghiệp vụ
    ├── repository/              # Tầng truy xuất dữ liệu (Spring Data JPA)
    │   └── [Feature]Repository.java
    ├── entity/                  # JPA Entity ánh xạ bảng PostgreSQL trong Supabase
    │   └── [Feature].java
    ├── dto/                     # Data Transfer Objects
    │   ├── request/             # Request payload kèm validation (@NotNull, @NotBlank...)
    │   │   ├── Create[Feature]Request.java
    │   │   └── Update[Feature]Request.java
    │   └── response/            # Response trả về cho Frontend
    │       └── [Feature]Response.java
    └── mapper/                  # Chuyển đổi giữa Entity và DTO (MapStruct hoặc tay)
        └── [Feature]Mapper.java
```

---

## 🎯 Nguyên Tắc Thiết Kế

1. **Khép kín (Self-Contained):** Toàn bộ file liên quan đến một tính năng nằm gọn trong thư mục của tính năng đó.
2. **Độc lập:** Hạn chế feature này phụ thuộc trực tiếp vào repository/entity của feature khác. Nếu cần chia sẻ dữ liệu hoặc gọi chéo, sử dụng Service interface hoặc Event publisher/listener.
3. **Thành phần dùng chung:** Các cấu hình chung, exception toàn cục, response wrapper, helper utilities đặt trong package `com.projectf.common`.
