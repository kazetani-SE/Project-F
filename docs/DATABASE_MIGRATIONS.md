# Database migrations (Supabase dev và RDS production)

Nguồn SQL duy nhất là `backend/src/main/resources/db/migration/V1__init_schema.sql` và các file `V2__*.sql`, `V3__*.sql` tiếp theo trong cùng thư mục. Giữ nguyên V1 đã áp dụng. Mỗi thay đổi schema đi cùng PR, được kiểm thử trên PostgreSQL riêng và được người phụ trách triển khai theo thứ tự dev → production. Spring Boot chỉ kiểm tra schema bằng `JPA_DDL_AUTO=validate`; ứng dụng không tự chạy migration.

## Chạy công cụ

Trên máy có Java 21, Maven và quyền kết nối PostgreSQL, đặt `DB_URL` (JDBC URL), `DB_USERNAME`, `DB_PASSWORD` trong môi trường; không commit credentials. Chạy trong thư mục `migration` (module độc lập với backend):

```powershell
mvn -q -DskipTests compile exec:java '-Dexec.args=validate'
mvn -q -DskipTests compile exec:java '-Dexec.args=migrate'
```

`migrate` tạo bảng `migration_meta.schema_migration_history` ngoài schema API công khai, chạy các file chưa áp dụng theo version và ghi SHA-256 của nội dung. Chạy lại là an toàn; file đã áp dụng bị chỉnh sửa, đổi tên hoặc bị xóa sẽ báo lỗi. Mỗi lần chạy giữ advisory lock và transaction để ngăn hai tiến trình triển khai đồng thời. File migration phải là SQL PostgreSQL có thể chạy trong transaction; không dùng `CREATE INDEX CONCURRENTLY` hoặc transaction control trong file.

## Supabase dev đã có schema từ V1

Trước khi baseline, so sánh bảng, enum, view, cột, constraints, indexes trong Supabase với V1; ghi lại và xử lý mọi khác biệt. Sao lưu database. Chỉ khi xác nhận V1 tương ứng với schema hiện tại, chạy **một lần**:

```powershell
$env:BASELINE_SCHEMA_VERIFIED = 'true'
$env:BASELINE_REQUIRED_RELATIONS = 'public.club_members,public.events'
mvn -q -DskipTests compile exec:java '-Dexec.args=baseline'
Remove-Item Env:BASELINE_SCHEMA_VERIFIED
Remove-Item Env:BASELINE_REQUIRED_RELATIONS
```

`baseline` ghi V1 vào lịch sử mà không chạy lại SQL. Biến xác nhận là trách nhiệm của người vận hành, không phải phép đối chiếu tự động. Sau đó chạy `validate`, kiểm tra lịch sử và mới chạy `migrate` để áp dụng V2 trở đi. Không baseline một database trống.

## Database mới và RDS production

Runner tìm thư mục SQL từ thư mục làm việc hiện tại lên các thư mục cha, nên hỗ trợ chạy từ root repo hoặc module. Với thư mục SQL ngoài repo/bản đóng gói, truyền `'-Dexec.args=migrate --directory <absolute-path>'`. Từ root repo có thể chạy `mvn -f migration/pom.xml -q -DskipTests compile exec:java '-Dexec.args=validate'`.

Checksum SHA-256 chuẩn hóa CRLF và CR thành LF trước khi hash UTF-8. Không bỏ khoảng trắng hay sửa SQL. Nếu đã ghi lịch sử bằng runner cũ dùng raw bytes, cần so sánh nội dung và checksum cũ với file gốc trước khi chuyển đổi lịch sử; runner không tự ghi đè checksum. Đừng baseline lại database đã có lịch sử hoặc xóa history để bỏ qua lỗi checksum.

`BASELINE_REQUIRED_RELATIONS` là danh sách bảng/view phân cách bằng dấu phẩy, có schema qualification. Giá trị ví dụ ở trên là lựa chọn cho Project-F; chỉnh danh sách theo schema cần xác nhận. Công cụ dùng tham số JDBC cho tên relation và chỉ kiểm tra tồn tại, không tự so sánh cột/constraints.

Trên PostgreSQL trống, chạy `migrate` từ V1. RDS private cần chạy lệnh từ máy/CI runner trong VPC có quyền kết nối; không mở RDS ra Internet. Sau khi kiểm tra schema và backup, chạy `validate`. Production triển khai migration trước phiên bản backend yêu cầu schema mới. Không chạy trực tiếp SQL Editor để sửa database chung vì lịch sử/checksum sẽ không ghi nhận thay đổi đó.

Để thêm migration, tạo `V<version>__<description>.sql` với version tăng tiếp theo, ví dụ `V2__add_event_registration.sql`. Nếu hai nhánh trùng version, đổi version file chưa áp dụng trước khi merge. Trước PR, dựng một PostgreSQL trống bằng `migrate`, chạy lại `migrate` và `validate`, rồi thử thay đổi trên bản sao dev hoặc staging có dữ liệu. Chỉ chạy trên Supabase dev/RDS production sau review.
