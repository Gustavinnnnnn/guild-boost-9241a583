-- 1) Enum de papéis
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Tabela de papéis (separada do profiles!)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3) Função security-definer para checar role (evita recursão em RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4) Policies da tabela user_roles
DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;
CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all roles" ON public.user_roles;
CREATE POLICY "Admins view all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5) Marcar o admin (sevencasado454545@gmail.com)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users
WHERE lower(email) = lower('sevencasado454545@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

-- 6) Zerar créditos vazados (modo teste antigo)
UPDATE public.profiles SET credits = 0 WHERE credits > 0
  AND id NOT IN (
    SELECT DISTINCT user_id FROM public.pending_deposits WHERE status = 'paid'
  );

-- 7) Auditoria: registrar o ajuste
INSERT INTO public.credit_transactions (user_id, amount, type, description, balance_after)
SELECT id, -299, 'admin_adjustment', 'Ajuste: créditos do modo teste removidos (sem pagamento)', 0
FROM public.profiles WHERE id = 'ebdc685d-e0ab-4248-bbde-2de5d3d5b065';

-- 8) Permitir que admin veja TUDO (campaigns, profiles, transactions, deliveries, deposits)
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
CREATE POLICY "Admins view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins view all campaigns" ON public.campaigns;
CREATE POLICY "Admins view all campaigns" ON public.campaigns
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins view all transactions" ON public.credit_transactions;
CREATE POLICY "Admins view all transactions" ON public.credit_transactions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins view all deliveries" ON public.campaign_deliveries;
CREATE POLICY "Admins view all deliveries" ON public.campaign_deliveries
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins view all deposits" ON public.pending_deposits;
CREATE POLICY "Admins view all deposits" ON public.pending_deposits
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));