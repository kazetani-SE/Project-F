-- Role dành riêng cho Spring Boot; NOLOGIN cho tới khi quản trị viên đặt
-- mật khẩu qua kênh bí mật. Không ghi mật khẩu vào Git hoặc migration.
CREATE ROLE projectf_app NOLOGIN NOINHERIT NOBYPASSRLS;

GRANT USAGE ON SCHEMA public TO projectf_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
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
    public.event_feedback_ai_reports
TO projectf_app;

GRANT SELECT ON TABLE
    public.v_event_budget_summary,
    public.v_projected_budget_from_previous_season
TO projectf_app;

-- JDBC không mang JWT của từng request vào PostgreSQL. Chỉ backend role được
-- thao tác mọi hàng; Spring Security vẫn phải xác minh JWT và RBAC trước đó.
CREATE POLICY projectf_app_access ON public.club_members
    FOR ALL TO projectf_app USING (true) WITH CHECK (true);
CREATE POLICY projectf_app_access ON public.event_series
    FOR ALL TO projectf_app USING (true) WITH CHECK (true);
CREATE POLICY projectf_app_access ON public.events
    FOR ALL TO projectf_app USING (true) WITH CHECK (true);
CREATE POLICY projectf_app_access ON public.event_organizers
    FOR ALL TO projectf_app USING (true) WITH CHECK (true);
CREATE POLICY projectf_app_access ON public.event_documents
    FOR ALL TO projectf_app USING (true) WITH CHECK (true);
CREATE POLICY projectf_app_access ON public.event_media_assets
    FOR ALL TO projectf_app USING (true) WITH CHECK (true);
CREATE POLICY projectf_app_access ON public.budget_categories
    FOR ALL TO projectf_app USING (true) WITH CHECK (true);
CREATE POLICY projectf_app_access ON public.item_price_benchmarks
    FOR ALL TO projectf_app USING (true) WITH CHECK (true);
CREATE POLICY projectf_app_access ON public.budget_items
    FOR ALL TO projectf_app USING (true) WITH CHECK (true);
CREATE POLICY projectf_app_access ON public.expenses
    FOR ALL TO projectf_app USING (true) WITH CHECK (true);
CREATE POLICY projectf_app_access ON public.expense_receipts
    FOR ALL TO projectf_app USING (true) WITH CHECK (true);
CREATE POLICY projectf_app_access ON public.event_incidents
    FOR ALL TO projectf_app USING (true) WITH CHECK (true);
CREATE POLICY projectf_app_access ON public.event_faqs
    FOR ALL TO projectf_app USING (true) WITH CHECK (true);
CREATE POLICY projectf_app_access ON public.event_feedbacks
    FOR ALL TO projectf_app USING (true) WITH CHECK (true);
CREATE POLICY projectf_app_access ON public.event_feedback_ai_reports
    FOR ALL TO projectf_app USING (true) WITH CHECK (true);

-- Supabase khóa schema auth và bật RLS cho auth.users. Role JDBC không đọc
-- trực tiếp bảng này; các hàm chỉ kiểm tra email đã xác nhận và liên kết
-- đúng hồ sơ CLB. Schema riêng không được expose qua Data API.
CREATE SCHEMA IF NOT EXISTS projectf_private;
REVOKE ALL ON SCHEMA projectf_private FROM PUBLIC;
GRANT USAGE ON SCHEMA projectf_private TO projectf_app;

CREATE FUNCTION projectf_private.find_confirmed_auth_user_id(member_email text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
    SELECT auth_user.id FROM auth.users AS auth_user
    WHERE lower(auth_user.email) = lower($1)
      AND auth_user.email_confirmed_at IS NOT NULL
    LIMIT 1
$$;

CREATE FUNCTION projectf_private.claim_club_member_account(auth_user_id uuid, member_email text)
RETURNS integer LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
    WITH linked AS (
        UPDATE public.club_members AS member SET auth_user_id = $1
        WHERE lower(member.email) = lower($2)
          AND member.is_active AND member.auth_user_id IS NULL
          AND EXISTS (
              SELECT 1 FROM auth.users AS auth_user
              WHERE auth_user.id = $1 AND lower(auth_user.email) = lower($2)
                AND auth_user.email_confirmed_at IS NOT NULL
          )
        RETURNING 1
    )
    SELECT count(*)::integer FROM linked
$$;

CREATE FUNCTION projectf_private.link_club_member_auth_if_absent(member_id uuid, auth_user_id uuid)
RETURNS integer LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
    WITH linked AS (
        UPDATE public.club_members AS member SET auth_user_id = $2
        WHERE member.id = $1 AND member.auth_user_id IS NULL
          AND EXISTS (
              SELECT 1 FROM auth.users AS auth_user
              WHERE auth_user.id = $2 AND lower(auth_user.email) = lower(member.email)
                AND auth_user.email_confirmed_at IS NOT NULL
          )
        RETURNING 1
    )
    SELECT count(*)::integer FROM linked
$$;

REVOKE ALL ON FUNCTION projectf_private.find_confirmed_auth_user_id(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION projectf_private.claim_club_member_account(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION projectf_private.link_club_member_auth_if_absent(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION projectf_private.find_confirmed_auth_user_id(text) TO projectf_app;
GRANT EXECUTE ON FUNCTION projectf_private.claim_club_member_account(uuid, text) TO projectf_app;
GRANT EXECUTE ON FUNCTION projectf_private.link_club_member_auth_if_absent(uuid, uuid) TO projectf_app;
