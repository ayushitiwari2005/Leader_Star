-- ========================================================
-- BIZZNNOVATE Leaderboard — Complete Database Setup Script
-- Run this in your Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New Query -> Paste & Run
-- ========================================================

-- 1. ENUMS & ROLES
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- is_admin function: Checks if authenticated user has confirmed their email
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM auth.users WHERE id = _user_id AND email_confirmed_at IS NOT NULL)
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Users can read their own roles" ON public.user_roles;
CREATE POLICY "Users can read their own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Super admins can manage roles" ON public.user_roles;
CREATE POLICY "Super admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 2. TEAMS TABLE
CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_code text NOT NULL UNIQUE,
  name text NOT NULL,
  theme text NOT NULL DEFAULT 'Food & Nutrition',
  members_count int NOT NULL DEFAULT 4,
  acquired_business text,
  initial_capital numeric NOT NULL DEFAULT 10000000,
  current_capital numeric NOT NULL DEFAULT 10000000,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.teams TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view teams" ON public.teams;
CREATE POLICY "Anyone can view teams" ON public.teams FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage teams" ON public.teams;
CREATE POLICY "Admins can manage teams" ON public.teams FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE UNIQUE INDEX IF NOT EXISTS teams_name_lower_key ON public.teams (lower(btrim(name)));

-- 3. ACTIVITIES TABLE
CREATE TABLE IF NOT EXISTS public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  day int NOT NULL DEFAULT 1,
  max_score int NOT NULL DEFAULT 100,
  weight numeric NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'upcoming',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.activities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;
GRANT ALL ON public.activities TO service_role;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view activities" ON public.activities;
CREATE POLICY "Anyone can view activities" ON public.activities FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage activities" ON public.activities;
CREATE POLICY "Admins can manage activities" ON public.activities FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 4. SCORES TABLE
CREATE TABLE IF NOT EXISTS public.scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  points numeric NOT NULL DEFAULT 0 CONSTRAINT scores_points_nonnegative CHECK (points >= 0),
  remarks text,
  entered_by uuid,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, activity_id)
);
GRANT SELECT ON public.scores TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scores TO authenticated;
GRANT ALL ON public.scores TO service_role;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view scores" ON public.scores;
CREATE POLICY "Anyone can view scores" ON public.scores FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage scores" ON public.scores;
CREATE POLICY "Admins can manage scores" ON public.scores FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 5. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  old_value jsonb,
  new_value jsonb,
  performed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can add audit logs" ON public.audit_logs;
CREATE POLICY "Admins can add audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON public.audit_logs (entity_type, created_at DESC);

-- 6. REALTIME SUBSCRIPTIONS
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.scores;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 7. SEED DATA (ACTIVITIES)
INSERT INTO public.activities (name, description, day, max_score, weight, status, sort_order) VALUES
  ('Workforce Wars', 'Organisational and people-management challenge', 1, 100, 1, 'completed', 1),
  ('TechSprint', 'Business + technology challenge', 1, 100, 1, 'completed', 2),
  ('Brand Blitz', 'Marketing and advertising challenge', 1, 100, 1, 'live', 3),
  ('SurviveX', 'Crisis-management challenge', 1, 100, 1, 'upcoming', 4),
  ('Capital Clash', 'Continuous fundraising and investment simulation', 1, 100, 1, 'upcoming', 5),
  ('The Boardroom', 'Final business defence challenge', 2, 150, 1.5, 'upcoming', 6),
  ('Viral Vault', 'Digital and social media visibility challenge', 2, 100, 1, 'upcoming', 7),
  ('E-Sports', 'Fun and sportsmanship element', 2, 50, 0.5, 'upcoming', 8)
ON CONFLICT (name) DO NOTHING;

