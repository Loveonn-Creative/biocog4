-- Enable real-time for profiles and subscriptions tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;

-- Add role and data_consent columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS data_consent boolean DEFAULT false;