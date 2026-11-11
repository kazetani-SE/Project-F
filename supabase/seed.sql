-- ============================================================================
-- PROJECT F — DATABASE SEED DATA (supabase/seed.sql)
-- Dữ liệu mẫu chuẩn hóa cho tất cả các phân hệ:
-- 1. club_members (Thành viên CLB)
-- 2. event_series (Chuỗi sự kiện thường niên)
-- 3. events (Mùa sự kiện đa mùa)
-- 4. event_organizers (Phân công nhân sự BTC sự kiện)
-- 5. budget_categories & item_price_benchmarks (Danh mục & Bảng giá chuẩn thị trường)
-- 6. budget_items, expenses, expense_receipts (Dự trù & Thực chi kèm chứng từ)
-- 7. event_documents (Tài liệu kế hoạch, đề án đa phiên bản)
-- 8. event_media_assets (Ấn phẩm truyền thông, thiết kế, trạng thái in ấn)
-- 9. event_incidents (Nhật ký sự cố & bài học kinh nghiệm Post-Mortem)
-- 10. event_faqs & event_feedbacks (Tri thức tích lũy đa mùa & Khảo sát đánh giá)
-- 11. event_feedback_ai_reports (Báo cáo AI tổng hợp phản hồi)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. THÀNH VIÊN CÂU LẠC BỘ (club_members)
-- ----------------------------------------------------------------------------
INSERT INTO club_members (id, student_id, full_name, email, phone, department, club_role, batch, is_active)
VALUES
    ('00000000-0000-4000-a000-000000000001', 'SE180001', 'Nguyễn Huy Phong', 'phongnhse180001@fpt.edu.vn', '0901234501', 'PLAN', 'PRESIDENT', 'K18', TRUE),
    ('00000000-0000-4000-a000-000000000002', 'SE180002', 'Nguyễn Xuân Tân', 'tannxse180002@fpt.edu.vn', '0901234502', 'ACADEMIC', 'VICEPRESIDENT', 'K18', TRUE),
    ('00000000-0000-4000-a000-000000000003', 'SE180003', 'Nguyễn Trọng Hiếu', 'hieuntse180003@fpt.edu.vn', '0901234503', 'MEDIA', 'VICEPRESIDENT', 'K18', TRUE),
    ('00000000-0000-4000-a000-000000000004', 'SE180004', 'Trần Hoàng Nam', 'namthse180004@fpt.edu.vn', '0901234504', 'HR', 'MEMBER', 'K18', TRUE),
    ('00000000-0000-4000-a000-000000000005', 'SE180005', 'Lê Thị Thảo', 'thaoltse180005@fpt.edu.vn', '0901234505', 'HR', 'MEMBER', 'K19', TRUE),
    ('00000000-0000-4000-a000-000000000006', 'SE180006', 'Phạm Quốc Bảo', 'baopqse180006@fpt.edu.vn', '0901234506', 'PLAN', 'MEMBER', 'K18', TRUE),
    ('00000000-0000-4000-a000-000000000007', 'SE180007', 'Đặng Thu Hà', 'hadtse180007@fpt.edu.vn', '0901234507', 'PLAN', 'MEMBER', 'K19', TRUE),
    ('00000000-0000-4000-a000-000000000008', 'SE180008', 'Vũ Minh Quân', 'quanvmse180008@fpt.edu.vn', '0901234508', 'MEDIA', 'MEMBER', 'K18', TRUE),
    ('00000000-0000-4000-a000-000000000009', 'SE180009', 'Ngô Phương Linh', 'linhnpse180009@fpt.edu.vn', '0901234509', 'MEDIA', 'MEMBER', 'K19', TRUE),
    ('00000000-0000-4000-a000-000000000010', 'SE180010', 'Đỗ Gia Huy', 'huydgse180010@fpt.edu.vn', '0901234510', 'ACADEMIC', 'MEMBER', 'K18', TRUE)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. CHUỖI SỰ KIỆN (event_series)
