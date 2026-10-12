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
    category TEXT NOT NULL CHECK (category IN ('snack', 'grocery', 'print_service')),
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
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'delivered', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: order_items
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    print_file_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_deduct_product_stock ON order_items;
CREATE TRIGGER trg_deduct_product_stock
AFTER INSERT ON order_items
FOR EACH ROW
EXECUTE FUNCTION deduct_product_stock();

-- 3. Row Level Security (RLS) Configuration
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Product Policies
CREATE POLICY "Allow public read access to products"
    ON products FOR SELECT
    USING (true);

CREATE POLICY "Allow public insert and update on products"
    ON products FOR ALL
    USING (true)
    WITH CHECK (true);

-- Order Policies
CREATE POLICY "Allow public read access to orders"
    ON orders FOR SELECT
    USING (true);

CREATE POLICY "Allow public insert to orders"
    ON orders FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow public update to orders"
    ON orders FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Order Items Policies
CREATE POLICY "Allow public read access to order_items"
    ON order_items FOR SELECT
    USING (true);

CREATE POLICY "Allow public insert to order_items"
    ON order_items FOR INSERT
    WITH CHECK (true);

-- 4. Supabase Realtime Setup
-- Enable Supabase Realtime for orders and products tables
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
        WHERE pubname = 'supabase_realtime' AND tablename = 'products'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE products;
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
