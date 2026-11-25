-- ============================================================================
-- Project F — Amazon RDS PostgreSQL & AWS Cognito Account Linking Functions
-- Chạy script này trên Amazon RDS PostgreSQL (`project_f_db`) để các hàm
-- `projectf_private.*` hoạt động độc lập mà không phụ thuộc vào bảng
-- `auth.users` của Supabase.
-- ============================================================================

-- 1. Nếu bảng `club_members` trên RDS trước đó có khóa ngoại trỏ vào `auth.users`,
-- gỡ bỏ khóa ngoại đó để lưu trực tiếp Cognito User `sub` (UUID):
ALTER TABLE public.club_members
    DROP CONSTRAINT IF EXISTS club_members_auth_user_id_fkey;

-- 2. Khởi tạo schema bảo mật nội bộ cho Backend:
CREATE SCHEMA IF NOT EXISTS projectf_private;

-- 3. Tìm `auth_user_id` đã liên kết theo email thành viên:
CREATE OR REPLACE FUNCTION projectf_private.find_confirmed_auth_user_id(member_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT member.auth_user_id
    FROM public.club_members AS member
    WHERE lower(member.email) = lower(btrim($1))
      AND member.auth_user_id IS NOT NULL
    LIMIT 1
$$;

-- 4. Liên kết lần đầu (Claim Account) khi thành viên đăng nhập bằng email đã được AWS Cognito xác thực:
CREATE OR REPLACE FUNCTION projectf_private.claim_club_member_account(auth_user_id uuid, member_email text)
RETURNS integer
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
    WITH linked AS (
        UPDATE public.club_members AS member
        SET auth_user_id = $1
        WHERE lower(member.email) = lower(btrim($2))
          AND member.is_active = true
          AND member.auth_user_id IS NULL
          AND NOT EXISTS (
              SELECT 1
              FROM public.club_members AS other
              WHERE other.auth_user_id = $1
          )
        RETURNING 1
    )
    SELECT count(*)::integer FROM linked
$$;

-- 5. Liên kết `auth_user_id` khi Ban Chủ nhiệm cấp phát tài khoản Cognito mới cho thành viên:
CREATE OR REPLACE FUNCTION projectf_private.link_club_member_auth_if_absent(member_id uuid, auth_user_id uuid)
RETURNS integer
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
    WITH linked AS (
        UPDATE public.club_members AS member
        SET auth_user_id = $2
        WHERE member.id = $1
          AND member.auth_user_id IS NULL
          AND NOT EXISTS (
              SELECT 1
              FROM public.club_members AS other
              WHERE other.auth_user_id = $2
                AND other.id <> $1
          )
        RETURNING 1
    )
    SELECT count(*)::integer FROM linked
$$;