-- ----------------------------------------------------------------------------
INSERT INTO event_series (id, name, description)
VALUES
    ('00000000-0000-4000-b000-000000000001', 'F-Code Hackathon', 'Cuộc thi lập trình hackathon thường niên dành cho sinh viên đam mê công nghệ tại Đại học FPT'),
    ('00000000-0000-4000-b000-000000000002', 'F-Code Tech Talk & Workshop', 'Chuỗi hội thảo chia sẻ công nghệ chuyên sâu, định hướng nghề nghiệp và thực hành dự án thực chiến'),
    ('00000000-0000-4000-b000-000000000003', 'F-Code Welcome Newbie', 'Chuỗi hoạt động truyền thống chào đón tân sinh viên và tuyển quân thành viên thế hệ mới')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. MÙA SỰ KIỆN (events)
-- ----------------------------------------------------------------------------
INSERT INTO events (id, series_id, season_name, title, description, expected_start_date, expected_end_date, actual_start_date, actual_end_date, status, allocated_fund)
VALUES
    -- Mùa 1: Mùa trước đã hoàn thành (phục vụ View dự toán tự động)
    ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-b000-000000000001', '2025', 'F-Code Hackathon 2025: Code for Green', 'Cuộc thi lập trình giải pháp công nghệ xanh và phát triển bền vững', '2025-10-15', '2025-10-17', '2025-10-15', '2025-10-17', 'COMPLETED', 25000000.00),
    -- Mùa 2: Mùa hiện tại đang diễn ra
    ('00000000-0000-4000-c000-000000000002', '00000000-0000-4000-b000-000000000001', '2026', 'F-Code Hackathon 2026: AI Agent Revolution', 'Cuộc thi lập trình xây dựng các ứng dụng đa tác nhân thông minh', '2026-11-20', '2026-11-22', NULL, NULL, 'IN_PROGRESS', 35000000.00),
    -- Mùa 3: Mùa đã phê duyệt kế hoạch
    ('00000000-0000-4000-c000-000000000003', '00000000-0000-4000-b000-000000000002', 'Fall 2026', 'Tech Talk: AWS Cloud & GenAI Architecture', 'Hội thảo kiến trúc điện toán đám mây AWS và ứng dụng Generative AI', '2026-12-05', '2026-12-05', NULL, NULL, 'APPROVED', 15000000.00),
    -- Mùa 4: Mùa đang lên kế hoạch tiền kỳ
    ('00000000-0000-4000-c000-000000000004', '00000000-0000-4000-b000-000000000003', '2027', 'Welcome Newbie K21: Ignite Your Passion', 'Chương trình chào đón tân sinh viên khóa K21 gia nhập F-Code', '2027-03-01', '2027-03-05', NULL, NULL, 'PLANNING', 20000000.00)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. BAN TỔ CHỨC SỰ KIỆN (event_organizers)
-- ----------------------------------------------------------------------------
INSERT INTO event_organizers (id, event_id, member_id, role, assigned_tasks)
VALUES
    -- Ban Tổ Chức Hackathon 2026
    ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-c000-000000000002', '00000000-0000-4000-a000-000000000001', 'MEMBER', 'Trưởng Ban Tổ Chức, chỉ đạo chung và phê duyệt tài liệu kế hoạch'),
    ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-c000-000000000002', '00000000-0000-4000-a000-000000000002', 'MEMBER', 'Phó BTC phụ trách chuyên môn, ra đề bài và điều phối Ban Giám Khảo'),
    ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-c000-000000000002', '00000000-0000-4000-a000-000000000004', 'MEMBER', 'Phụ trách nhân sự, chấm công và đối soát dự trù, hóa đơn chi tiêu'),
    ('00000000-0000-4000-8000-000000000004', '00000000-0000-4000-c000-000000000002', '00000000-0000-4000-a000-000000000006', 'MEMBER', 'Biên soạn đề án, timeline 48h và kịch bản chi tiết'),
    ('00000000-0000-4000-8000-000000000005', '00000000-0000-4000-c000-000000000002', '00000000-0000-4000-a000-000000000008', 'MEMBER', 'Thiết kế key visual, backdrop sân khấu, standee và áo đồng phục BTC'),
    -- Ban Tổ Chức Hackathon 2025
    ('00000000-0000-4000-8000-000000000006', '00000000-0000-4000-c000-000000000001', '00000000-0000-4000-a000-000000000001', 'MEMBER', 'Trưởng BTC mùa 2025'),
    ('00000000-0000-4000-8000-000000000007', '00000000-0000-4000-c000-000000000001', '00000000-0000-4000-a000-000000000002', 'MEMBER', 'Phó BTC phụ trách chuyên môn mùa 2025')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. DANH MỤC KINH PHÍ & ĐỊNH MỨC GIÁ THỊ TRƯỜNG (budget_categories & item_price_benchmarks)
