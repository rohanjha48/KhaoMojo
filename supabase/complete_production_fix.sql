-- ==========================================================
-- KhaoMojo Supabase Production Fix Migration
-- Run this in your Supabase Dashboard -> SQL Editor
-- ==========================================================

-- 1. Ensure Table: store_settings exists with id=1
CREATE TABLE IF NOT EXISTS public.store_settings (
    id INT PRIMARY KEY,
    is_open BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert row with id=1 defaulting to closed (false)
INSERT INTO public.store_settings (id, is_open)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

-- 2. Ensure columns exist on order_items table for product_name and price_at_time
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS price_at_time NUMERIC(10, 2);
ALTER TABLE public.order_items ALTER COLUMN unit_price DROP NOT NULL;

-- 3. Grants for anon and authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE public.store_settings TO anon, authenticated;
GRANT ALL ON TABLE public.orders TO anon, authenticated;
GRANT ALL ON TABLE public.order_items TO anon, authenticated;
GRANT ALL ON TABLE public.products TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 5. Drop any conflicting or restrictive policies
DROP POLICY IF EXISTS "Allow anon and authenticated select store_settings" ON public.store_settings;
DROP POLICY IF EXISTS "Allow anon and authenticated update store_settings" ON public.store_settings;
DROP POLICY IF EXISTS "Allow anon and authenticated manage store_settings" ON public.store_settings;
DROP POLICY IF EXISTS "Allow public read access to orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public insert to orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public update to orders" ON public.orders;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.orders;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.orders;
DROP POLICY IF EXISTS "Enable update for all users" ON public.orders;
DROP POLICY IF EXISTS "Allow anon and authenticated insert to orders" ON public.orders;
DROP POLICY IF EXISTS "Allow anon and authenticated select orders" ON public.orders;
DROP POLICY IF EXISTS "Allow anon and authenticated update orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public read access to order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow public insert to order_items" ON public.order_items;
DROP POLICY IF EXISTS "Enable insert for all order items" ON public.order_items;
DROP POLICY IF EXISTS "Enable read for all order items" ON public.order_items;
DROP POLICY IF EXISTS "Allow anon and authenticated insert to order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow anon and authenticated select order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow public read access to products" ON public.products;
DROP POLICY IF EXISTS "Allow public insert and update on products" ON public.products;
DROP POLICY IF EXISTS "Allow anon and authenticated select products" ON public.products;
DROP POLICY IF EXISTS "Allow anon and authenticated manage products" ON public.products;

-- 6. Create clean, permissive RLS policies
CREATE POLICY "Allow anon and authenticated manage store_settings"
    ON public.store_settings FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- Orders: Students (anon) can insert orders without 42501 RLS error
CREATE POLICY "Allow anon and authenticated insert to orders"
    ON public.orders FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Allow anon and authenticated select orders"
    ON public.orders FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Allow anon and authenticated update orders"
    ON public.orders FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- Order Items: Students (anon) can insert order items
CREATE POLICY "Allow anon and authenticated insert to order_items"
    ON public.order_items FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Allow anon and authenticated select order_items"
    ON public.order_items FOR SELECT
    TO anon, authenticated
    USING (true);

-- Products: Everyone can read products
CREATE POLICY "Allow anon and authenticated select products"
    ON public.products FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Allow anon and authenticated manage products"
    ON public.products FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 7. Fix Stock Deduction Trigger Function (SECURITY DEFINER to avoid permission errors)
CREATE OR REPLACE FUNCTION deduct_product_stock()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.products
    SET stock_count = GREATEST(0, stock_count - NEW.quantity)
    WHERE id = NEW.product_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_deduct_product_stock ON public.order_items;
CREATE TRIGGER trg_deduct_product_stock
AFTER INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION deduct_product_stock();

-- 8. Enable Realtime Publications
ALTER TABLE public.store_settings REPLICA IDENTITY FULL;
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.order_items REPLICA IDENTITY FULL;
ALTER TABLE public.products REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'store_settings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.store_settings;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'order_items'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'products'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
    END IF;
END $$;
