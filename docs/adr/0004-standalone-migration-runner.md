# ADR-0004: Runner PostgreSQL độc lập cho Supabase dev và RDS production

## Trạng thái

Chấp nhận. Thay thế phần quy trình triển khai migration của ADR-0003; không sửa lịch sử quyết định trong ADR đó.

## Bối cảnh

ADR-0003 chọn Supabase Migration để tách DDL khỏi lúc Spring Boot khởi động. Production dùng RDS PostgreSQL, còn dev dùng Supabase. Team cần giữ nguyên tên và vị trí `backend/src/main/resources/db/migration/V1__init_schema.sql` và dùng cùng bộ SQL trên hai môi trường.

## Quyết định

Dùng Java/JDBC runner trong module Maven `migration/` độc lập với backend, theo quy trình `docs/DATABASE_MIGRATIONS.md`. Runner lưu version/checksum trong từng database, giữ transaction/advisory lock và hỗ trợ baseline V1 sau khi đối chiếu schema. Checksum chuẩn hóa CRLF/LF. SQL vẫn nằm ở vị trí cũ; Spring Boot dùng `ddl-auto=validate`.

CI kiểm tra runner riêng vì nó là công cụ triển khai độc lập; module không tham chiếu source directory của backend. Cập nhật README, AGENTS và phân công để mô tả thống nhất quyết định này.

## Hệ quả và đánh đổi

- Cùng một lịch sử SQL áp dụng cho Supabase và RDS, không cần bản sao theo định dạng Supabase CLI.
- Team chịu trách nhiệm bảo trì runner, kiểm thử transaction/history và đối chiếu schema trước baseline; baseline không tự chứng minh schema tương đương.
- Chỉ hỗ trợ migration chạy trong transaction PostgreSQL. Lịch sử checksum từ runner cũ dùng raw bytes cần được kiểm tra trước khi chuyển sang checksum chuẩn hóa, không tự ghi đè lịch sử.
- Không khôi phục Flyway trong vòng đời ứng dụng và không sửa schema trực tiếp trên database chung ngoài migration.
