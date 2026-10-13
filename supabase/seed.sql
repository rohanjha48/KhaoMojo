-- ==========================================================
-- KhaoMojo Supabase Seed Data
-- Updated Section-Based Inventory with Exact Local Image Assets
-- ==========================================================

INSERT INTO products (id, name, category, section_name, price, stock_count, image_url)
VALUES 
    -- 1. Lay's Collection
    (
        '11111111-1111-1111-1111-111111110001',
        'Lay''s India''s Magic Masala',
        'snack',
        'Lay''s Collection',
        20.00,
        45,
        '/blue lay''s.jpg'
    ),
    (
        '11111111-1111-1111-1111-111111110002',
        'Lay''s American Style Cream & Onion',
        'snack',
        'Lay''s Collection',
        20.00,
        50,
        '/American Style .jpeg'
    ),
    (
        '11111111-1111-1111-1111-111111110003',
        'Lay''s Classic Salted',
        'snack',
        'Lay''s Collection',
        20.00,
        40,
        '/Lay''s Classic Salted.jpg'
    ),
    (
        '11111111-1111-1111-1111-111111110004',
        'Lay''s Spanish Tomato Tango',
        'snack',
        'Lay''s Collection',
        20.00,
        35,
        '/Lay''s Spanish Tomato Tango .jpg'
    ),

    -- 2. Kurkure Collection
    (
        '22222222-2222-2222-2222-222222220001',
        'Kurkure Masala Munch',
        'snack',
        'Kurkure Collection',
        20.00,
        45,
        '/Kurkure Masala Munch.jpg'
    ),
    (
        '22222222-2222-2222-2222-222222220004',
        'Kurkure Puffcorn',
        'snack',
        'Kurkure Collection',
        20.00,
        40,
        '/puffcorn.jpg'
    ),

    -- 3. Bingo Collection
    (
        '77777777-7777-7777-7777-777777770001',
        'Bingo Achaari Masti',
        'snack',
        'Bingo Collection',
        20.00,
        40,
        '/Achari.jpg'
    ),
    (
        '77777777-7777-7777-7777-777777770002',
        'Bingo Very Peri Peri',
        'snack',
        'Bingo Collection',
        20.00,
        35,
        '/very peri peri.jpg'
    ),

    -- 4. Soya Sticks
    (
        '88888888-8888-8888-8888-888888880001',
        'Soya Sticks (Classic)',
        'snack',
        'Soya Sticks',
        20.00,
        35,
        '/soya sticks.jpeg'
    ),

    -- 5. Packed Maggi
    (
        '33333333-3333-3333-3333-333333330001',
        'Maggi 2-Minute Noodles',
        'grocery',
        'Packed Maggi',
        14.00,
        60,
        '/maggi.jpg'
    ),

    -- 6. Fresh Eggs
    (
        '99999999-9999-9999-9999-999999990001',
        'Farm Fresh Eggs (Per Piece)',
        'grocery',
        'Fresh Eggs',
        8.00,
        60,
        '/egg.png'
    ),

    -- 7. Oreo
    (
        '44444444-4444-4444-4444-444444440001',
        'Oreo Vanilla Cream Biscuits',
        'snack',
        'Oreo',
        30.00,
        50,
        '/oreo.jpg'
    ),

    -- 8. Other Biscuits
    (
        '55555555-5555-5555-5555-555555550002',
        'Parle-G',
        'snack',
        'Other Biscuits',
        10.00,
        60,
        '/parle-g.jpg'
    ),
    (
        '55555555-5555-5555-5555-555555550003',
        'Bourbon Biscuit',
        'snack',
        'Other Biscuits',
        25.00,
        40,
        '/Bourbon.jpg'
    ),
    (
        '55555555-5555-5555-5555-555555550004',
        'Milk Bikis',
        'snack',
        'Other Biscuits',
        20.00,
        35,
        '/milk-bikis.jpg'
    ),
    (
        '55555555-5555-5555-5555-555555550005',
        'Tiger Biscuit',
        'snack',
        'Other Biscuits',
        10.00,
        50,
        '/tiger-biscuit.jpg'
    ),

    -- 9. Print Services
    (
        '66666666-6666-6666-6666-666666660001',
        'Black & White Printout (Per Page)',
        'print_service',
        'Print Services',
        3.00,
        500,
        'https://images.unsplash.com/photo-1589330694653-ded6df03f754?w=600&auto=format&fit=crop&q=80'
    ),
    (
        '66666666-6666-6666-6666-666666660002',
        'Color Printout (Per Page)',
        'print_service',
        'Print Services',
        10.00,
        250,
        'https://images.unsplash.com/photo-1562564055-71e051d33c19?w=600&auto=format&fit=crop&q=80'
    ),
    (
        '66666666-6666-6666-6666-666666660003',
        'Blank A4 Sheets (Bundle of 10)',
        'print_service',
        'Print Services',
        15.00,
        60,
        'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80'
    ),

    -- 10. Academic & Tech Services
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
