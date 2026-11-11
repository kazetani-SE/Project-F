# Bản Đặc Tả Kỹ Thuật (System Specification)
**Hệ Thống Quản Lý Tổ Chức Sự Kiện Câu Lạc Bộ (Spec-Driven Development)**

---

## 1. Mục Tiêu & Phạm Vi (Scope & Objectives)

Hệ thống là nền tảng quản trị tri thức và hỗ trợ tiền kỳ tổ chức sự kiện dành cho các Câu lạc bộ sinh viên và tổ chức quy mô vừa/nhỏ.

- **Không bao gồm (Non-Goals)**: Check-in QR thời gian thực, bán vé công khai, quét thẻ tại bàn đón tiếp.
- **Tập trung cốt lõi**:
  - **Tài chính & Ngân sách**: Quản lý dự trù kinh phí, theo dõi thực chi, lưu trữ hóa đơn/chứng từ, kiểm vết phê duyệt (Audit Trail) và tính toán ngân sách hiện còn theo thời gian thực.
  - **Nhân sự & Phân công**: Quản lý nhân sự Ban Tổ Chức (BTC) và phân chia ban chuyên môn linh hoạt (Nội dung, Hậu cần, Truyền thông, Tài chính, Đối ngoại...).
  - **Tài liệu & Ấn phẩm**: Quản lý vòng đời và lịch sử phiên bản tài liệu kế hoạch, thiết kế truyền thông (poster, banner, standee, backdrop...).
  - **Tri thức đa mùa (Multi-season)**: Lưu trữ FAQ tích lũy, khảo sát/feedback linh hoạt (`JSONB`), nhật ký sự cố và bài học kinh nghiệm (Post-Mortem).
  - **Dự toán kinh phí thông minh**: Kế thừa định mức vật tư/hạng mục thực tế từ mùa trước thông qua danh mục chuẩn (Master Catalog) và tự động áp dụng đơn giá thị trường tại thời điểm hiện tại.

---

## 2. Mô Hình Thực Thể & Quy Tắc Nghiệp Vụ (Entities & Business Rules)

### 2.1. Phân cấp Sự kiện & Đa mùa (Multi-Season)
- **Ràng buộc thời gian**: Ngày kết thúc dự kiến (`expected_end_date`) phải lớn hơn hoặc bằng ngày bắt đầu dự kiến (`expected_start_date`). Tương tự với ngày thực tế (`actual_end_date >= actual_start_date`).
- Một **Chuỗi sự kiện (`event_series`)** bao gồm nhiều **Mùa sự kiện (`events`)** cụ thể qua từng năm hoặc kỳ học.
- Các tài nguyên tri thức như FAQ, bài học kinh nghiệm sự cố và mẫu khảo sát được liên kết hoặc kế thừa liên tục qua các mùa trong cùng một chuỗi.

### 2.2. Tài chính & Ngân sách (Budgeting & Expense Tracking)
- **Hạng mục dự trù (`budget_items`)**: Tổng kinh phí dự trù (`total_estimated_amount`) được tính tự động (`GENERATED ALWAYS`) bằng công thức `quantity * estimated_unit_price`.
- **Khoản chi thực tế (`expenses`)**: Mỗi khoản chi được gắn với một hạng mục dự trù, trải qua các trạng thái phê duyệt (`DRAFT`, `PENDING`, `APPROVED`, `REJECTED`), ghi nhận người duyệt, thời điểm duyệt, lý do từ chối (nếu có) và lưu trữ tệp ảnh hóa đơn/chứng từ đính kèm (`expense_receipts`).
- **Ngân sách hiện còn**:
  - `Ngân sách quỹ khả dụng (remaining_allocated_fund) = Tổng quỹ cấp phát (allocated_fund) - Tổng thực chi đã duyệt (APPROVED)`.
  - `Chênh lệch dự trù (variance_against_estimate) = Tổng dự trù đã duyệt (APPROVED) - Tổng thực chi đã duyệt (APPROVED)`.

### 2.3. Cơ chế Dự toán Mùa mới theo Giá Hiện tại (Price Benchmark Estimation)
- Hệ thống duy trì danh mục vật tư và bảng giá tham chiếu thị trường chuẩn (`item_price_benchmarks`) theo mã/tên vật tư và đơn vị tính.
- Các hạng mục dự trù (`budget_items`) liên kết trực tiếp tới `item_price_benchmarks` qua khóa ngoại `benchmark_id` để tránh sai lệch tên gọi khi nhập liệu.
- **Dự toán đề xuất mùa mới**: Tự động tính toán dựa trên `Tổng số lượng thực tế đã chi (APPROVED) ở mùa trước * Đơn giá thị trường hiện hành` (nếu chưa có thực chi thì lấy theo số lượng dự trù đã duyệt của mùa trước).