-- ----------------------------------------------------------------------------
INSERT INTO budget_categories (id, name, description)
VALUES
    ('00000000-0000-4000-d000-000000000001', 'Truyền thông & In ấn', 'Kinh phí in ấn backdrop, banner, standee, poster, sticker và thẻ đeo'),
    ('00000000-0000-4000-d000-000000000002', 'Hậu cần & Teabreak', 'Nước uống, bánh ngọt teabreak, suất ăn nhẹ cho thí sinh và Ban Giám Khảo'),
    ('00000000-0000-4000-d000-000000000003', 'Giải thưởng & Quà tặng', 'Cúp lưu niệm, tiền thưởng các bảng đấu, quà tặng lưu niệm cho diễn giả'),
    ('00000000-0000-4000-d000-000000000004', 'Kỹ thuật & Trang thiết bị', 'Dây điện, ổ cắm nối dài, bộ phát mạng dự phòng và thiết bị âm thanh')
ON CONFLICT (id) DO NOTHING;

INSERT INTO item_price_benchmarks (id, category_id, item_name, unit, current_market_price, supplier_name, supplier_link)
VALUES
    ('00000000-0000-4000-e000-000000000001', '00000000-0000-4000-d000-000000000001', 'Backdrop bạt Hiflex', 'm2', 65000.00, 'Nhà in Tân Triều', 'https://tantrieuprint.com'),
    ('00000000-0000-4000-e000-000000000002', '00000000-0000-4000-d000-000000000001', 'Standee chữ X (cả in + khung)', 'Cái', 180000.00, 'Nhà in Ánh Dương', 'https://anhduongprint.vn'),
    ('00000000-0000-4000-e000-000000000003', '00000000-0000-4000-d000-000000000001', 'Thẻ đeo BTC & Thí sinh kèm dây', 'Cái', 15000.00, 'Xưởng in Thẻ đeo SG', 'https://xuongthedeo.vn'),
    ('00000000-0000-4000-e000-000000000004', '00000000-0000-4000-d000-000000000002', 'Nước suối đóng chai Aquafina 500ml', 'Thùng 24 chai', 95000.00, 'Đại lý Nước ngọt Long An', 'https://dailyngoclongan.vn'),
    ('00000000-0000-4000-e000-000000000005', '00000000-0000-4000-d000-000000000002', 'Bánh ngọt Teabreak tự chọn', 'Phần', 35000.00, 'Tiệm bánh Savouré', 'https://savoure.com.vn'),
    ('00000000-0000-4000-e000-000000000006', '00000000-0000-4000-d000-000000000003', 'Kỷ niệm chương pha lê khắc laser', 'Cái', 250000.00, 'Cúp Pha Lê FPT', 'https://cupphale.vn')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 6. DỰ TRÙ KINH PHÍ & THỰC CHI (budget_items, expenses, expense_receipts)
