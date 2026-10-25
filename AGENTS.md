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
   - Lược đồ CSDL PostgreSQL 15+ được quản lý qua **Flyway Migration** (`src/main/resources/db/migration/`). Không tự ý sửa đổi cấu trúc bảng trái với `docs/SYSTEM_SPECIFICATION.md`.
   - Các cột `GENERATED ALWAYS AS (...) STORED` (`total_estimated_amount`, `total_amount`) phải đặt `@Column(..., insertable = false, updatable = false)`.
   - Các SQL Views (`v_event_budget_summary`, `v_projected_budget_from_previous_season`) ánh xạ bằng Read-only Entity (`@Immutable`).
   - Tuyệt đối không lưu dữ liệu nhị phân (`BYTEA`) trong DB; mọi tệp đính kèm (`expense_receipts`, `event_documents`, `event_media_assets`, `event_feedbacks`) lưu qua **Amazon S3 Pre-signed URL** (giới hạn 15MB cho hóa đơn, 50MB cho tài liệu).
2. **Frontend (`frontend/`)**:
   - Sử dụng React 19 + TypeScript + Vite.
   - Đảm bảo kiểu dữ liệu trong `src/types/` khớp chính xác với DTO của Backend và các Enum/Schema trong `docs/SYSTEM_SPECIFICATION.md`.

---

## Agent skills

### Issue tracker

Issues and specs are tracked in GitHub Issues (`kazetani-SE/Project-F`) via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the five default canonical triage labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (`GLOSSARY.md` at the repo root and ADRs in `docs/adr/`). See `docs/agents/domain.md`.
