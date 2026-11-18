-- Liên kết Supabase Auth với hồ sơ thành viên CLB của Task 1.
ALTER TABLE public.club_members
    ADD COLUMN auth_user_id UUID UNIQUE REFERENCES auth.users (id) ON DELETE SET NULL;

-- Dừng migration nếu email hoặc MSSV hiện có bị trùng khi so sánh không phân biệt hoa thường.
CREATE UNIQUE INDEX uq_club_members_email_ci ON public.club_members (lower(email));
CREATE UNIQUE INDEX uq_club_members_student_id_ci ON public.club_members (lower(student_id));

REVOKE ALL ON TABLE
    public.club_members, public.event_series, public.events, public.event_organizers
FROM PUBLIC, anon, authenticated;

ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_organizers ENABLE ROW LEVEL SECURITY;
