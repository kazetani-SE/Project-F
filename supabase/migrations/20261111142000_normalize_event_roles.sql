-- Các giá trị cũ mô tả loại tài liệu, không xác định được chức vụ BTC tương ứng.
-- Hạ toàn bộ phân công hiện có về MEMBER để Ban Chủ nhiệm phân công lại theo quyền mới.
CREATE TYPE public.event_role_enum_next AS ENUM ('LEAD_HEADER', 'HR', 'PLAN', 'MEDIA', 'MEMBER');

ALTER TABLE public.event_organizers ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.event_organizers
    ALTER COLUMN role TYPE public.event_role_enum_next
    USING 'MEMBER'::public.event_role_enum_next;

DROP TYPE public.event_role_enum;
ALTER TYPE public.event_role_enum_next RENAME TO event_role_enum;
ALTER TABLE public.event_organizers ALTER COLUMN role SET DEFAULT 'MEMBER'::public.event_role_enum;
