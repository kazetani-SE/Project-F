# ADR-0005: Dùng Supabase Migration cho quy trình của nhóm

## Trạng thái

Chấp nhận. Thay thế quy trình triển khai migration của ADR-0004. ADR-0003 và ADR-0004 được giữ làm lịch sử quyết định.

## Bối cảnh

Nhóm đã dùng Supabase để quản lý migration. Sau khi pull `main`, hướng dẫn Supabase CLI xung đột với tài liệu của nhánh mô tả `MigrationTool` độc lập. Hai quy trình tạo lịch sử migration khác nhau nên không thể dùng đồng thời cho cùng database.

## Quyết định

Dùng Supabase CLI và các file SQL trong `supabase/migrations/` theo `docs/DATABASE_MIGRATIONS.md` làm quy trình chung. Backend tiếp tục dùng `ddl-auto=validate` để kiểm tra schema khi khởi động. Những thay đổi schema tiếp theo phải có migration mới và được kiểm thử trên môi trường riêng trước khi áp dụng cho database của nhóm.

## Hệ quả

Module `migration/` từ nhánh cũ cần được xử lý riêng trước khi dùng hoặc bàn giao. Không dùng `MigrationTool` để áp migration vào database mà Supabase đã quản lý lịch sử. Trước khi chạy trên RDS, nhóm cần thống nhất cách triển khai migration cho môi trường đó.
