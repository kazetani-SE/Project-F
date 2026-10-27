# Ghi chú cho team: feature event (Phase 0)

- `EventSeries`, `Event`, `EventOrganizer` bám bốn bảng thuộc phạm vi Thành viên 1 trong `V1__init_schema.sql` (bao gồm `club_members` ở feature member). Khóa ngoại giữ dưới dạng `UUID` ở bước khung; khi viết service cần kiểm tra bản ghi được tham chiếu tồn tại và quy tắc xóa.
- `event_role_enum` trong V1 đang chứa `MASTER_PLAN`, `RUNNING_ORDER`... (tên loại tài liệu), chưa phải vai trò ban tổ chức. **Không dùng enum này cho RBAC.** Cần migration có phiên bản và thống nhất dữ liệu trước khi triển khai phân công BTC.
- Ngày kết thúc, quỹ không âm và cặp `(event_id, member_id)` còn được database kiểm tra bằng constraint. Service/API sau này cần báo lỗi dễ hiểu trước khi lưu.
- Các package `controller` và `service/impl` hiện chỉ là vị trí chuẩn bị. Chưa có endpoint hay CRUD; interface service mô tả hợp đồng sẽ triển khai trong phase sau.
