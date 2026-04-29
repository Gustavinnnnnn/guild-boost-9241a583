-- Volta a tratar `profiles.credits` como COINS (1 coin = 10 DMs)
ALTER TABLE public.profiles ALTER COLUMN credits SET DEFAULT 50;

-- Reverte saldos que foram multiplicados por 100 na migration anterior
UPDATE public.profiles SET credits = credits / 100 WHERE credits >= 1000 AND credits % 100 = 0;