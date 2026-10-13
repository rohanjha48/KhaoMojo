-- ==========================================================
-- KhaoMojo Supabase Fix Migration: Orders RLS, Realtime & Permissions
-- Run this script in the Supabase Dashboard SQL Editor
-- ==========================================================

-- 1. Ensure public schema usage for anon and authenticated users
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 2. Grant table permissions to anon (students & dispatch) and authenticated roles
GRANT ALL ON TABLE public.orders TO anon, authenticated;
GRANT ALL ON TABLE public.order_items TO anon, authenticated;
GRANT ALL ON TABLE public.products TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 4. Clean up any existing or conflicting policies on orders
DROP POLICY IF EXISTS "Allow public read access to orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public insert to orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public update to orders" ON public.orders;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.orders;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.orders;
DROP POLICY IF EXISTS "Enable update for all users" ON public.orders;
DROP POLICY IF EXISTS "Allow anon and authenticated insert to orders" ON public.orders;
DROP POLICY IF EXISTS "Allow anon and authenticated select orders" ON public.orders;

-- 5. Create fresh, permissive RLS policies for orders
-- A. Allow unauthenticated students to place orders
CREATE POLICY "Allow anon and authenticated insert to orders"
    ON public.orders FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- B. Allow reading orders (for admin dispatch and order confirmation)
CREATE POLICY "Allow anon and authenticated select orders"
    ON public.orders FOR SELECT
    TO anon, authenticated
    USING (true);

-- C. Allow updating order status (admin dispatch transitions: pending -> processing -> delivered)
CREATE POLICY "Allow anon and authenticated update orders"
    ON public.orders FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 6. Clean up and create fresh RLS policies for order_items
DROP POLICY IF EXISTS "Allow public read access to order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow public insert to order_items" ON public.order_items;
DROP POLICY IF EXISTS "Enable insert for all order items" ON public.order_items;
DROP POLICY IF EXISTS "Enable read for all order items" ON public.order_items;
DROP POLICY IF EXISTS "Allow anon and authenticated insert to order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow anon and authenticated select order_items" ON public.order_items;

-- A. Allow students to insert items when placing an order
CREATE POLICY "Allow anon and authenticated insert to order_items"
    ON public.order_items FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- B. Allow admin and customers to read order items
CREATE POLICY "Allow anon and authenticated select order_items"
    ON public.order_items FOR SELECT
    TO anon, authenticated
    USING (true);

-- 7. Clean up and ensure product policies
DROP POLICY IF EXISTS "Allow public read access to products" ON public.products;
DROP POLICY IF EXISTS "Allow public insert and update on products" ON public.products;
DROP POLICY IF EXISTS "Allow anon and authenticated select products" ON public.products;
DROP POLICY IF EXISTS "Allow anon and authenticated manage products" ON public.products;

CREATE POLICY "Allow anon and authenticated select products"
    ON public.products FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Allow anon and authenticated manage products"
    ON public.products FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 8. Fix Stock Deduction Trigger with SECURITY DEFINER
-- Crucial: Prevents unauthenticated order insert failure when updating products stock
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

-- 9. Enable Realtime Replication for orders, order_items, and products
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.order_items REPLICA IDENTITY FULL;
ALTER TABLE public.products REPLICA IDENTITY FULL;

DO $$
BEGIN
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

-- 10. Inventory Adjustments:
-- A. Delete Spiral Binding item and any associated order_items
DELETE FROM public.order_items
WHERE product_id IN (
    SELECT id FROM public.products 
    WHERE name ILIKE '%Spiral Binding%' 
       OR id = '66666666-6666-6666-6666-666666660004'
);

DELETE FROM public.products
WHERE name ILIKE '%Spiral Binding%' 
   OR id = '66666666-6666-6666-6666-666666660004';

-- B. Update Eggs to be sold "Per Piece"
UPDATE public.products
SET 
    name = 'Farm Fresh Eggs (Per Piece)',
    price = 8.00,
    stock_count = 60,
    description = 'Fresh protein-rich poultry egg sold per piece for midnight boiled eggs, bhurji or omelettes.'
WHERE id = '99999999-9999-9999-9999-999999990001'
   OR name ILIKE '%Farm Fresh Eggs%';