-- ----------------------------------------------------------------------------
-- Mùa 2025: có dự trù và thực chi đã APPROVED (phục vụ View dự toán tự động)
INSERT INTO budget_items (id, event_id, category_id, benchmark_id, item_name, quantity, unit, estimated_unit_price, notes, approval_status)
VALUES
    ('00000000-0000-4000-f000-000000000001', '00000000-0000-4000-c000-000000000001', '00000000-0000-4000-d000-000000000001', '00000000-0000-4000-e000-000000000001', 'Backdrop bạt Hiflex', 12.00, 'm2', 60000.00, 'Backdrop sân khấu hội trường Alpha mùa 2025', 'APPROVED'),
    ('00000000-0000-4000-f000-000000000002', '00000000-0000-4000-c000-000000000001', '00000000-0000-4000-d000-000000000002', '00000000-0000-4000-e000-000000000004', 'Nước suối đóng chai Aquafina 500ml', 15.00, 'Thùng 24 chai', 90000.00, 'Phục vụ 48h thi đấu mùa 2025', 'APPROVED'),
    ('00000000-0000-4000-f000-000000000003', '00000000-0000-4000-c000-000000000001', '00000000-0000-4000-d000-000000000003', '00000000-0000-4000-e000-000000000006', 'Kỷ niệm chương pha lê khắc laser', 5.00, 'Cái', 240000.00, 'Trao giải Nhất, Nhì, Ba và 2 giải triển vọng 2025', 'APPROVED'),
    -- Mùa 2026: Đang diễn ra
    ('00000000-0000-4000-f000-000000000004', '00000000-0000-4000-c000-000000000002', '00000000-0000-4000-d000-000000000001', '00000000-0000-4000-e000-000000000001', 'Backdrop bạt Hiflex', 15.00, 'm2', 65000.00, 'Backdrop sân khấu hội trường A2 mùa 2026', 'APPROVED'),
    ('00000000-0000-4000-f000-000000000005', '00000000-0000-4000-c000-000000000002', '00000000-0000-4000-d000-000000000001', '00000000-0000-4000-e000-000000000002', 'Standee chữ X (cả in + khung)', 4.00, 'Cái', 180000.00, 'Đặt tại sảnh đón khách và trước cửa phòng thi', 'APPROVED'),
    ('00000000-0000-4000-f000-000000000006', '00000000-0000-4000-c000-000000000002', '00000000-0000-4000-d000-000000000002', '00000000-0000-4000-e000-000000000004', 'Nước suối đóng chai Aquafina 500ml', 20.00, 'Thùng 24 chai', 95000.00, 'Nước uống tiếp sức cho các đội thi', 'APPROVED'),
    ('00000000-0000-4000-f000-000000000007', '00000000-0000-4000-c000-000000000002', '00000000-0000-4000-d000-000000000002', '00000000-0000-4000-e000-000000000005', 'Bánh ngọt Teabreak tự chọn', 80.00, 'Phần', 35000.00, 'Teabreak chiều ngày khai mạc', 'PENDING')
ON CONFLICT (id) DO NOTHING;

INSERT INTO expenses (id, event_id, budget_item_id, item_name, quantity, actual_unit_price, paid_by, status, payment_date, notes)
VALUES
    -- Thực chi mùa 2025
    ('00000000-0000-4000-1000-000000000001', '00000000-0000-4000-c000-000000000001', '00000000-0000-4000-f000-000000000001', 'In bạt backdrop sân khấu 2025', 12.00, 60000.00, '00000000-0000-4000-a000-000000000004', 'APPROVED', '2025-10-14', 'Đã chuyển khoản thanh toán cho nhà in Tân Triều'),
    ('00000000-0000-4000-1000-000000000002', '00000000-0000-4000-c000-000000000001', '00000000-0000-4000-f000-000000000002', 'Mua 15 thùng nước Aquafina 2025', 15.00, 90000.00, '00000000-0000-4000-a000-000000000004', 'APPROVED', '2025-10-15', 'Giao hàng tận nơi tại sảnh Alpha'),
    -- Thực chi mùa 2026
    ('00000000-0000-4000-1000-000000000003', '00000000-0000-4000-c000-000000000002', '00000000-0000-4000-f000-000000000004', 'In backdrop hội trường A2 mùa 2026', 15.00, 65000.00, '00000000-0000-4000-a000-000000000004', 'APPROVED', '2026-11-10', 'Đã nhận hàng và thi công khung bạt')
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_receipts (id, expense_id, receipt_code, image_url, supplier_name)
VALUES
    ('00000000-0000-4000-1100-000000000001', '00000000-0000-4000-1000-000000000001', 'INV-2025-001', 'receipts/2025/inv-backdrop-01.pdf', 'Công ty In ấn & Quảng cáo Sài Gòn'),
    ('00000000-0000-4000-1100-000000000002', '00000000-0000-4000-1000-000000000002', 'INV-2025-002', 'receipts/2025/inv-water-01.jpg', 'Đại lý Nước khoáng Lavie'),
    ('00000000-0000-4000-1100-000000000003', '00000000-0000-4000-1000-000000000003', 'INV-2026-001', 'receipts/2026/inv-backdrop-2026.png', 'Công ty In ấn Đại Nam')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 7. TÀI LIỆU SỰ KIỆN (event_documents)
