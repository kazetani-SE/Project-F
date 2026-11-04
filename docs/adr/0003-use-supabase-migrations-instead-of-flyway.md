# Sử Dụng Supabase Migration Thay Cho Flyway Migration

## Context & Decision
Ban đầu dự án sử dụng Flyway tích hợp trong Spring Boot để quản lý migration lược đồ CSDL. Tuy nhiên, khi kết nối tới Supabase PostgreSQL (phiên bản PostgreSQL 17), cơ chế tự động can thiệp của Flyway trong vòng đời khởi động của ứng dụng Spring Boot gây ra sự phụ thuộc chặt và xung đột về tương thích driver/phiên bản cơ sở dữ liệu cloud. Chúng tôi quyết định gỡ bỏ hoàn toàn Flyway khỏi Backend và chuyển sang quản lý lược đồ CSDL trực tiếp thông qua **Supabase Migration** (sử dụng Supabase CLI / SQL Scripts).

## Consequences
- Backend Spring Boot khởi động nhanh hơn, độc lập với cơ chế DDL migration của cơ sở dữ liệu; JPA chỉ giữ nhiệm vụ kiểm tra (`hibernate.ddl-auto: validate`).
- Toàn bộ thay đổi lược đồ cơ sở dữ liệu được theo dõi trực tiếp trong hệ sinh thái Supabase (`supabase/migrations/`) hoặc các tập lệnh SQL có phiên bản, tận dụng tối đa các tính năng mở rộng của PostgreSQL mà không bị giới hạn bởi plugin Java.
- Khi khởi tạo môi trường local hoặc môi trường staging mới, lập trình viên áp dụng migration qua Supabase CLI hoặc trực tiếp trên Supabase SQL Editor.