-- 8. SEED DATA (TEAMS)
INSERT INTO public.teams (team_code, name, theme, members_count, initial_capital, current_capital) VALUES
  ('T01','Apex Vitals','Health & Fitness',5,10000000,21100000),
  ('T02','NutriForge','Food & Nutrition',4,10000000,18400000),
  ('T03','Loom & Line','Fashion & Lifestyle',5,10000000,16200000),
  ('T04','GreenCartel','Food & Nutrition',4,10000000,15500000),
  ('T05','Pulse & Plate','Health & Fitness',5,10000000,14900000),
  ('T06','Thread Theory','Fashion & Lifestyle',4,10000000,14100000),
  ('T07','MacroMinds','Food & Nutrition',5,10000000,13600000),
  ('T08','Vitality Labs','Health & Fitness',4,10000000,13000000),
  ('T09','Silk Signal','Fashion & Lifestyle',5,10000000,12400000),
  ('T10','Calorie Capital','Food & Nutrition',4,10000000,11800000),
  ('T11','Form & Function','Health & Fitness',5,10000000,11200000),
  ('T12','The Daily Dose','Food & Nutrition',4,10000000,10700000),
  ('T13','Warp Wardrobe','Fashion & Lifestyle',5,10000000,10100000),
  ('T14','Protein Pursuit','Health & Fitness',4,10000000,9600000),
  ('T15','Stitch Studio','Fashion & Lifestyle',5,10000000,9100000),
  ('T16','TerraBite','Food & Nutrition',4,10000000,8800000),
  ('T17','FlexFuel','Health & Fitness',5,10000000,8500000),
  ('T18','Velvet Circuit','Fashion & Lifestyle',4,10000000,8200000),
  ('T19','Harvest Hustle','Food & Nutrition',5,10000000,7900000),
  ('T20','Cardio Cartel','Health & Fitness',4,10000000,7600000),
  ('T21','Drape Dynamics','Fashion & Lifestyle',5,10000000,7300000),
  ('T22','Grain Gain','Food & Nutrition',4,10000000,7000000),
  ('T23','Zenith Fitness','Health & Fitness',5,10000000,6700000),
  ('T24','Couture Code','Fashion & Lifestyle',4,10000000,6400000),
  ('T25','SnackStack','Food & Nutrition',5,10000000,6100000),
  ('T26','IronPulse','Health & Fitness',4,10000000,5800000),
  ('T27','Runway Republic','Fashion & Lifestyle',5,10000000,5500000),
  ('T28','FarmFresh Formula','Food & Nutrition',4,10000000,5200000),
  ('T29','Muscle Metrics','Health & Fitness',5,10000000,4900000),
  ('T30','Vogue Venture','Fashion & Lifestyle',4,10000000,4600000)
ON CONFLICT (team_code) DO NOTHING;

-- 9. SEED DATA (SCORES)
INSERT INTO public.scores (team_id, activity_id, points, remarks)
SELECT t.id, a.id, s.points, 'Seeded demo score'
FROM (VALUES
  ('T01',1,92),('T01',2,88),('T01',3,90),
  ('T02',1,85),('T02',2,90),('T02',3,84),
  ('T03',1,88),('T03',2,82),('T03',3,86),
  ('T04',1,80),('T04',2,84),('T04',3,82),
  ('T05',1,83),('T05',2,79),('T05',3,80),
  ('T06',1,78),('T06',2,81),('T06',3,79),
  ('T07',1,76),('T07',2,77),('T07',3,78),
  ('T08',1,74),('T08',2,76),('T08',3,75),
  ('T09',1,72),('T09',2,74),('T09',3,73),
  ('T10',1,70),('T10',2,72),('T10',3,71),
  ('T11',1,68),('T11',2,70),('T11',3,69),
  ('T12',1,66),('T12',2,68),('T12',3,67),
  ('T13',1,64),('T13',2,66),('T13',3,65),
  ('T14',1,62),('T14',2,64),('T14',3,63),
  ('T15',1,60),('T15',2,62),('T15',3,61),
  ('T16',1,58),('T16',2,60),('T16',3,59),
  ('T17',1,56),('T17',2,58),('T17',3,57),
  ('T18',1,54),('T18',2,56),('T18',3,55),
  ('T19',1,52),('T19',2,54),('T19',3,53),
  ('T20',1,50),('T20',2,52),('T20',3,51),
  ('T21',1,48),('T21',2,50),('T21',3,49),
  ('T22',1,46),('T22',2,48),('T22',3,47),
  ('T23',1,44),('T23',2,46),('T23',3,45),
  ('T24',1,42),('T24',2,44),('T24',3,43),
  ('T25',1,40),('T25',2,42),('T25',3,41),
  ('T26',1,38),('T26',2,40),('T26',3,39),
  ('T27',1,36),('T27',2,38),('T27',3,37),
  ('T28',1,34),('T28',2,36),('T28',3,35),
  ('T29',1,32),('T29',2,34),('T29',3,33),
  ('T30',1,30),('T30',2,32),('T30',3,31)
) AS s(team_code, act_order, points)
JOIN public.teams t ON t.team_code = s.team_code
JOIN public.activities a ON a.sort_order = s.act_order
ON CONFLICT (team_id, activity_id) DO NOTHING;
