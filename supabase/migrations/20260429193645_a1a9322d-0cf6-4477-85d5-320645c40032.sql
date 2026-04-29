-- Drop old tables
DROP TABLE IF EXISTS public.wallet_transactions CASCADE;
DROP TABLE IF EXISTS public.campaigns CASCADE;
DROP TABLE IF EXISTS public.servers CASCADE;

-- Update profiles: remove balance, add discord fields
ALTER TABLE public.profiles DROP COLUMN IF EXISTS balance;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS discord_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS discord_username TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS discord_access_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS discord_refresh_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS discord_token_expires_at TIMESTAMPTZ;

-- discord_servers: real servers connected via Discord OAuth
CREATE TABLE public.discord_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guild_id TEXT NOT NULL,
  name TEXT NOT NULL,
  icon_url TEXT,
  default_channel_id TEXT,
  default_channel_name TEXT,
  member_count INTEGER DEFAULT 0,
  bot_in_server BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, guild_id)
);

ALTER TABLE public.discord_servers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own discord_servers" ON public.discord_servers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own discord_servers" ON public.discord_servers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own discord_servers" ON public.discord_servers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own discord_servers" ON public.discord_servers FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER discord_servers_updated_at BEFORE UPDATE ON public.discord_servers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- campaigns: messages to send via bot
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  server_id UUID REFERENCES public.discord_servers(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  image_url TEXT,
  embed_color TEXT DEFAULT '#5865F2',
  channel_id TEXT,
  channel_name TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own campaigns" ON public.campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own campaigns" ON public.campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own campaigns" ON public.campaigns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own campaigns" ON public.campaigns FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER campaigns_updated_at BEFORE UPDATE ON public.campaigns
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Update handle_new_user to no longer reference welcome credit
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'user_name',
      split_part(NEW.email, '@', 1),
      'Usuário'
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $function$;

-- Make sure the trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();