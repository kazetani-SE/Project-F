# Chạy các feature Project F trên máy cá nhân

## 1. Database và migration

Backend hiện dùng `JPA_DDL_AUTO=validate`; nó không tự tạo hoặc sửa bảng. Trước khi chạy phiên bản có Auth/RBAC, review rồi áp dụng `supabase/migrations/20261027000000_auth_roles_and_access.sql` trên môi trường thử nghiệm. Migration này thêm `club_members.auth_user_id`, sửa vai trò BTC và chặn truy cập trực tiếp của `anon`/`authenticated` tới bảng nghiệp vụ. Nó cố ý dừng nếu `event_organizers` đã có dữ liệu để tránh đổi vai trò hiện hữu thành `MEMBER` mà không kiểm tra.

Project Supabase đang dùng chung chưa được Codex áp dụng migration. Sao lưu và kiểm tra với nhóm trước khi triển khai lên đó. Backend vẫn kết nối PostgreSQL bằng `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` riêng ở `backend/.env` hoặc IntelliJ Run Configuration.

## 2. Supabase Auth và tài khoản đầu tiên

1. Trong Supabase Dashboard, bật Email/Password trong **Authentication → Providers → Email**.
2. Tạo tài khoản đầu tiên trong **Authentication → Users** bằng email của trưởng CLB; xác nhận email theo luồng Supabase.
3. Tạo hồ sơ thành viên tương ứng trong `public.club_members` (một lần bằng SQL Editor hoặc DB tool), đặt `club_role = 'PRESIDENT'`, `is_active = true`, `student_id` đúng 8 ký tự, `batch` tối đa 4 ký tự. Email phải trùng chính xác tài khoản Auth. Không ghi mật khẩu vào bảng này. Lần đăng nhập đầu, backend tự liên kết `auth_user_id` theo email đã xác nhận.
4. Các thành viên tiếp theo được trưởng CLB tạo qua UI; mỗi người tạo tài khoản Auth với cùng email hồ sơ. Nếu khác email hoặc hồ sơ bị khóa, API trả `MEMBER_NOT_LINKED`.

## 3. Biến môi trường

Copy `backend/.env.example` thành `backend/.env` và điền kết nối PostgreSQL cùng `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `CORS_ALLOWED_ORIGINS`. Chạy backend với working directory là `backend`.

Copy `frontend/.env.example` thành `frontend/.env.local` và điền `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (publishable key), `VITE_API_URL=http://localhost:8080/api`. Chạy frontend bằng `npm ci` rồi `npm run dev`.

`DB_PASSWORD` chỉ nằm ở backend. Publishable key được phép ở frontend, nhưng không được đưa service role key hoặc database password vào biến `VITE_*`.

## 4. Amazon S3

Tạo bucket private trùng `AWS_S3_BUCKET`, bật Block Public Access. Backend dùng AWS default credential chain (local profile hoặc IAM role trên EC2), cấp quyền `s3:PutObject`/`s3:GetObject` cho các prefix `receipts/`, `documents/`, `media/`, `feedbacks/`. Cấu hình bucket CORS cho origin frontend và các phương thức `PUT`, `GET`, `HEAD`, cùng header `Content-Type`. Không cấu hình access key trong source hoặc `.env.example`.

Upload trên UI chỉ hoạt động sau khi bucket và AWS credentials đã sẵn sàng. File trong bucket vẫn private; UI tải xuống bằng URL ký ngắn hạn qua backend.

## 5. Kiểm tra

Project yêu cầu JDK 21. Nếu máy có nhiều JDK, trong IntelliJ đặt **Project SDK** và Maven Runner JRE là JDK 21; PMD của repo chưa phân tích được class file JDK 26.

```powershell
cd backend
.\mvnw.cmd verify
```

```powershell
cd frontend
npm ci
npm run build
npm run lint
```

Kiểm thử thao tác ghi dữ liệu và migration trên môi trường thử nghiệm riêng trước khi áp dụng cho project Supabase dùng chung. Bộ test hiện tại dùng H2 cho context/API và repository cơ bản; chưa xác nhận toàn bộ truy vấn và enum trên PostgreSQL thực tế.
