CREATE TABLE public.pending_deposits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  reference text NOT NULL UNIQUE,
  paradise_transaction_id text,
  coins integer NOT NULL,
  amount_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  qr_code text,
  qr_code_base64 text,
  expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pending_deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own deposits"
ON public.pending_deposits FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_pending_deposits_user ON public.pending_deposits(user_id, created_at DESC);
CREATE INDEX idx_pending_deposits_reference ON public.pending_deposits(reference);

CREATE TRIGGER pending_deposits_updated_at
BEFORE UPDATE ON public.pending_deposits
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();