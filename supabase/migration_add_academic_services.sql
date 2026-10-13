-- ==========================================================
-- KhaoMojo Supabase Migration: Add Academic & Tech Services
-- Run this script in your Supabase Dashboard SQL Editor
-- ==========================================================

-- 1. Update check constraint to allow 'academic_service' and 'Academic & Tech Services'
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_category_check;
ALTER TABLE public.products ADD CONSTRAINT products_category_check 
    CHECK (category IN ('snack', 'grocery', 'print_service', 'academic_service', 'Academic & Tech Services'));

-- 2. Insert/Upsert the 3 Academic & Tech Services products
INSERT INTO public.products (id, name, category, section_name, price, stock_count, image_url)
VALUES 
    (
        'aaa11111-1111-1111-1111-111111110001',
        'College PPT Making',
        'academic_service',
        'Academic & Tech Services',
        100.00,
        99,
        'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80'
    ),
    (
        'aaa11111-1111-1111-1111-111111110002',
        'Physics Excel Sheet Making',
        'academic_service',
        'Academic & Tech Services',
        100.00,
        99,
        'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80'
    ),
    (
        'aaa11111-1111-1111-1111-111111110003',
        'Coding Project',
        'academic_service',
        'Academic & Tech Services',
        200.00,
        99,
        'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80'
    )
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    section_name = EXCLUDED.section_name,
    price = EXCLUDED.price,
    stock_count = EXCLUDED.stock_count,
    image_url = EXCLUDED.image_url;
