-- Đặc tả hệ thống §5.1: trình duyệt truy cập dữ liệu nghiệp vụ qua Spring.
ALTER TABLE public.club_members
    ADD COLUMN auth_user_id UUID UNIQUE REFERENCES auth.users (id) ON DELETE SET NULL;

-- Dừng migration nếu email hoặc MSSV hiện có bị trùng khi so sánh không phân biệt hoa thường.
CREATE UNIQUE INDEX uq_club_members_email_ci ON public.club_members (lower(email));
CREATE UNIQUE INDEX uq_club_members_student_id_ci ON public.club_members (lower(student_id));

REVOKE ALL ON TABLE
    public.club_members, public.event_series, public.events, public.event_organizers,
    public.event_documents, public.event_media_assets, public.event_incidents,
    public.event_faqs, public.event_feedbacks, public.budget_categories,
    public.item_price_benchmarks, public.budget_items, public.expenses, public.expense_receipts,
    public.v_event_budget_summary, public.v_projected_budget_from_previous_season
FROM PUBLIC, anon, authenticated;

ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_organizers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_price_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_receipts ENABLE ROW LEVEL SECURITY;
