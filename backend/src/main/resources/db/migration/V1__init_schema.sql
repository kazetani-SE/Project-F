-- ============================================================================
-- Flyway Migration: V1__init_schema.sql
-- Project F: Hệ thống Quản lý Tổ chức Sự kiện Câu lạc bộ (PostgreSQL 15+)
-- ============================================================================

-- ============================================================================
-- 1. KHỞI TẠO KIỂU DỮ LIỆU ENUM CỐ ĐỊNH (STATE ENUMS)
-- Lưu ý: Các danh mục dễ biến đổi như Vai trò BTC, Loại tài liệu, Loại ấn phẩm
-- sử dụng VARCHAR kết hợp CHECK constraint để dễ dàng mở rộng qua Flyway.
-- ============================================================================

CREATE TYPE department_enum AS ENUM ('HR', 'PLAN', 'MEDIA', 'ACADEMIC');
CREATE TYPE event_status_enum AS ENUM ('PLANNING', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE approval_status_enum AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE incident_severity_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE event_role_enum AS ENUM ('MASTER_PLAN', 'RUNNING_ORDER', 'SPONSOR_PROPOSAL', 'MEETING_MINUTES', 'RISK_PLAN', 'MEMBER');
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

-- Bảng Ban Tổ Chức sự kiện
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
