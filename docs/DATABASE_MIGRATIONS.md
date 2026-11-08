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

## 5. Chạy xác thực ở môi trường local

1. Khởi động Docker. Tại thư mục gốc, chạy `npx supabase gen signing-key --algorithm ES256` một lần cho môi trường mới, rồi `npx supabase start`. Giữ `supabase/signing_keys.json` ở máy local. `npx supabase db reset --local` dựng lại schema và xóa dữ liệu của stack local.
2. Sao chép các file `.env.example` của backend và frontend thành `.env`. Dùng URL, cổng DB và publishable key từ `npx supabase status`. Backend cần kết nối bằng vai trò có quyền trên schema nghiệp vụ và quyền đọc `id`, `email`, `email_confirmed_at` của `auth.users` để kiểm tra lúc liên kết. Issuer phải khớp chính xác với claim `iss`, kể cả host và cổng.
3. Thêm hồ sơ CLB đang hoạt động và tạo tài khoản đã xác nhận email tương ứng trong Supabase Studio. Đăng nhập qua frontend để liên kết tài khoản. Thử cả `PRESIDENT`, `VICEPRESIDENT` và `MEMBER`, với ít nhất một mùa được phân công và một mùa ngoài phạm vi.
4. Dùng email inbox local của Supabase để mở liên kết đặt lại mật khẩu. Môi trường dev hosted cần khóa đăng ký tự do, signing key bất đối xứng và cấu hình SMTP/redirect URL cho `/reset-password`.

Migration liên kết Auth yêu cầu schema `auth` của Supabase. Trước khi chạy trên dữ liệu có sẵn, xử lý các hồ sơ trùng email hoặc MSSV khi so sánh không phân biệt hoa thường.

Để thành viên thường tải tệp, bật S3 Versioning và cho phép trình duyệt đọc header `x-amz-version-id` qua [CORS](aws/s3-cors-policy.json). Các URL cũ thiếu mã phiên bản cần được quản trị viên xác định đúng phiên bản rồi cập nhật bản ghi trước khi chia sẻ cho thành viên.
