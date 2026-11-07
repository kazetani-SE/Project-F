# Project F — Agent Instructions (`AGENTS.md`)

**Project F** là Hệ thống Quản lý Tổ chức Sự kiện Câu lạc bộ (Spec-Driven Development) với kiến trúc Client-Server (React 19 + TypeScript + Vite ở `frontend/`, Java 21 + Spring Boot 3.3.4 ở `backend/`, PostgreSQL 15+ & AWS).

---

## 📚 Tài Liệu Nguồn Chuẩn (Source of Truth)

Trước khi thiết kế hoặc viết code cho bất kỳ phân hệ nào, hãy tham khảo:
- **Đặc tả kỹ thuật & Lược đồ CSDL**: `docs/SYSTEM_SPECIFICATION.md`
- **Kiến trúc hệ thống & Hạ tầng AWS**: `docs/ARCHITECTURE_AND_AWS.md`
- **Phân công nhiệm vụ Vertical Slices & AWS FCAJ (3 thành viên)**: `docs/TEAM_ALLOCATION_FINAL.md`
- **Quy ước tổ chức Backend Feature**: `backend/src/main/java/com/projectf/features/README.md`
- **Từ điển miền nghiệp vụ**: `GLOSSARY.md`

---

## 🛠️ Quy Tắc Kỹ Thuật Cốt Lõi (Engineering Standards)

1. **Backend (`backend/`)**:
   - Tuân thủ kiến trúc **Package-by-Feature (Vertical Slice)** trong `com.projectf.features.<feature_name>` (`controller`, `service`, `repository`, `entity`, `dto`, `mapper`).
   - Lược đồ CSDL PostgreSQL 15+ được quản lý qua Supabase Migration theo `docs/DATABASE_MIGRATIONS.md`. Không tự ý sửa đổi cấu trúc bảng trái với `docs/SYSTEM_SPECIFICATION.md`.
   - Các cột `GENERATED ALWAYS AS (...) STORED` (`total_estimated_amount`, `total_amount`) phải đặt `@Column(..., insertable = false, updatable = false)`.
   - Các SQL Views (`v_event_budget_summary`, `v_projected_budget_from_previous_season`) ánh xạ bằng Read-only Entity (`@Immutable`).
   - Tuyệt đối không lưu dữ liệu nhị phân (`BYTEA`) trong DB; mọi tệp đính kèm (`expense_receipts`, `event_documents`, `event_media_assets`, `event_feedbacks`) lưu qua **Amazon S3 Pre-signed URL** (giới hạn 15MB cho hóa đơn, 50MB cho tài liệu).
2. **Frontend (`frontend/`)**:
   - Sử dụng React 19 + TypeScript + Vite.
   - Đảm bảo kiểu dữ liệu trong `src/types/` khớp chính xác với DTO của Backend và các Enum/Schema trong `docs/SYSTEM_SPECIFICATION.md`.

---

## Agent skills

### Kiểm tra trước khi bàn giao

- Trước khi kết luận hoàn tất, đọc `.github/workflows/` và chạy các bước kiểm tra áp dụng cho phần thay đổi, với đúng phiên bản runtime và working directory của CI. Unit test pass hoặc `git diff --check` sạch không thay thế lint/build/test mà workflow yêu cầu.
- Khi thay đổi module hoặc vị trí source, kiểm tra cả module cũ và mới; cập nhật path filters/job CI để code mới tiếp tục được kiểm tra. Không tắt rule, bỏ job hoặc loại source khỏi lint chỉ để làm CI xanh; việc tách module phải có lý do kiến trúc và được kiểm thử riêng.
- Đọc exit code và report, không chỉ dòng cuối log. Nếu build artifacts cũ gây lỗi, chạy lại với clean build trước khi quy lỗi cho code hoặc môi trường.
- Bàn giao phải ghi rõ lệnh đã chạy, kết quả và phần chưa xác minh. Chỉ nói CI trên remote đã pass khi đã xem kết quả của đúng commit; kiểm tra local pass chỉ chứng minh kết quả local.

### Quyết định kiến trúc và tài liệu

- Đối chiếu review với code, yêu cầu người dùng và ADR trước khi sửa; nêu lý do nếu nhận xét mâu thuẫn với quyết định đã được duyệt. Không tự thay đổi công cụ, cấu trúc hay tên file mà người dùng yêu cầu giữ nguyên.
- Khi thay thế quyết định kiến trúc, tạo ADR mới ghi bối cảnh, lựa chọn, trade-offs và ADR bị thay thế. Giữ nguyên nội dung ADR cũ; liên kết quyết định hiện hành từ tài liệu hướng dẫn.
- Khi thay đổi quy trình, đồng bộ README, hướng dẫn vận hành, phân công deliverable và AGENTS nếu liên quan. Giữ các mô tả khớp nhau thay vì để lại hướng dẫn cũ đang mâu thuẫn.

### Thay đổi migration

- Trước khi sửa SQL migration, đọc `docs/DATABASE_MIGRATIONS.md` và ADR-0005. Giữ lịch sử migration đã áp dụng; bổ sung migration mới cho thay đổi schema.
- Kiểm thử checksum với CRLF/LF, thay đổi nội dung SQL và lịch sử bị thiếu/sai thứ tự. Khi đổi thuật toán checksum, tài liệu phải nêu cách xử lý lịch sử đã có.
- Kiểm thử đường dẫn từ root repo và module; cung cấp cấu hình đường dẫn cho môi trường đóng gói. Các điều kiện baseline theo dự án phải được cấu hình rõ, không gán cứng tên bảng trong runner dùng chung.
- Chỉ chạy baseline/migration trên database chung khi người dùng đã xác định môi trường đích và cho phép thao tác đó. Baseline cần đối chiếu schema thực tế trước; unit test của runner không chứng minh schema Supabase/RDS tương đương V1.

### Issue tracker

Issues and specs are tracked in GitHub Issues (`kazetani-SE/Project-F`) via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the five default canonical triage labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (`GLOSSARY.md` at the repo root and ADRs in `docs/adr/`). See `docs/agents/domain.md`.
