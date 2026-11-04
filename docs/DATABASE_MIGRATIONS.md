# Hướng Dẫn Quản Lý Database Migration (Supabase CLI)

Tài liệu này hướng dẫn quy trình quản lý lược đồ CSDL PostgreSQL của Project F thông qua **Supabase Migration chuẩn** (theo quyết định kiến trúc tại `docs/adr/0003-use-supabase-migrations-instead-of-flyway.md`).

---

## 1. Cấu Trúc Thư Mục

Toàn bộ migration được lưu trữ tại thư mục gốc:

```
Project-F/
└── supabase/
    ├── config.toml                              # Cấu hình Supabase CLI
    └── migrations/
        └── 20241025131200_init_schema.sql       # Lược đồ khởi tạo Phase 0
```

* **Quy ước đặt tên file:** `<YYYYMMDDHHmmss>_<ten_mo_ta>.sql` (14 chữ số timestamp theo giờ UTC).

---

## 2. Tạo Migration Mới

Khi cần thay đổi cấu trúc bảng, thêm cột, hoặc tạo view mới:

```powershell
npx supabase migration new <ten_migration>
```

**Ví dụ:**
```powershell
npx supabase migration new add_member_avatar
```
Lệnh sẽ tự động tạo một file SQL rỗng có timestamp chuẩn tại `supabase/migrations/`. Viết các câu lệnh DDL cần thực thi vào file đó.

---

## 3. Triển Khai Migration Lên Database

### A. Môi trường Dev (Supabase Cloud)

1. **Liên kết project (chỉ thực hiện 1 lần):**
   ```powershell
   npx supabase login
   npx supabase link --project-ref <supabase-project-ref>
   ```

2. **Đẩy migration lên database:**
   ```powershell
   npx supabase db push
   ```

*Hoặc đẩy trực tiếp qua Database URL mà không cần login:*
```powershell
npx supabase db push --remote="postgresql://postgres.<ref>:<password>@<pooler-host>:5432/postgres"
```

### B. Xử lý Database đã có sẵn Schema (Baseline / Repair)

Nếu database đã có sẵn các bảng từ trước (chạy thủ công qua SQL Editor) và `db push` báo lỗi bảng đã tồn tại:
Sử dụng lệnh `migration repair` để đánh dấu version là đã áp dụng mà không chạy lại SQL:

```powershell
npx supabase migration repair --status applied 20241025131200
```
Hoặc qua database URL:
```powershell
npx supabase migration repair --status applied 20241025131200 --remote="postgresql://postgres.<ref>:<password>@<pooler-host>:5432/postgres" --yes
```

---

## 4. Tương Thích Backend Spring Boot

* Backend Spring Boot giữ cấu hình:
  ```yaml
  spring:
    jpa:
      hibernate:
        ddl-auto: validate
  ```
* Ứng dụng chỉ kiểm tra tính tương thích giữa entity và database schema lúc khởi động, hoàn toàn độc lập với công cụ migration.
