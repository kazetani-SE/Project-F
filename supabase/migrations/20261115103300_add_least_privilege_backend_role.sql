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
