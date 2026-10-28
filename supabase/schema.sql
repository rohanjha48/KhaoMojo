-- ==========================================================
-- KhaoMojo Supabase Database Schema
-- Late-Night Hostel Delivery & Printing Service
-- ==========================================================

-- 1. Create enum/check constraints & tables
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: products
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('snack', 'grocery', 'print_service', 'academic_service', 'Academic & Tech Services')),
    section_name TEXT NOT NULL DEFAULT 'Lay''s Collection',
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    stock_count INTEGER NOT NULL DEFAULT 0 CHECK (stock_count >= 0),
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: orders
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    room_number TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    utr_number TEXT,
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'delivered', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: order_items
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_name TEXT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_at_time NUMERIC(10, 2),
    unit_price NUMERIC(10, 2),
    print_file_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: store_settings
CREATE TABLE IF NOT EXISTS store_settings (
    id INT PRIMARY KEY,
    is_open BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert single default row with id = 1 defaulting to closed (false)
INSERT INTO store_settings (id, is_open)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

-- Indexes for performance (handling 500+ concurrent users smoothly)
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_section_name ON products(section_name);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- 2. Stock Deduction Trigger Function
-- Automatically deducts stock_count in products whenever a new row is inserted into order_items
CREATE OR REPLACE FUNCTION deduct_product_stock()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE products
    SET stock_count = GREATEST(0, stock_count - NEW.quantity)
    WHERE id = NEW.product_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_deduct_product_stock ON order_items;
CREATE TRIGGER trg_deduct_product_stock
AFTER INSERT ON order_items
FOR EACH ROW
EXECUTE FUNCTION deduct_product_stock();

-- 3. Grants & Row Level Security (RLS) Configuration
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE public.orders TO anon, authenticated;
GRANT ALL ON TABLE public.order_items TO anon, authenticated;
GRANT ALL ON TABLE public.products TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

GRANT ALL ON TABLE public.store_settings TO anon, authenticated;

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- Store Settings Policies
CREATE POLICY "Allow anon and authenticated select store_settings"
    ON store_settings FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Allow anon and authenticated update store_settings"
    ON store_settings FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- Product Policies
CREATE POLICY "Allow anon and authenticated select products"
    ON products FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Allow anon and authenticated manage products"
    ON products FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- Order Policies
CREATE POLICY "Allow anon and authenticated insert to orders"
    ON orders FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Allow anon and authenticated select orders"
    ON orders FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Allow anon and authenticated update orders"
    ON orders FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- Order Items Policies
CREATE POLICY "Allow anon and authenticated insert to order_items"
    ON order_items FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Allow anon and authenticated select order_items"
    ON order_items FOR SELECT
    TO anon, authenticated
    USING (true);

-- 4. Supabase Realtime Setup
ALTER TABLE orders REPLICA IDENTITY FULL;
ALTER TABLE order_items REPLICA IDENTITY FULL;
ALTER TABLE products REPLICA IDENTITY FULL;
ALTER TABLE store_settings REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE orders;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'order_items'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'products'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE products;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'store_settings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE store_settings;
    END IF;
END $$;

-- 5. Supabase Storage Bucket for Print Uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('print-files', 'print-files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage bucket access policies
CREATE POLICY "Allow public uploads to print-files"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'print-files');

CREATE POLICY "Allow public reads from print-files"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'print-files');
