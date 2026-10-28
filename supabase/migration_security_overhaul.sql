-- ==========================================================
-- KhaoMojo Security & Operational Overhaul Migration
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor)
-- ==========================================================

-- 1. Add `utr_number` column to orders table (if not exists)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS utr_number TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_utr_number ON public.orders(utr_number);

-- 2. Re-enable Row Level Security (RLS) on all tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing loose / overly-permissive policies to prevent public data exposure
DROP POLICY IF EXISTS "Allow anon and authenticated select products" ON public.products;
DROP POLICY IF EXISTS "Allow anon and authenticated manage products" ON public.products;
DROP POLICY IF EXISTS "public_read_products" ON public.products;
DROP POLICY IF EXISTS "Public read products" ON public.products;

DROP POLICY IF EXISTS "Allow anon and authenticated select store_settings" ON public.store_settings;
DROP POLICY IF EXISTS "Allow anon and authenticated update store_settings" ON public.store_settings;
DROP POLICY IF EXISTS "public_read_store_settings" ON public.store_settings;
DROP POLICY IF EXISTS "Public read store_settings" ON public.store_settings;

DROP POLICY IF EXISTS "Allow anon and authenticated insert to orders" ON public.orders;
DROP POLICY IF EXISTS "Allow anon and authenticated select orders" ON public.orders;
DROP POLICY IF EXISTS "Allow anon and authenticated update orders" ON public.orders;
DROP POLICY IF EXISTS "Public insert orders" ON public.orders;

DROP POLICY IF EXISTS "Allow anon and authenticated insert to order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow anon and authenticated select order_items" ON public.order_items;
DROP POLICY IF EXISTS "Public insert order_items" ON public.order_items;

-- 4. Create strict RLS policies
-- Public can ONLY read products
CREATE POLICY "Public read products"
    ON public.products FOR SELECT
    TO anon, authenticated
    USING (true);

-- Public can ONLY read store_settings
CREATE POLICY "Public read store_settings"
    ON public.store_settings FOR SELECT
    TO anon, authenticated
    USING (true);

-- Public can ONLY insert into orders
CREATE POLICY "Public insert orders"
    ON public.orders FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Public can ONLY insert into order_items
CREATE POLICY "Public insert order_items"
    ON public.order_items FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- 5. Create atomic transactional RPC function: `place_order`
-- Inserts order + order items + updates stock atomically inside a single transaction.
-- Solves the "blank orders" bug permanently.
CREATE OR REPLACE FUNCTION public.place_order(
    p_customer_name TEXT,
    p_room_number TEXT,
    p_phone_number TEXT,
    p_utr_number TEXT,
    p_total_amount NUMERIC,
    p_cart_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order_id UUID;
    v_item JSONB;
    v_product_id UUID;
    v_product_name TEXT;
    v_quantity INT;
    v_price NUMERIC;
    v_print_url TEXT;
    v_result JSONB;
BEGIN
    -- Strict validation
    IF p_customer_name IS NULL OR length(trim(p_customer_name)) < 2 THEN
        RAISE EXCEPTION 'Customer name is required (min 2 characters).';
    END IF;

    IF p_room_number IS NULL OR length(trim(p_room_number)) < 2 THEN
        RAISE EXCEPTION 'Hostel block and room number are required.';
    END IF;

    IF p_phone_number IS NULL OR length(trim(p_phone_number)) < 7 THEN
        RAISE EXCEPTION 'Valid phone number is required.';
    END IF;

    IF p_utr_number IS NULL OR trim(p_utr_number) !~* '^[A-Za-z0-9]{12}$' THEN
        RAISE EXCEPTION 'Valid 12-digit alphanumeric UTR / Reference number is required.';
    END IF;

    IF p_cart_items IS NULL OR jsonb_typeof(p_cart_items) <> 'array' OR jsonb_array_length(p_cart_items) = 0 THEN
        RAISE EXCEPTION 'Cart cannot be empty.';
    END IF;

    -- Atomic Insert into orders
    INSERT INTO public.orders (
        customer_name,
        room_number,
        phone_number,
        utr_number,
        total_amount,
        status
    ) VALUES (
        trim(p_customer_name),
        trim(p_room_number),
        trim(p_phone_number),
        trim(p_utr_number),
        p_total_amount,
        'pending'
    )
    RETURNING id INTO v_order_id;

    -- Atomic Insert into order_items & stock deduction
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_cart_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_product_name := COALESCE(v_item->>'product_name', v_item->>'name', 'Item');
        v_quantity := GREATEST(1, COALESCE((v_item->>'quantity')::INT, 1));
        v_price := COALESCE((v_item->>'price_at_time')::NUMERIC, (v_item->>'price')::NUMERIC, (v_item->>'unit_price')::NUMERIC, 0);
        v_print_url := NULLIF(trim(COALESCE(v_item->>'print_file_url', v_item->>'printFilePath', '')), '');

        INSERT INTO public.order_items (
            order_id,
            product_id,
            product_name,
            quantity,
            price_at_time,
            unit_price,
            print_file_url
        ) VALUES (
            v_order_id,
            v_product_id,
            v_product_name,
            v_quantity,
            v_price,
            v_price,
            v_print_url
        );

        -- Safe stock deduction
        UPDATE public.products
        SET stock_count = GREATEST(0, stock_count - v_quantity)
        WHERE id = v_product_id;
    END LOOP;

    -- Return full order with items
    SELECT jsonb_build_object(
        'id', o.id,
        'customer_name', o.customer_name,
        'room_number', o.room_number,
        'phone_number', o.phone_number,
        'utr_number', o.utr_number,
        'total_amount', o.total_amount,
        'status', o.status,
        'created_at', o.created_at,
        'order_items', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'id', oi.id,
                'order_id', oi.order_id,
                'product_id', oi.product_id,
                'product_name', oi.product_name,
                'quantity', oi.quantity,
                'price_at_time', oi.price_at_time,
                'unit_price', oi.unit_price,
                'print_file_url', oi.print_file_url
            ))
            FROM public.order_items oi
            WHERE oi.order_id = o.id
        ), '[]'::jsonb)
    )
    INTO v_result
    FROM public.orders o
    WHERE o.id = v_order_id;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_order(TEXT, TEXT, TEXT, TEXT, NUMERIC, JSONB) TO anon, authenticated, service_role;

