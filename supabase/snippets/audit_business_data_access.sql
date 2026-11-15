-- Chạy trong SQL Editor hoặc psql trước/sau migration bảo vệ Data API.
-- Truy vấn đầu mong đợi 0 dòng; truy vấn cuối hiển thị role backend.
-- Chỉ đọc catalog, không đổi dữ liệu.
WITH business_objects(name, is_view) AS (
    VALUES
        ('club_members', false),
        ('event_series', false),
        ('events', false),
        ('event_organizers', false),
        ('event_documents', false),
        ('event_media_assets', false),
        ('budget_categories', false),
        ('item_price_benchmarks', false),
        ('budget_items', false),
        ('expenses', false),
        ('expense_receipts', false),
        ('event_incidents', false),
        ('event_faqs', false),
        ('event_feedbacks', false),
        ('event_feedback_ai_reports', false),
        ('v_event_budget_summary', true),
        ('v_projected_budget_from_previous_season', true)
), objects AS (
    SELECT b.name, b.is_view, c.oid, c.relrowsecurity, c.reloptions
    FROM business_objects b
    LEFT JOIN pg_namespace n ON n.nspname = 'public'
    LEFT JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = b.name
), checks AS (
    SELECT name,
           CASE
               WHEN oid IS NULL THEN 'MISSING_OBJECT'
               WHEN has_table_privilege('anon', oid, 'SELECT')
                 OR has_table_privilege('anon', oid, 'INSERT')
                 OR has_table_privilege('anon', oid, 'UPDATE')
                 OR has_table_privilege('anon', oid, 'DELETE')
                 OR has_table_privilege('authenticated', oid, 'SELECT')
                 OR has_table_privilege('authenticated', oid, 'INSERT')
                 OR has_table_privilege('authenticated', oid, 'UPDATE')
                 OR has_table_privilege('authenticated', oid, 'DELETE')
                   THEN 'DATA_API_ROLE_HAS_ACCESS'
               WHEN NOT is_view AND NOT relrowsecurity THEN 'RLS_DISABLED'
               WHEN is_view AND NOT COALESCE('security_invoker=true' = ANY(reloptions), false)
                   THEN 'VIEW_NOT_SECURITY_INVOKER'
               WHEN NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'projectf_app')
                   THEN 'BACKEND_ROLE_MISSING'
               WHEN NOT has_table_privilege('projectf_app', oid, 'SELECT')
                   THEN 'BACKEND_ROLE_CANNOT_READ'
               WHEN NOT is_view AND (
                    NOT has_table_privilege('projectf_app', oid, 'INSERT')
                 OR NOT has_table_privilege('projectf_app', oid, 'UPDATE')
                 OR NOT has_table_privilege('projectf_app', oid, 'DELETE'))
                   THEN 'BACKEND_ROLE_CANNOT_WRITE'
           END AS problem
    FROM objects
)
SELECT name, problem
FROM checks
WHERE problem IS NOT NULL
ORDER BY name;

-- Role backend không được vượt RLS, đồng thời không được cấp cho authenticator.
SELECT rolname, rolbypassrls, rolcanlogin
FROM pg_roles
WHERE rolname = 'projectf_app';
