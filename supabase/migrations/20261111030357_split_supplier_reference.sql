-- 1. Thêm 2 cột mới: supplier_name và supplier_link
ALTER TABLE item_price_benchmarks
    ADD COLUMN supplier_name VARCHAR(200),
    ADD COLUMN supplier_link TEXT;

-- 2. Chuyển dữ liệu cũ từ supplier_reference sang supplier_name (nếu có)
UPDATE item_price_benchmarks
SET supplier_name = supplier_reference
WHERE supplier_reference IS NOT NULL;

-- 3. Xóa cột cũ supplier_reference
ALTER TABLE item_price_benchmarks
    DROP COLUMN supplier_reference;