-- ----------------------------------------------------------------------------
INSERT INTO event_documents (id, event_id, parent_document_id, doc_type, title, version, file_url, uploaded_by, status, approved_by, approved_at, rejection_reason)
VALUES
    ('00000000-0000-4000-2000-000000000001', '00000000-0000-4000-c000-000000000002', NULL, 'MASTER_PLAN', 'Đề án tổng thể F-Code Hackathon 2026', '1.0', 'documents/2026/master-plan-v1.pdf', '00000000-0000-4000-a000-000000000006', 'APPROVED', '00000000-0000-4000-a000-000000000001', '2026-10-20 14:00:00+07', NULL),
    ('00000000-0000-4000-2000-000000000002', '00000000-0000-4000-c000-000000000002', '00000000-0000-4000-2000-000000000001', 'MASTER_PLAN', 'Đề án tổng thể F-Code Hackathon 2026 (Cập nhật phòng thi)', '1.1', 'documents/2026/master-plan-v1.1.pdf', '00000000-0000-4000-a000-000000000006', 'DRAFT', NULL, NULL, NULL),
    ('00000000-0000-4000-2000-000000000003', '00000000-0000-4000-c000-000000000002', NULL, 'RUNNING_ORDER', 'Kịch bản chi tiết 48h thi đấu Hackathon', '1.0', 'documents/2026/running-order.pdf', '00000000-0000-4000-a000-000000000006', 'PENDING', NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 8. ẤN PHẨM TRUYỀN THÔNG & THIẾT KẾ (event_media_assets)
-- ----------------------------------------------------------------------------
INSERT INTO event_media_assets (id, event_id, asset_type, title, specifications, design_file_url, preview_image_url, is_printed, approval_status, approved_by)
VALUES
    ('00000000-0000-4000-3000-000000000001', '00000000-0000-4000-c000-000000000002', 'BACKDROP', 'Backdrop sân khấu chính Hackathon 2026', 'Kích thước 6m x 3m, bạt Hiflex viền xỏ que', 'https://www.figma.com/file/fcode-hackathon-2026', 'media/2026/backdrop-preview.png', TRUE, 'APPROVED', '00000000-0000-4000-a000-000000000001'),
    ('00000000-0000-4000-3000-000000000002', '00000000-0000-4000-c000-000000000002', 'POSTER', 'Poster truyền thông mở cổng đăng ký', 'Kích thước A2, in giấy C300 cán màng mờ', 'https://www.figma.com/file/fcode-hackathon-2026-poster', 'media/2026/poster-preview.jpg', TRUE, 'APPROVED', '00000000-0000-4000-a000-000000000001'),
    ('00000000-0000-4000-3000-000000000003', '00000000-0000-4000-c000-000000000002', 'BADGE', 'Thẻ đeo ban tổ chức và thí sinh', 'Thẻ nhựa PVC kèm dây đeo F-Code in chuyển nhiệt', 'https://www.figma.com/file/fcode-hackathon-2026-badge', 'media/2026/badge-preview.png', FALSE, 'PENDING', NULL)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 9. NHẬT KÝ SỰ CỐ & BÀI HỌC KINH NGHIỆM (event_incidents)
-- ----------------------------------------------------------------------------
INSERT INTO event_incidents (id, event_id, reported_by, title, severity, department_involved, incident_description, root_cause, immediate_solution, lesson_learned)
VALUES
    ('00000000-0000-4000-4000-000000000001', '00000000-0000-4000-c000-000000000001', '00000000-0000-4000-a000-000000000002', 
     'Mất kết nối mạng Wi-Fi khu vực thi đấu', 'HIGH', ARRAY['PLAN']::department_enum[], 
     'Vào lúc 14:00 ngày thi thứ nhất, hệ thống mạng Wi-Fi hội trường bị nghẽn do hơn 150 thiết bị truy cập đồng thời.', 
     'Chưa phối hợp trước với phòng IT trường để cấp băng thông chuyên dụng và cấu hình router chịu tải cao.', 
     'Chuyển ngay sang 2 bộ phát 4G/5G dự phòng của ban hậu cần và kết nối dây LAN cho các đội trưởng.', 
     'Từ mùa sau phải đăng ký IP tĩnh và hệ thống mạng dây chuyên dụng với IT FPTU trước 1 tuần.')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 10. FAQ & KHẢO SÁT ĐÁNH GIÁ (event_faqs & event_feedbacks)
-- ----------------------------------------------------------------------------
INSERT INTO event_faqs (id, series_id, question, answer, category, is_pinned)
VALUES
    ('00000000-0000-4000-5000-000000000001', '00000000-0000-4000-b000-000000000001', 'Mỗi đội thi Hackathon được có tối đa bao nhiêu thành viên?', 'Mỗi đội tham gia từ 3 đến 5 thành viên. Sinh viên có thể ghép đội tự do giữa các khóa K18, K19, K20.', 'Đăng ký & Thể lệ', TRUE),
    ('00000000-0000-4000-5000-000000000002', '00000000-0000-4000-b000-000000000001', 'Thí sinh có được sử dụng các framework và thư viện mã nguồn mở có sẵn không?', 'Được phép sử dụng thư viện công khai, tuy nhiên toàn bộ code nghiệp vụ chính của đề tài phải được viết trong 48h thi đấu.', 'Kỹ thuật', FALSE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO event_feedbacks (id, event_id, source_type, file_url, rating_score, highlight_content, improvement_content, custom_responses)
VALUES
    ('00000000-0000-4000-6000-000000000001', '00000000-0000-4000-c000-000000000001', 'ATTENDEE', 'feedbacks/2025/fb-01.json', 5, 
     'Đề bài rất thực tế và mentor hỗ trợ cực kỳ nhiệt tình, đồ ăn teabreak ngon.', 
     'Nên bố trí thêm chỗ sạc pin và nghỉ ngơi ban đêm cho các đội ở lại thức khuya.', 
     '{"organization_score": 5, "facility_score": 4, "mentor_score": 5}'::jsonb),
    ('00000000-0000-4000-6000-000000000002', '00000000-0000-4000-c000-000000000001', 'ORGANIZER', 'feedbacks/2025/fb-02.json', 4, 
     'Các ban phối hợp nhịp nhàng, đúng tiến độ theo kịch bản.', 
     'Cần phân công ca trực rõ ràng hơn để tránh việc một số bạn bị quá tải vào đêm thứ hai.', 
     '{"organization_score": 4, "teamwork_score": 5}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 11. BÁO CÁO AI TỔNG HỢP FEEDBACK (event_feedback_ai_reports)
-- ----------------------------------------------------------------------------
INSERT INTO event_feedback_ai_reports (
    id, event_id, model_used, model_tier, feedback_count_snapshot, latest_feedback_at_snapshot,
    average_rating_snapshot, executive_summary, sentiment_breakdown, top_highlights,
    top_improvements, department_actions, suggested_incidents
)
VALUES (
    '00000000-0000-4000-7000-000000000001', '00000000-0000-4000-c000-000000000001', 'gemini-1.5-flash', 'FAST',
    2, '2025-10-18 20:00:00+07', 4.50,
    'Sự kiện F-Code Hackathon 2025 đạt điểm hài lòng trung bình 4.5/5.0. Điểm sáng lớn nhất là chất lượng chuyên môn đề thi và sự hỗ trợ tận tâm của đội ngũ mentor. Điểm cần khắc phục cho các mùa sau là cơ sở vật chất khu vực nghỉ ngơi và bố trí ca trực hợp lý cho BTC.',
    '{"positive": 85, "neutral": 10, "negative": 5}'::jsonb,
    '["Mentor chuyên môn hỗ trợ nhiệt tình", "Đề bài mang tính ứng dụng cao", "Teabreak chu đáo"]'::jsonb,
    '["Cần thêm ổ cắm điện và khu nghỉ ngơi đêm", "Phân ca trực cụ thể tránh quá tải"]'::jsonb,
    '[{"department": "PLAN", "action": "Xây dựng phương án ca trực rõ ràng cho đêm 2"}, {"department": "HR", "action": "Bố trí thêm khu vực nghỉ ngơi và sạc pin"}]'::jsonb,
    '[]'::jsonb
)
ON CONFLICT (id) DO NOTHING;
