# Quản lý chuỗi, mùa sự kiện và Ban tổ chức

- [Đặc tả API §2.2 và §3](../../../../../../../../docs/API_SPECIFICATION.md) quy định API chuỗi, mùa sự kiện và phân công BTC. Chi tiết chuỗi và danh sách mùa áp dụng cùng phạm vi truy cập.
- Năm giá trị `event_role_enum` (`LEAD_HEADER`, `HR`, `PLAN`, `MEDIA`, `MEMBER`) là quyền nghiệp vụ trong một mùa; `club_role_enum` quyết định quyền phân công BTC. Thành viên CLB đang hoạt động được xem tổng quan mọi mùa, còn dữ liệu nội bộ cần phân công BTC.
- Trạng thái đi theo `PLANNING → APPROVED → IN_PROGRESS → COMPLETED`. Ba trạng thái đầu có thể hủy. Service khóa bản ghi khi chuyển trạng thái và kiểm tra ngày thực tế.
- Mỗi thành viên đang hoạt động chỉ có một phân công trong một mùa. API dùng `eventId` trên đường dẫn và trả `409 DUPLICATE_RESOURCE` khi phân công trùng. Giao diện phân công nằm trong trang tổng quan mùa.
