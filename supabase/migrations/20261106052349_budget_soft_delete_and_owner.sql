-- ============================================================================
-- Migration: budget_soft_delete_and_owner
-- 1. budget_categories: soft delete (deleted_at IS NULL = đang dùng)
-- 2. budget_items: thêm created_by để kiểm tra chủ sở hữu khi update
-- 3. Index phục vụ kiểm tra "danh mục đang được dùng"
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SOFT DELETE CHO DANH MỤC KINH PHÍ
-- ----------------------------------------------------------------------------
ALTER TABLE budget_categories
    ADD COLUMN deleted_at TIMESTAMPTZ;

-- UNIQUE(name) cũ sẽ chặn tạo lại tên của danh mục đã soft delete,
-- nên thay bằng unique index chỉ áp dụng cho danh mục còn hoạt động.
ALTER TABLE budget_categories
    DROP CONSTRAINT IF EXISTS budget_categories_name_key;

CREATE UNIQUE INDEX uq_budget_categories_active_name
    ON budget_categories (LOWER(name))
    WHERE deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- 2. INDEXES
-- ----------------------------------------------------------------------------
CREATE INDEX idx_budget_items_category_id ON budget_items(category_id);
CREATE INDEX idx_item_price_benchmarks_category_id ON item_price_benchmarks(category_id);