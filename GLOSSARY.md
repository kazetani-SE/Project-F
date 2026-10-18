# Glossary — Từ Điển Miền Nghiệp Vụ (Project F)

Tài liệu này định nghĩa ngôn ngữ chung (Ubiquitous Language) cho dự án **Project F — Hệ Thống Quản Lý Tổ Chức Sự Kiện Câu Lạc Bộ**, giúp đội ngũ phát triển và các AI Agents sử dụng thống nhất thuật ngữ từ Database Schema đến Backend/Frontend.

---

## 1. Tổ Chức & Sự Kiện Đa Mùa (Club & Multi-Season Events)

- **Club Member (`club_members`)**: Thành viên thuộc Câu lạc bộ, được định danh duy nhất bởi mã số sinh viên (`student_id`, 8 ký tự) và `email`, thuộc một ban chuyên môn (`department_enum`: `HR`, `PLAN`, `MEDIA`, `ACADEMIC`) và giữ vai trò cấp CLB (`club_role_enum`: `PRESIDENT`, `VICEPRESIDENT`, `MEMBER`).
- **Event Series (`event_series`)**: Chuỗi sự kiện thường niên hoặc định kỳ của CLB (ví dụ: một cuộc thi học thuật hoặc ngày hội truyền thống được tổ chức qua nhiều năm/kỳ học).
- **Event / Season (`events`)**: Một mùa tổ chức cụ thể thuộc một `Event Series`, có ngày dự kiến (`expected_start_date`, `expected_end_date`), ngày thực tế (`actual_start_date`, `actual_end_date`), quỹ cấp phát (`allocated_fund`) và trạng thái vòng đời (`event_status_enum`: `PLANNING`, `APPROVED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`).
- **Event Organizer (`event_organizers`)**: Thành viên CLB được phân công vào Ban Tổ Chức (BTC) của một mùa sự kiện cụ thể (`event_id`, `member_id`), gắn với vai trò trong sự kiện (`event_role_enum`) và nhiệm vụ được giao (`assigned_tasks`).

---

## 2. Tài Chính, Ngân Sách & Dự Toán Thông Minh (Finance & Smart Estimation)

- **Allocated Fund (`allocated_fund`)**: Tổng quỹ ngân sách được cấp phát ban đầu cho một mùa sự kiện (`events.allocated_fund`).
- **Budget Category (`budget_categories`)**: Nhóm danh mục kinh phí (ví dụ: Hậu cần, Truyền thông, Giải thưởng, Khách mời...).
- **Price Benchmark / Master Catalog (`item_price_benchmarks`)**: Danh mục vật tư/hạng mục chuẩn kèm đơn vị tính (`unit`) và đơn giá tham chiếu thị trường hiện hành (`current_market_price`), dùng làm chuẩn đối chiếu để tránh sai lệch tên gọi và hỗ trợ dự toán tự động.
- **Budget Item (`budget_items`)**: Hạng mục dự trù kinh phí chi tiết của một sự kiện. Thành tiền dự trù (`total_estimated_amount`) được tính tự động (`quantity * estimated_unit_price`).
- **Expense (`expenses`)**: Khoản chi tiêu thực tế phát sinh trong sự kiện, có thể gắn với một `Budget Item`. Thành tiền thực chi (`total_amount`) được tính tự động (`quantity * actual_unit_price`).
- **Expense Receipt (`expense_receipts`)**: Hóa đơn/chứng từ thanh toán đính kèm cho một `Expense` (lưu ảnh/PDF trên S3, tối đa 15MB). **Quy tắc bắt buộc**: Một `Expense` phải có ít nhất 1 `Expense Receipt` trước khi được chuyển sang trạng thái `APPROVED`.
- **Remaining Allocated Fund (`remaining_allocated_fund`)**: Ngân sách quỹ khả dụng hiện còn, tính bằng `allocated_fund - SUM(total_amount của expenses đã APPROVED)` (View `v_event_budget_summary`).
- **Variance Against Estimate (`variance_against_estimate`)**: Chênh lệch giữa dự trù và thực chi, tính bằng `SUM(total_estimated_amount đã APPROVED) - SUM(total_amount đã APPROVED)` (View `v_event_budget_summary`).
- **Projected Budget (`v_projected_budget_from_previous_season`)**: Dự toán đề xuất cho mùa sự kiện mới, tự động lấy định mức số lượng thực tế đã chi (`APPROVED`) ở mùa trước (hoặc số lượng dự trù nếu chưa có thực chi) nhân với đơn giá thị trường hiện hành (`current_market_price` từ `item_price_benchmarks`).

---

## 3. Tài Liệu, Ấn Phẩm & Tri Thức Đa Mùa (Storage, Media & Knowledge Base)

- **Event Document (`event_documents`)**: Tài liệu kế hoạch/đề án của sự kiện (`MASTER_PLAN`, `RUNNING_ORDER`, `SPONSOR_PROPOSAL`, `MEETING_MINUTES`, `RISK_PLAN`, `OTHER`), lưu trên S3 (tối đa 50MB) và hỗ trợ lịch sử phiên bản qua khóa ngoại tự tham chiếu `parent_document_id`.
- **Event Media Asset (`event_media_assets`)**: Ấn phẩm truyền thông & thiết kế (`POSTER`, `BANNER`, `STANDEE`, `BACKDROP`, `BADGE`, `TRAILER`, `SOCIAL_POST`, `OTHER`), theo dõi cả trạng thái phê duyệt (`approval_status`) và trạng thái in ấn (`is_printed`).
- **Event Incident / Post-Mortem (`event_incidents`)**: Nhật ký sự cố phát sinh kèm phân tích bắt buộc 3 thành phần: Nguyên nhân cốt lõi (`root_cause`), Giải pháp tức thời (`immediate_solution`) và Bài học kinh nghiệm (`lesson_learned`), phân loại theo mức độ (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) và mảng các bộ phận liên quan (`department_enum[]`).
- **Event FAQ (`event_faqs`)**: Câu hỏi thường gặp tích lũy xuyên suốt một `Event Series`, hỗ trợ ghim (`is_pinned`) các câu hỏi quan trọng.
- **Event Feedback (`event_feedbacks`)**: Khảo sát/đánh giá sau sự kiện từ `ATTENDEE`, `ORGANIZER`, `SPONSOR`, hoặc `SPEAKER`, bao gồm điểm đánh giá (`rating_score` 1–5) và dữ liệu câu trả lời mở rộng linh hoạt lưu dưới dạng `JSONB` (`custom_responses`).
