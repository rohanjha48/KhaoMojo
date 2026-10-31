-- ==========================================================
-- KhaoMojo Product Catalog Update
-- Remove discontinued items and add new Bingo variants
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor)
-- ==========================================================

-- 1. Remove references from order_items first to satisfy foreign key constraints
DELETE FROM public.order_items
WHERE product_id IN (
    SELECT id FROM public.products 
    WHERE name IN (
        'Lay''s Spanish Tomato Tango',
        'Lay''s Classic Salted',
        'Kurkure Masala Munch',
        'Soya Sticks (Classic)',
        'Parle-G',
        'Tiger Biscuit',
        'Milk Bikis'
    )
);

-- 2. Remove discontinued products from products table
DELETE FROM public.products 
WHERE name IN (
    'Lay''s Spanish Tomato Tango',
    'Lay''s Classic Salted',
    'Kurkure Masala Munch',
    'Soya Sticks (Classic)',
    'Parle-G',
    'Tiger Biscuit',
    'Milk Bikis'
);

-- 3. Clean up any existing instances of the new products by name
DELETE FROM public.products 
WHERE name IN (
    'Bingo! Original style chili sprinkled',
    'Bingo! Tedhe Medhe'
) AND id NOT IN (
    '77777777-7777-7777-7777-777777770003',
    '77777777-7777-7777-7777-777777770004'
);

-- 4. Insert new Bingo products under "Bingo Collection"
INSERT INTO public.products (id, name, category, section_name, price, stock_count, image_url)
VALUES 
    (
        '77777777-7777-7777-7777-777777770003',
        'Bingo! Original style chili sprinkled',
        'snack',
        'Bingo Collection',
        20.00,
        40,
        '/bingo original.jpg'
    ),
    (
        '77777777-7777-7777-7777-777777770004',
        'Bingo! Tedhe Medhe',
        'snack',
        'Bingo Collection',
        20.00,
        40,
        '/tedhe medhe.jpeg'
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    section_name = EXCLUDED.section_name,
    price = EXCLUDED.price,
    stock_count = EXCLUDED.stock_count,
    image_url = EXCLUDED.image_url;
