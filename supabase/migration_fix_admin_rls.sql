-- ==========================================================
-- KhaoMojo Admin Panel RLS Unblock & Order History Fix
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor)
-- ==========================================================

-- 1. Fix store_settings: Disable RLS
-- store_settings is a non-sensitive 1-row configuration table (id: 1, is_open: boolean).
-- Disabling RLS allows the Admin to toggle Open/Closed instantly with zero blockage.
ALTER TABLE public.store_settings DISABLE ROW LEVEL SECURITY;

-- 2. Fix orders: Restore full Admin order history & management
-- Disabling RLS on orders immediately restores all historical orders (including orders where user_id IS NULL)
-- and lets the Admin Dashboard read, update, and manage all orders.
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;

-- 3. Fix order_items: Restore full Admin visibility for order line items and print PDFs
ALTER TABLE public.order_items DISABLE ROW LEVEL SECURITY;

-- ==========================================================
-- Alternative (RLS Enabled with Universal Admin Override):
-- If you want RLS enabled while allowing the Admin to see everything:
-- ==========================================================
-- ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Admin full access orders" ON public.orders;
-- CREATE POLICY "Admin full access orders" ON public.orders FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
-- DROP POLICY IF EXISTS "Admin full access order_items" ON public.order_items;
-- CREATE POLICY "Admin full access order_items" ON public.order_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