### 2.4. Quản lý Sự cố & Tri thức (Incidents & Knowledge Base)
- Mọi sự cố phát sinh trong quá trình chuẩn bị và vận hành được ghi nhận theo 4 mức độ nghiêm trọng (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
- Yêu cầu bắt buộc (`NOT NULL` / `@NotBlank`) phân tích **Nguyên nhân cốt lõi (`root_cause`)**, **Giải pháp xử lý tức thời (`immediate_solution`)** và **Bài học kinh nghiệm phòng tránh cho các mùa sau (`lesson_learned`)**.

---

## 3. Lược Đồ Cơ Sở Dữ Liệu PostgreSQL (Database Schema - PostgreSQL 15+)

```sql
-- ============================================================================
-- 1. KHỞI TẠO KIỂU DỮ LIỆU ENUM CỐ ĐỊNH (STATE ENUMS)
-- Vai trò BTC là enum cố định; loại tài liệu và loại ấn phẩm dùng VARCHAR + CHECK.
-- event_role_enum biểu diễn thẩm quyền trong BTC, không biểu diễn loại tài liệu.
-- ============================================================================

CREATE TYPE department_enum AS ENUM ('HR', 'PLAN', 'MEDIA', 'ACADEMIC');
CREATE TYPE event_status_enum AS ENUM ('PLANNING', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE approval_status_enum AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE incident_severity_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE event_role_enum AS ENUM ('LEAD_HEADER', 'HR', 'PLAN', 'MEDIA', 'MEMBER');
CREATE TYPE club_role_enum AS ENUM ('PRESIDENT', 'VICEPRESIDENT', 'MEMBER');

-- ============================================================================
-- 2. CÁC BẢNG CỐT LÕI (CORE TABLES)
-- Sử dụng hàm gen_random_uuid() tích hợp sẵn của PostgreSQL 13+
-- ============================================================================

-- Bảng Thành viên CLB
CREATE TABLE club_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id VARCHAR(8) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(15),
    department department_enum,
    club_role club_role_enum,
    batch VARCHAR(4) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    inactive_at TIMESTAMPTZ
);

-- Bảng Chuỗi sự kiện đa mùa
CREATE TABLE event_series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Sự kiện theo mùa
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    series_id UUID REFERENCES event_series(id) ON DELETE SET NULL,
    season_name VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    expected_start_date DATE NOT NULL,
    expected_end_date DATE NOT NULL,
    actual_start_date DATE,
    actual_end_date DATE,
    status event_status_enum NOT NULL DEFAULT 'PLANNING',
    allocated_fund NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (allocated_fund >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_event_dates CHECK (expected_end_date >= expected_start_date),
    CONSTRAINT chk_actual_event_dates CHECK (actual_end_date IS NULL OR actual_start_date IS NULL OR actual_end_date >= actual_start_date)
);

-- Bảng Ban Tổ Chức sự kiện (Phân công thành viên tham gia sự kiện do Ban Chủ nhiệm CLB - PRESIDENT / VICEPRESIDENT đảm nhận)
CREATE TABLE event_organizers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES club_members(id) ON DELETE RESTRICT,
    role event_role_enum NOT NULL DEFAULT 'MEMBER',
    assigned_tasks TEXT,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_event_member UNIQUE (event_id, member_id)
);

-- Bảng Tài liệu kế hoạch & đề án (Hỗ trợ quản lý phiên bản thông qua parent_document_id)
CREATE TABLE event_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    parent_document_id UUID REFERENCES event_documents(id) ON DELETE SET NULL,
    doc_type VARCHAR(50) NOT NULL CHECK (doc_type IN (
        'MASTER_PLAN', 'RUNNING_ORDER', 'SPONSOR_PROPOSAL', 'MEETING_MINUTES', 'RISK_PLAN', 'OTHER'
    )),
    title VARCHAR(200) NOT NULL,
    version VARCHAR(20) NOT NULL DEFAULT '1.0',
    file_url TEXT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES club_members(id) ON DELETE RESTRICT,
    status approval_status_enum NOT NULL DEFAULT 'DRAFT',
    approved_by UUID REFERENCES club_members(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Ấn phẩm truyền thông & thiết kế
CREATE TABLE event_media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    asset_type VARCHAR(50) NOT NULL CHECK (asset_type IN (
        'POSTER', 'BANNER', 'STANDEE', 'BACKDROP', 'BADGE', 'TRAILER', 'SOCIAL_POST', 'OTHER'
    )),
    title VARCHAR(200) NOT NULL,
    specifications VARCHAR(255),
    design_file_url TEXT,
    preview_image_url TEXT,
    is_printed BOOLEAN NOT NULL DEFAULT FALSE,
    approval_status approval_status_enum NOT NULL DEFAULT 'DRAFT',
    approved_by UUID REFERENCES club_members(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 3. PHÂN HỆ TÀI CHÍNH & ĐỊNH MỨC GIÁ THỊ TRƯỜNG
-- ============================================================================

-- Bảng Danh mục kinh phí
CREATE TABLE budget_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

-- Bảng Tham chiếu đơn giá thị trường (Master Catalog cho vật tư/hạng mục)
CREATE TABLE item_price_benchmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES budget_categories(id) ON DELETE RESTRICT,
    item_name VARCHAR(200) NOT NULL,
    unit VARCHAR(30) NOT NULL,
    current_market_price NUMERIC(15, 2) NOT NULL CHECK (current_market_price >= 0),
    supplier_reference VARCHAR(200),
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_benchmark_item_unit UNIQUE (item_name, unit)
);

-- Bảng Dự trù kinh phí chi tiết
CREATE TABLE budget_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES budget_categories(id) ON DELETE RESTRICT,
    benchmark_id UUID REFERENCES item_price_benchmarks(id) ON DELETE SET NULL,
    item_name VARCHAR(200) NOT NULL,
    media_asset UUID REFERENCES event_media_assets(id) ON DELETE SET NULL,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit VARCHAR(30) NOT NULL,
    estimated_unit_price NUMERIC(15, 2) NOT NULL CHECK (estimated_unit_price >= 0),
    total_estimated_amount NUMERIC(15, 2) GENERATED ALWAYS AS (quantity * estimated_unit_price) STORED,
    notes TEXT,
    approval_status approval_status_enum NOT NULL DEFAULT 'PENDING',
    approved_by UUID REFERENCES club_members(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Chi tiêu thực tế
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    budget_item_id UUID REFERENCES budget_items(id) ON DELETE SET NULL,
    item_name VARCHAR(200) NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
    actual_unit_price NUMERIC(15, 2) NOT NULL CHECK (actual_unit_price >= 0),
    total_amount NUMERIC(15, 2) GENERATED ALWAYS AS (quantity * actual_unit_price) STORED,
    paid_by UUID NOT NULL REFERENCES club_members(id) ON DELETE RESTRICT,
    status approval_status_enum NOT NULL DEFAULT 'PENDING',
    approved_by UUID REFERENCES club_members(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    payment_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Hóa đơn & Chứng từ đính kèm
CREATE TABLE expense_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    receipt_code VARCHAR(100),
    image_url TEXT NOT NULL,
    supplier_name VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 4. PHÂN HỆ QUẢN TRỊ TRI THỨC ĐA MÙA (KNOWLEDGE BASE & POST-MORTEM)
-- ============================================================================

-- Bảng Nhật ký sự cố & Bài học kinh nghiệm (Post-Mortem)
CREATE TABLE event_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    reported_by UUID REFERENCES club_members(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    severity incident_severity_enum NOT NULL,
    department_involved department_enum[] NOT NULL,
    incident_description TEXT NOT NULL,
    root_cause TEXT NOT NULL,
    immediate_solution TEXT NOT NULL,
    lesson_learned TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng FAQ tích lũy đa mùa
CREATE TABLE event_faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    series_id UUID NOT NULL REFERENCES event_series(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Khảo sát & Feedback sau sự kiện (Tích hợp JSONB cho câu hỏi khảo sát động)
CREATE TABLE event_feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL DEFAULT 'ATTENDEE' CHECK (source_type IN ('ATTENDEE', 'ORGANIZER', 'SPONSOR', 'SPEAKER')),
    file_url TEXT NOT NULL,
    rating_score INT NOT NULL CHECK (rating_score BETWEEN 1 AND 5),
    highlight_content TEXT,
    improvement_content TEXT,
    custom_responses JSONB DEFAULT '{}'::jsonb,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Báo cáo Tổng hợp Feedback bởi AI (Lưu Cache Báo cáo kèm Snapshot Watermark chống dữ liệu lỗi thời)
CREATE TABLE event_feedback_ai_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,
    model_used VARCHAR(100) NOT NULL,
    model_tier VARCHAR(20) NOT NULL CHECK (model_tier IN ('FAST', 'DEEP', 'HEURISTIC')),
    feedback_count_snapshot INT NOT NULL CHECK (feedback_count_snapshot >= 0),
    latest_feedback_at_snapshot TIMESTAMPTZ,
    average_rating_snapshot NUMERIC(4, 2) NOT NULL DEFAULT 0.00,
    executive_summary TEXT NOT NULL,
    sentiment_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    top_highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
    top_improvements JSONB NOT NULL DEFAULT '[]'::jsonb,
    department_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
    suggested_incidents JSONB NOT NULL DEFAULT '[]'::jsonb,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 5. CHIẾN LƯỢC ĐÁNH CHỈ MỤC (INDEXES)
-- ============================================================================

CREATE INDEX idx_events_series_id ON events(series_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_event_organizers_event_id ON event_organizers(event_id);
CREATE INDEX idx_event_organizers_member_id ON event_organizers(member_id);
CREATE INDEX idx_budget_items_event_status ON budget_items(event_id, approval_status);
CREATE INDEX idx_budget_items_benchmark_id ON budget_items(benchmark_id);
CREATE INDEX idx_expenses_event_status ON expenses(event_id, status);
CREATE INDEX idx_expenses_budget_item_id ON expenses(budget_item_id);
CREATE INDEX idx_event_incidents_event_severity ON event_incidents(event_id, severity);
CREATE INDEX idx_event_faqs_series_pinned ON event_faqs(series_id, is_pinned);
CREATE INDEX idx_event_feedbacks_event_id ON event_feedbacks(event_id);
CREATE INDEX idx_event_feedbacks_custom_jsonb ON event_feedbacks USING GIN (custom_responses);
CREATE INDEX idx_event_feedback_ai_reports_event_id ON event_feedback_ai_reports(event_id);

-- ============================================================================
-- 6. VIEWS TÍNH TOÁN NGÂN SÁCH & DỰ TOÁN MÙA MỚI
-- ============================================================================

-- View 1: Tổng hợp Ngân sách & Thực chi theo thời gian thực
CREATE OR REPLACE VIEW v_event_budget_summary AS
SELECT 
    e.id AS event_id,
    e.title AS event_title,
    e.season_name,
    e.allocated_fund,
    COALESCE(b.total_estimated, 0) AS total_budget_estimated,
    COALESCE(x.total_actual_spent, 0) AS total_actual_spent,
    (e.allocated_fund - COALESCE(x.total_actual_spent, 0)) AS remaining_allocated_fund,
    (COALESCE(b.total_estimated, 0) - COALESCE(x.total_actual_spent, 0)) AS variance_against_estimate
FROM events e
LEFT JOIN (
    SELECT event_id, SUM(total_estimated_amount) AS total_estimated
    FROM budget_items 
    WHERE approval_status = 'APPROVED'
    GROUP BY event_id
) b ON e.id = b.event_id
LEFT JOIN (
    SELECT event_id, SUM(total_amount) AS total_actual_spent
    FROM expenses 
    WHERE status = 'APPROVED'
    GROUP BY event_id
) x ON e.id = x.event_id;

-- View 2: Dự toán kinh phí mùa mới dựa trên định mức thực tế mùa trước & giá thị trường hiện tại
CREATE OR REPLACE VIEW v_projected_budget_from_previous_season AS
SELECT 
    b_prev.event_id AS previous_event_id,
    b_prev.id AS previous_budget_item_id,
    b_prev.category_id,
    b_prev.benchmark_id,
    b_prev.item_name,
    b_prev.unit,
    b_prev.quantity AS previous_planned_qty,
    COALESCE(exp_actual.actual_qty_used, b_prev.quantity) AS base_quantity_for_projection,
    b_prev.estimated_unit_price AS previous_unit_price,
    COALESCE(p.current_market_price, b_prev.estimated_unit_price) AS current_adjusted_unit_price,
    ROUND(
        COALESCE(exp_actual.actual_qty_used, b_prev.quantity) * COALESCE(p.current_market_price, b_prev.estimated_unit_price), 
        2
    ) AS projected_current_cost
FROM budget_items b_prev
LEFT JOIN (
    SELECT budget_item_id, SUM(quantity) AS actual_qty_used
    FROM expenses
    WHERE status = 'APPROVED' AND budget_item_id IS NOT NULL
    GROUP BY budget_item_id
) exp_actual ON b_prev.id = exp_actual.budget_item_id
LEFT JOIN item_price_benchmarks p 
    ON b_prev.benchmark_id = p.id 
    OR (
        b_prev.benchmark_id IS NULL 
        AND LOWER(TRIM(b_prev.item_name)) = LOWER(TRIM(p.item_name)) 
        AND LOWER(TRIM(b_prev.unit)) = LOWER(TRIM(p.unit))
    )
WHERE b_prev.approval_status = 'APPROVED';
```

---

## 4. Quy Chuẩn Thu Thập & Ràng Buộc Nhập Liệu (Validation Spec)

| Mẫu nhập liệu | Các trường dữ liệu cấu thành | Mô tả & Quy tắc bắt buộc |
| :--- | :--- | :--- |
| **Dự trù kinh phí (`budget_items`)** | Tên hạng mục, Danh mục cha, Mã vật tư chuẩn (`benchmark_id` - tùy chọn), Số lượng, Đơn vị, Đơn giá dự kiến, Ghi chú | `@NotBlank` cho tên và đơn vị; `@Positive` cho số lượng (`> 0`); `@PositiveOrZero` cho đơn giá (`>= 0`). |
| **Khoản chi thực tế (`expenses`)** | Hạng mục dự trù liên kết, Tên khoản chi, Số lượng, Đơn giá thực tế, Người chi, Ngày thanh toán, Ảnh hóa đơn | `@NotNull` cho ngày thanh toán và người chi; bắt buộc đính kèm ít nhất 1 chứng từ (`expense_receipts`) trước khi chuyển sang trạng thái `APPROVED`. |
| **Sự cố & Post-Mortem (`event_incidents`)** | Tên sự cố, Mức độ nghiêm trọng, Bộ phận liên quan, Mô tả chi tiết, Nguyên nhân cốt lõi, Hướng xử lý ngay, Bài học phòng tránh | Mức độ chọn từ Enum (`LOW` đến `CRITICAL`); `@NotBlank` bắt buộc đối với `incident_description`, `root_cause`, `immediate_solution` và `lesson_learned`. |
| **FAQ & Feedback (`event_feedbacks`)** | Điểm đánh giá (1-5 sao), Điểm làm tốt, Điểm cần khắc phục, Dữ liệu câu hỏi mở rộng (`custom_responses`) | `rating_score` nằm trong khoảng `[1, 5]`; trường `custom_responses` lưu trữ cấu trúc `JSONB` hợp lệ cho các tiêu chí đánh giá đặc thù của từng sự kiện. |

---

## 5. Ma Trận Phân Quyền Nghiệp Vụ & Lưu Trữ (RBAC & Storage Spec)

### 5.1. Phân quyền theo vai trò trong sự kiện (Event-level RBAC)

`club_role_enum` là quyền cấp CLB; `event_role_enum` là quyền nghiệp vụ trong **một** sự kiện. Chỉ thành viên CLB đang hoạt động và có bản ghi `event_organizers` của sự kiện mới nhận quyền event-level. `department_enum` (`HR`, `PLAN`, `MEDIA`, `ACADEMIC`) mô tả ban trực thuộc CLB, không tự cấp quyền BTC.

| Chủ thể | Quyền trong sự kiện |
| :--- | :--- |
| `PRESIDENT`, `VICEPRESIDENT` (cấp CLB) | Đọc/ghi và duyệt trên mọi sự kiện; **chỉ hai vai trò này** được thêm, đổi vai trò hoặc rút nhân sự khỏi `event_organizers`. |
| `LEAD_HEADER` (BTC) | Quản trị thông tin tổng quan và vòng đời sự kiện; duyệt/từ chối tài liệu kế hoạch; quản lý FAQ của chuỗi sự kiện đang phụ trách và xem, tổng hợp Feedback. Không được phân công nhân sự BTC. |
| `HR` (BTC) | Duyệt/từ chối ấn phẩm truyền thông; đối soát hóa đơn và duyệt/từ chối khoản chi cùng dự trù phát sinh do `MEMBER` của cùng sự kiện gửi. |
| `PLAN` (BTC) | Soạn thảo, tải lên và cập nhật tài liệu kế hoạch bằng phiên bản mới; được tự chuyển tài liệu do chính mình tải lên sang `APPROVED`. Không duyệt tài liệu của người khác. |
| `MEDIA` (BTC) | Thiết kế, tải lên và cập nhật ấn phẩm/design của sự kiện (`BANNER`, `BACKDROP`, `BADGE`/merch và các loại ấn phẩm hợp lệ khác); không tự duyệt ấn phẩm. |
| `MEMBER` (BTC) | Thực thi nhiệm vụ được giao; tạo dự trù `PENDING` và khoản chi `DRAFT`/`PENDING` kèm hóa đơn để `HR` duyệt. Không tự duyệt. |

- Mọi vai trò BTC trên đều được đọc dữ liệu của **sự kiện được phân công** và ghi nhận `event_incidents`. Người không thuộc BTC không có quyền đọc/ghi dữ liệu nội bộ của sự kiện, trừ Ban Chủ nhiệm CLB. Khi truy cập qua ID tài liệu, ấn phẩm, dự trù hoặc khoản chi, phải kiểm tra `event_id` thực tế của bản ghi; ID trên URL không thay thế kiểm tra này.
- Vai trò BTC không kế thừa quyền phân công nhân sự từ `LEAD_HEADER`. Mỗi thành viên có tối đa một bản ghi BTC cho một sự kiện (`uq_event_member`); đổi vai trò là cập nhật bản ghi đó.
- Quyền `PLAN` tự duyệt dựa trên `event_documents.uploaded_by`, lấy từ người dùng đã xác thực chứ không tin ID do client gửi. Quyền `HR` duyệt đề xuất của `MEMBER` cần định danh người gửi: `budget_items` chưa có cột người đề xuất, còn `expenses.paid_by` là người chi tiền, không nhất thiết là người gửi. Phải bổ sung thông tin người gửi trước khi triển khai điều kiện duyệt này; không suy ra từ `department_enum`.
- `APPROVED`/`REJECTED` là trạng thái duyệt của tài liệu, ấn phẩm, dự trù hoặc khoản chi; quyền duyệt được kiểm tra tại thời điểm chuyển trạng thái. Mọi quyền nêu trên vẫn phải tuân thủ ràng buộc chứng từ và vòng đời nghiệp vụ ở các mục tương ứng.

### 5.2. Quy chuẩn lưu trữ tệp đính kèm (File & Media Storage)
- Database chỉ lưu đường dẫn định danh (`file_url`, `design_file_url`, `image_url`), **tuyệt đối không lưu dữ liệu nhị phân (`BYTEA`)** trực tiếp trong PostgreSQL.
- Các tệp hóa đơn (`expense_receipts`) và tài liệu (`event_documents`) được tải lên dịch vụ Object Storage (**Amazon S3**) thông qua cơ chế **Pre-signed URL**, giới hạn dung lượng tối đa **15MB** cho ảnh hóa đơn (`JPG/PNG/WEBP/PDF`) và **50MB** cho tài liệu kế hoạch.

### 5.3. Quy chuẩn Xóa & Bảo toàn Dữ liệu (Deletion & Data Integrity Guard)
- **Tài liệu sự kiện (`event_documents`)**: Chỉ cho phép xóa khi ở trạng thái `DRAFT` hoặc `REJECTED`. Nghiêm cấm xóa tài liệu đã được phê duyệt chính thức (`APPROVED`). Khi xóa tài liệu cha, toàn bộ tài liệu con kế thừa qua `parent_document_id` tự động đặt về `NULL` (`ON DELETE SET NULL`) để bảo toàn dữ liệu.
- **Ấn phẩm truyền thông (`event_media_assets`)**: Chỉ cho phép xóa khi ấn phẩm chưa được gửi đi in (`is_printed = false`). Khóa ngoại tham chiếu từ `budget_items.media_asset` được cấu hình `ON DELETE SET NULL`.
- **Nhật ký sự cố (`event_incidents`) & FAQ (`event_faqs`) & Feedback (`event_feedbacks`)**: Cung cấp API `DELETE` cho phép Ban Tổ Chức dọn dẹp các mục nhập nhầm, lỗi thời hoặc phản hồi spam.
- **Quản lý tệp Object Storage (`com.projectf.features.storage`)**: Hỗ trợ endpoint xóa tệp trên bucket Amazon S3 (`DELETE /api/v1/storage/file?objectKey=...`) khi cần thu hồi dữ liệu.
