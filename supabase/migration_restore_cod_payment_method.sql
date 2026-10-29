-- ==========================================================
-- KhaoMojo Restore Cash on Delivery (COD) Migration
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor)
-- ==========================================================

-- 1. Add `payment_method` column to orders table (if not exists)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'COD';

CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON public.orders(payment_method);

-- 2. Update atomic place_order function to accept optional p_payment_method ('COD' or 'UPI')
-- Drop older overloaded signatures to avoid ambiguity
DROP FUNCTION IF EXISTS public.place_order(TEXT, TEXT, TEXT, TEXT, NUMERIC, JSONB);
DROP FUNCTION IF EXISTS public.place_order(TEXT, TEXT, TEXT, TEXT, NUMERIC, JSONB, UUID);
DROP FUNCTION IF EXISTS public.place_order(TEXT, TEXT, TEXT, TEXT, NUMERIC, JSONB, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.place_order(
    p_customer_name TEXT,
    p_room_number TEXT,
    p_phone_number TEXT,
    p_utr_number TEXT,
    p_total_amount NUMERIC,
    p_cart_items JSONB,
    p_user_id UUID DEFAULT NULL,
    p_payment_method TEXT DEFAULT 'COD'
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
    v_final_user_id UUID;
    v_method TEXT;
    v_utr TEXT;
BEGIN
    -- Strict customer details validation
    IF p_customer_name IS NULL OR length(trim(p_customer_name)) < 2 THEN
        RAISE EXCEPTION 'Customer name is required (min 2 characters).';
    END IF;

    IF p_room_number IS NULL OR length(trim(p_room_number)) < 2 THEN
        RAISE EXCEPTION 'Hostel block and room number are required.';
    END IF;

    IF p_phone_number IS NULL OR length(trim(p_phone_number)) < 7 THEN
        RAISE EXCEPTION 'Valid phone number is required.';
    END IF;

    -- Normalize payment method (strictly 'COD' or 'UPI')
    v_method := UPPER(TRIM(COALESCE(p_payment_method, 'COD')));
    IF v_method NOT IN ('COD', 'UPI') THEN
        v_method := 'COD';
    END IF;

    -- UTR validation: strictly mandatory for UPI, null for COD
    IF v_method = 'UPI' THEN
        IF p_utr_number IS NULL OR trim(p_utr_number) !~* '^[A-Za-z0-9]{12}$' THEN
            RAISE EXCEPTION 'Valid 12-digit alphanumeric UTR / Reference number is required for Prepaid UPI.';
        END IF;
        v_utr := trim(p_utr_number);
    ELSE
        -- Cash on Delivery does not require UTR
        v_utr := NULL;
    END IF;

    IF p_cart_items IS NULL OR jsonb_typeof(p_cart_items) <> 'array' OR jsonb_array_length(p_cart_items) = 0 THEN
        RAISE EXCEPTION 'Cart cannot be empty.';
    END IF;

    -- Automatically detect user_id from parameter or auth context
    v_final_user_id := COALESCE(p_user_id, auth.uid());

    -- Atomic Insert into orders
    INSERT INTO public.orders (
        customer_name,
        room_number,
        phone_number,
        payment_method,
        utr_number,
        total_amount,
        status,
        user_id
    ) VALUES (
        trim(p_customer_name),
        trim(p_room_number),
        trim(p_phone_number),
        v_method,
        v_utr,
        p_total_amount,
        'pending',
        v_final_user_id
    )
    RETURNING id INTO v_order_id;

    -- Atomic Insert into order_items & safe stock deduction
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
        'payment_method', o.payment_method,
        'utr_number', o.utr_number,
        'total_amount', o.total_amount,
        'status', o.status,
        'user_id', o.user_id,
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

-- 3. Grant execute permission
GRANT EXECUTE ON FUNCTION public.place_order(TEXT, TEXT, TEXT, TEXT, NUMERIC, JSONB, UUID, TEXT) TO anon, authenticated, service_role;

-- 4. Update get_admin_orders() to include payment_method
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
            'payment_method', o.payment_method,
            'utr_number', o.utr_number,
            'total_amount', o.total_amount,
            'status', o.status,
            'user_id', o.user_id,
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
