# Lưu Trữ Tệp Bằng Amazon S3 Pre-Signed URL

## Context & Decision
Hệ thống cần quản lý nhiều tệp đính kèm kích thước lớn như ảnh hóa đơn chứng từ (`expense_receipts`, tối đa 15MB) và tài liệu kế hoạch/ấn phẩm thiết kế (`event_documents`, `event_media_assets`, tối đa 50MB). Chúng tôi quyết định tuyệt đối không lưu dữ liệu nhị phân (`BYTEA`) trong PostgreSQL và không truyền trực tiếp tệp nhị phân qua máy chủ Backend (EC2 Spring Boot), mà sử dụng cơ chế **Amazon S3 Pre-signed URL** thông qua AWS SDK v2 (`S3Presigner`).

## Consequences
- Giải phóng toàn bộ băng thông (bandwidth) và tải CPU/Memory của máy chủ ứng dụng Backend EC2 khi người dùng tải lên/tải xuống tệp lớn.
- PostgreSQL chỉ lưu trữ siêu dữ liệu (metadata) và đường dẫn định danh (`file_url`, `image_url`), giúp kích thước cơ sở dữ liệu luôn nhỏ gọn, tốc độ truy vấn cao và quá trình sao lưu định kỳ (RDS Snapshot) diễn ra nhanh chóng.
- Cần có cơ chế kiểm tra giới hạn kích thước tệp và định dạng MIME hợp lệ tại tầng Backend trước khi sinh URL có chữ ký bảo mật.
