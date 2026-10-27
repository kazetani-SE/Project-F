# Ghi chú cho team: feature member (Phase 0)

- `ClubMember` ánh xạ đúng bảng `club_members` trong V1. `student_id` và `email` có ràng buộc unique ở database; service sau này cần xử lý xung đột rõ ràng.
- `is_active`, `created_at` do PostgreSQL cấp mặc định khi insert. Khi triển khai nghiệp vụ ngừng hoạt động, cập nhật đồng bộ `is_active` và `inactive_at` trong một transaction.
- DTO request/response và mapper không trả entity trực tiếp ra API. Controller và `service/impl` chưa có logic, theo đúng phạm vi bộ khung.
