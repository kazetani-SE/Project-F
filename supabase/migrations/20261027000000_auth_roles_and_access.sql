-- Review and apply with Supabase CLI after deploying the matching backend.
-- Existing organizer roles in the original enum are document types, not RBAC roles.
CREATE TYPE event_role_enum_new AS ENUM (
  'HEAD_ORGANIZER', 'VICE_ORGANIZER', 'LEAD_FINANCE', 'LEAD_LOGISTICS',
  'LEAD_MEDIA', 'LEAD_CONTENT', 'LEAD_EXTERNAL', 'MEMBER'
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.event_organizers LIMIT 1) THEN
    RAISE EXCEPTION 'Map existing organizer roles before replacing event_role_enum';
  END IF;
END $$;

ALTER TABLE public.event_organizers ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.event_organizers ALTER COLUMN role TYPE event_role_enum_new
  USING 'MEMBER'::event_role_enum_new;
ALTER TABLE public.event_organizers ALTER COLUMN role SET DEFAULT 'MEMBER'::event_role_enum_new;
DROP TYPE event_role_enum;
ALTER TYPE event_role_enum_new RENAME TO event_role_enum;

ALTER TABLE public.club_members ADD COLUMN auth_user_id UUID UNIQUE;
CREATE INDEX idx_club_members_auth_user_id ON public.club_members(auth_user_id);

-- The browser uses Supabase only for Auth. Business data goes through the backend.
-- The backend's trusted PostgreSQL connection retains access.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;

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
DO $$ BEGIN
  IF to_regclass('public.flyway_schema_history') IS NOT NULL THEN
    ALTER TABLE public.flyway_schema_history ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