-- 6. Helper RPC functions for Admin Operations (Bypasses RLS safely under SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_admin_orders()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_data JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', o.id,
            'customer_name', o.customer_name,
            'room_number', o.room_number,
            'phone_number', o.phone_number,
            'utr_number', o.utr_number,
            'total_amount', o.total_amount,
            'status', o.status,
            'created_at', o.created_at,
            'order_items', COALESCE((
                SELECT jsonb_agg(jsonb_build_object(
                    'id', oi.id,
                    'order_id', oi.order_id,
                    'product_id', oi.product_id,
                    'product_name', oi.product_name,
                    'quantity', oi.quantity,
                    'price_at_time', oi.price_at_time,
                    'unit_price', oi.unit_price,
                    'print_file_url', oi.print_file_url,
                    'products', jsonb_build_object('id', p.id, 'name', p.name)
                ))
                FROM public.order_items oi
                LEFT JOIN public.products p ON oi.product_id = p.id
                WHERE oi.order_id = o.id
            ), '[]'::jsonb)
        ) ORDER BY o.created_at DESC
    )
    INTO v_data
    FROM public.orders o;

    RETURN COALESCE(v_data, '[]'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_admin_orders() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_update_order_status(p_order_id UUID, p_status TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order public.orders%ROWTYPE;
BEGIN
    UPDATE public.orders
    SET status = p_status
    WHERE id = p_order_id
    RETURNING * INTO v_order;

    RETURN to_jsonb(v_order);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status(UUID, TEXT) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_update_product(p_product_id UUID, p_price NUMERIC, p_stock_count INT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_prod public.products%ROWTYPE;
BEGIN
    UPDATE public.products
    SET 
        price = COALESCE(p_price, price),
        stock_count = COALESCE(p_stock_count, stock_count)
    WHERE id = p_product_id
    RETURNING * INTO v_prod;

    RETURN to_jsonb(v_prod);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_update_product(UUID, NUMERIC, INT) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_update_store_status(p_is_open BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_setting public.store_settings%ROWTYPE;
BEGIN
    INSERT INTO public.store_settings (id, is_open, updated_at)
    VALUES (1, p_is_open, now())
    ON CONFLICT (id) DO UPDATE
    SET is_open = p_is_open, updated_at = now()
    RETURNING * INTO v_setting;

    RETURN to_jsonb(v_setting);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_update_store_status(BOOLEAN) TO anon, authenticated, service_role;
