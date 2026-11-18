# Quản lý thành viên CLB

- [Đặc tả API §2.1](../../../../../../../../docs/API_SPECIFICATION.md#21-quản-lý-thành-viên-clb-club_members) quy định danh sách có bộ lọc và phân trang, xem hồ sơ, thêm, sửa và đổi trạng thái. Request đổi trạng thái dùng `isActive`, còn hồ sơ trả về dùng `active`.
- PostgreSQL bảo vệ tính duy nhất của email và MSSV khi so sánh không phân biệt hoa thường. API trả `409 DUPLICATE_RESOURCE` khi có xung đột.
- Khi đổi trạng thái, service khóa bản ghi và cập nhật `is_active` cùng `inactive_at` trong một transaction. Kích hoạt lại xóa mốc ngừng hoạt động.
- `auth_user_id` liên kết tài khoản Supabase với hồ sơ CLB. Spring lấy quyền từ hồ sơ đang hoạt động. Chủ nhiệm và Phó chủ nhiệm được ghi, thành viên thường được đọc.
