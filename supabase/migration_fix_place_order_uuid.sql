-- ==========================================================
-- KhaoMojo: Fix place_order UUID Casting & Return Type
-- Run this script in the Supabase SQL Editor (Dashboard -> SQL Editor)
-- ==========================================================

-- 1. Ensure required columns exist on public.orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'COD';

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON public.orders(payment_method);

-- 2. Drop all previous overloaded signatures of place_order to prevent conflicts & return-type mismatch
DROP FUNCTION IF EXISTS public.place_order(TEXT, TEXT, TEXT, TEXT, NUMERIC, JSONB);
DROP FUNCTION IF EXISTS public.place_order(TEXT, TEXT, TEXT, TEXT, NUMERIC, JSONB, UUID);
DROP FUNCTION IF EXISTS public.place_order(TEXT, TEXT, TEXT, TEXT, NUMERIC, JSONB, UUID, TEXT);
DROP FUNCTION IF EXISTS public.place_order(JSONB, TEXT, TEXT, TEXT, TEXT, NUMERIC, UUID, TEXT);

-- 3. Create clean place_order function returning UUID (resolves UUID to INT casting error)
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
RETURNS UUID
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
        -- Safely extract product_id as UUID (checks 'id' then 'product_id', strictly casts to ::UUID)
        v_product_id := COALESCE(
            NULLIF(v_item->>'id', '')::UUID,
            NULLIF(v_item->>'product_id', '')::UUID
        );

        IF v_product_id IS NULL THEN
            RAISE EXCEPTION 'Invalid product ID in cart item.';
        END IF;

        v_product_name := COALESCE(v_item->>'name', v_item->>'product_name', 'Item');
        v_quantity := GREATEST(1, COALESCE((v_item->>'quantity')::INT, 1));
        v_price := COALESCE((v_item->>'price')::NUMERIC, (v_item->>'price_at_time')::NUMERIC, (v_item->>'unit_price')::NUMERIC, 0);
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

    RETURN v_order_id;
END;
$$;

-- 4. Grant execute permissions to anon, authenticated, and service_role
GRANT EXECUTE ON FUNCTION public.place_order(TEXT, TEXT, TEXT, TEXT, NUMERIC, JSONB, UUID, TEXT) TO anon, authenticated, service_role;
