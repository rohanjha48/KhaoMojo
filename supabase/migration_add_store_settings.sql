-- ==========================================================
-- KhaoMojo Supabase Migration: Add store_settings Table
-- Run this script in your Supabase Dashboard SQL Editor
-- ==========================================================

-- 1. Create table store_settings
CREATE TABLE IF NOT EXISTS public.store_settings (
    id INT PRIMARY KEY,
    is_open BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Insert single row with id = 1
INSERT INTO public.store_settings (id, is_open)
VALUES (1, true)
ON CONFLICT (id) DO NOTHING;

-- 3. Row Level Security & Permissions
GRANT ALL ON TABLE public.store_settings TO anon, authenticated;

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Allow anon and authenticated users to select store_settings
CREATE POLICY "Allow anon and authenticated select store_settings"
    ON public.store_settings FOR SELECT
    TO anon, authenticated
    USING (true);

-- Allow anon and authenticated users to update store_settings
CREATE POLICY "Allow anon and authenticated update store_settings"
    ON public.store_settings FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 4. Enable Realtime Replication for store_settings
ALTER TABLE public.store_settings REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'store_settings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.store_settings;
    END IF;
END $$;
