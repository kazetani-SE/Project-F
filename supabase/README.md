# Bảo vệ dữ liệu nghiệp vụ trên Supabase

Frontend dùng Supabase Auth để đăng nhập và gửi access token tới Spring Boot. Các bảng/view nghiệp vụ chỉ được backend truy cập qua JDBC. `anon` và `authenticated` không được đọc hoặc ghi những đối tượng này qua Supabase Data API.

## Auth local cho Member/Event

Backend xác minh JWT qua JWKS nên Supabase local cần khóa ký bất đối xứng. Trước lần `supabase start` đầu tiên, tạo `supabase/signing_keys.json` bằng `npx supabase gen signing-key > supabase/signing_keys.json`. File chứa khóa **riêng tư**, đã được Git ignore; mỗi máy tự tạo và không đưa vào commit. Nếu đã có file và đã dùng Auth local, giữ nguyên để các phiên hiện tại không bị vô hiệu hóa. Cấu hình redirect `/reset-password` và tắt tự đăng ký nằm trong `config.toml`.

### Gửi email đặt lại mật khẩu khi chạy local

`config.toml` đang dùng Gmail SMTP cho Supabase Auth local; Mailpit (`localhost:54324`) đã tắt. Mỗi thành viên cần cấu hình trên máy của mình:

1. Sao chép `backend/.env.example` thành `backend/.env` nếu chưa có. File `backend/.env` đã được Git ignore.
2. Với tài khoản gửi `projectfclub.mail@gmail.com`, bật xác minh 2 bước và tạo **App Password** tại [Google App Passwords](https://myaccount.google.com/apppasswords). Người quản lý tài khoản gửi cần cấp thông tin này cho thành viên qua kênh bảo mật. Điền vào `PROJECTF_SMTP_APP_PASSWORD=` trong `backend/.env`; không dùng mật khẩu đăng nhập Gmail và không đưa App Password vào Git, frontend hoặc chat.
3. Sau khi thay cấu hình SMTP, chạy `npx supabase stop` để giữ dữ liệu local, rồi chạy `.\supabase\start-local.ps1` từ thư mục root. Những lần sau dùng script này để khởi động Supabase local vì Supabase CLI không tự đọc `backend/.env`.
4. Chạy frontend, dùng trang **Quên mật khẩu** với email đã tồn tại trong Supabase Auth local. Kiểm tra Inbox/Spam; liên kết trong thư mở `http://localhost:5173/reset-password` trên **chính máy đang chạy ứng dụng**. Email gửi cho người ở máy khác vẫn chứa `localhost`, nên họ không mở được link local của bạn.

Cấu hình SMTP trên Supabase Dashboard cloud độc lập với Supabase local. Các biến `SPRING_MAIL_*` trong `backend/.env` phục vụ email do Spring Boot gửi, không điều khiển email reset của Supabase Auth.

Để chạy test migration trên PostgreSQL riêng khi Testcontainers không kết nối được Docker Desktop, đặt `PROJECTF_MIGRATION_TEST_POSTGRES_URL`, `PROJECTF_MIGRATION_TEST_POSTGRES_USER`, `PROJECTF_MIGRATION_TEST_POSTGRES_PASSWORD` trỏ tới **database trống dùng một lần** rồi chạy `mvn -Dtest=SupabaseMigrationTest test`. Test PostgreSQL nghiệp vụ dùng bộ biến tương tự với tiền tố `PROJECTF_TEST_POSTGRES_` và cũng cần database trống riêng.

## Migration cần áp

`migrations/20261115102553_restrict_business_data_api_access.sql` thu hồi quyền trực tiếp trên 15 bảng và 2 view; bật RLS cho bảng; đặt view chạy với quyền người gọi; và ngăn tự động cấp quyền trên các đối tượng mới do `postgres` tạo. Migration không thay đổi dữ liệu nghiệp vụ. Nó lặp lại phần bảo vệ 4 bảng Member/Event để hoạt động cả khi migration Auth cũ chưa được áp lên project chung.

`migrations/20261115103300_add_least_privilege_backend_role.sql` tạo role `projectf_app` chưa cho đăng nhập, cấp đúng quyền đọc/ghi nghiệp vụ và policy RLS cho role này. Role này không có `BYPASSRLS`. Chưa có mật khẩu nào được lưu trong repo.

**Trình tự:**

1. Kiểm tra migration trước đó và backup; áp các migration còn thiếu theo thứ tự timestamp trên database thử nghiệm. Không dùng `mvn` hoặc Hibernate để tự áp DDL.
2. Chạy `snippets/audit_business_data_access.sql` trước và sau **cả hai** migration. Truy vấn đầu phải trả **0 dòng** sau khi áp; truy vấn cuối phải cho thấy `projectf_app` có `rolbypassrls = false`.
3. Thử đăng nhập Supabase Auth, gọi REST `/rest/v1/events` bằng publishable key và access token: request phải bị từ chối. Thử API Spring Boot tương ứng với cùng token: request hợp lệ vẫn chạy.
4. Chỉ sau khi thử đủ các feature trên môi trường riêng, nhóm mới áp migration vào project chung bằng quy trình Supabase Migration. Không chạy thử tạo/sửa dữ liệu nghiệp vụ trên project chung.

Trước khi chuyển backend sang `projectf_app`, quản trị viên đặt mật khẩu bằng `\password projectf_app` trong phiên `psql` an toàn, sau đó chạy `ALTER ROLE projectf_app LOGIN;`. Đặt `DB_USERNAME=projectf_app` cho kết nối trực tiếp; nếu dùng Supabase shared pooler, tên đăng nhập có dạng `projectf_app.<project-ref>` theo trang **Connect** của project. Đặt `DB_PASSWORD` qua secret manager hoặc biến môi trường riêng và thử kết nối/JPA trước khi chuyển môi trường thật. Cấu hình mẫu local vẫn có thể dùng `postgres` để phát triển, nhưng môi trường triển khai nên dùng role giới hạn này. RLS không thay thế kiểm tra JWT/RBAC ở Spring Boot; PostgreSQL owner hoặc role `BYPASSRLS` có thể vượt RLS.

Chỉ các Supabase key công khai phục vụ Auth được đưa vào Vite. `DB_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY` và AWS credentials chỉ ở backend. Function mới cần `GRANT EXECUTE` rõ ràng nếu Auth hoặc policy cần gọi nó. Khi thêm bảng/view mới trong `public`, phải cập nhật migration bảo vệ và script audit này. Nên tắt **Automatically expose new tables** trong Data API settings của project sau khi đã xác nhận frontend không gọi Data API trực tiếp; đây là cấu hình Dashboard, không được đồng bộ chỉ bằng file SQL.
