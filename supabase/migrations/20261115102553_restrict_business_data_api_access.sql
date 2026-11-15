-- Dữ liệu nghiệp vụ chỉ đi qua Spring Boot. Supabase Auth ở frontend vẫn hoạt động
-- vì các quyền dưới đây chỉ áp dụng cho các đối tượng nghiệp vụ trong public.
-- Liệt kê rõ đối tượng để không thay đổi quyền của bảng/hàm do extension quản lý.
-- Lặp lại 4 bảng Member/Event vì môi trường chung có thể chưa áp migration Auth.
REVOKE ALL ON TABLE
    public.club_members,
    public.event_series,
    public.events,
    public.event_organizers,
    public.event_documents,
    public.event_media_assets,
    public.budget_categories,
    public.item_price_benchmarks,
    public.budget_items,
    public.expenses,
    public.expense_receipts,
    public.event_incidents,
    public.event_faqs,
    public.event_feedbacks,
    public.event_feedback_ai_reports,
    public.v_event_budget_summary,
    public.v_projected_budget_from_previous_season
FROM PUBLIC, anon, authenticated;

-- RLS là lớp phòng vệ thứ hai nếu một quyền SELECT/WRITE được cấp lại về sau.
-- Không tạo policy cho anon/authenticated: hai vai trò này không truy cập trực tiếp.
-- Backend kết nối JDBC bằng DB role (cấu hình mẫu hiện dùng postgres), không dùng JWT role ở đây.
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_organizers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_price_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_feedback_ai_reports ENABLE ROW LEVEL SECURITY;

-- PostgreSQL 15+: view chạy với quyền của người gọi, không mượn quyền owner
-- để vượt qua RLS nếu view vô tình được cấp quyền trực tiếp trong tương lai.
ALTER VIEW public.v_event_budget_summary SET (security_invoker = true);
ALTER VIEW public.v_projected_budget_from_previous_season SET (security_invoker = true);

-- Supabase từng tự cấp quyền cho bảng/sequence/function mới do postgres tạo.
-- Đổi mặc định để các migration sau phải cấp quyền Data API một cách chủ đích.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

-- Quyền EXECUTE của function mới còn được PostgreSQL cấp cho PUBLIC ở mức global.
-- Lệnh này chỉ ảnh hưởng function tạo SAU migration; hàm phục vụ Auth/RLS mới
-- cần GRANT EXECUTE rõ ràng cho vai trò thực sự gọi nó.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
    REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
