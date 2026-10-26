import { getSupabase, isSupabaseConfigured } from './supabase/client';

export const INITIAL_PRODUCTS = [
  // 1. Lay's Collection
  {
    id: '11111111-1111-1111-1111-111111110001',
    name: "Lay's India's Magic Masala",
    category: 'snack',
    section_name: "Lay's Collection",
    price: 20.0,
    stock_count: 45,
    image_url: "/blue lay's.jpg",
    description: "Classic spicy Indian blue Lay's with aromatic spices and herbs.",
  },
  {
    id: '11111111-1111-1111-1111-111111110002',
    name: "Lay's American Style Cream & Onion",
    category: 'snack',
    section_name: "Lay's Collection",
    price: 20.0,
    stock_count: 50,
    image_url: "/American Style .jpeg",
    description: 'Tangy sour cream blended with savory onion flavor.',
  },
  {
    id: '11111111-1111-1111-1111-111111110003',
    name: "Lay's Classic Salted",
    category: 'snack',
    section_name: "Lay's Collection",
    price: 20.0,
    stock_count: 40,
    image_url: "/Lay's Classic Salted.jpg",
    description: 'Crispy, golden salted potato chips made with selected potatoes.',
  },
  {
    id: '11111111-1111-1111-1111-111111110004',
    name: "Lay's Spanish Tomato Tango",
    category: 'snack',
    section_name: "Lay's Collection",
    price: 20.0,
    stock_count: 35,
    image_url: "/Lay's Spanish Tomato Tango .jpg",
    description: 'Sweet and tangy ripe Spanish tomato flavored crispy chips.',
  },

  // 2. Kurkure Collection
  {
    id: '22222222-2222-2222-2222-222222220001',
    name: 'Kurkure Masala Munch',
    category: 'snack',
    section_name: 'Kurkure Collection',
    price: 20.0,
    stock_count: 45,
    image_url: '/Kurkure Masala Munch.jpg',
    description: 'Desi spiced, Tedha Hai Par Mera Hai crunchy tea-time favorite.',
  },
  {
    id: '22222222-2222-2222-2222-222222220004',
    name: 'Kurkure Puffcorn',
    category: 'snack',
    section_name: 'Kurkure Collection',
    price: 20.0,
    stock_count: 40,
    image_url: '/puffcorn.jpg',
    description: 'Melt-in-the-mouth light cheesy puffed corn snack.',
  },

  // 3. Bingo Collection
  {
    id: '77777777-7777-7777-7777-777777770001',
    name: 'Bingo Achaari Masti',
    category: 'snack',
    section_name: 'Bingo Collection',
    price: 20.0,
    stock_count: 40,
    image_url: '/Achari.jpg',
    description: 'Spicy tangy Indian pickle flavored crispy bite triangles.',
  },
  {
    id: '77777777-7777-7777-7777-777777770002',
    name: 'Bingo Very Peri Peri',
    category: 'snack',
    section_name: 'Bingo Collection',
    price: 20.0,
    stock_count: 35,
    image_url: '/very peri peri.jpg',
    description: 'Fiery peri-peri spice dusted crunchy snack with a punch.',
  },

  // 4. Soya Sticks
  {
    id: '88888888-8888-8888-8888-888888880001',
    name: 'Soya Sticks (Classic)',
    category: 'snack',
    section_name: 'Soya Sticks',
    price: 20.0,
    stock_count: 35,
    image_url: '/soya sticks.jpeg',
    description: 'High-crunch roasted protein soya sticks with chatpata masala.',
  },

  // 5. Packed Maggi
  {
    id: '33333333-3333-3333-3333-333333330001',
    name: 'Maggi 2-Minute Noodles',
    category: 'grocery',
    section_name: 'Packed Maggi',
    price: 14.0,
    stock_count: 60,
    image_url: '/maggi.jpg',
    description: 'The indisputable king of 2 AM hostel hunger. Authentic masala tastemaker.',
  },

  // 6. Fresh Eggs
  {
    id: '99999999-9999-9999-9999-999999990001',
    name: 'Farm Fresh Eggs (Per Piece)',
    category: 'grocery',
    section_name: 'Fresh Eggs',
    price: 8.0,
    stock_count: 60,
    image_url: '/egg.png',
    description: 'Fresh protein-rich poultry egg sold per piece for midnight boiled eggs, bhurji or omelettes.',
  },

  // 7. Oreo
  {
    id: '44444444-4444-4444-4444-444444440001',
    name: 'Oreo Vanilla Cream Biscuits',
    category: 'snack',
    section_name: 'Oreo',
    price: 30.0,
    stock_count: 50,
    image_url: '/oreo.jpg',
    description: 'Rich dark chocolate biscuit cookies sandwiched with smooth vanilla cream.',
  },

  // 8. Other Biscuits
  {
    id: '55555555-5555-5555-5555-555555550002',
    name: 'Parle-G',
    category: 'snack',
    section_name: 'Other Biscuits',
    price: 10.0,
    stock_count: 60,
    image_url: '/parle-g.jpg',
    description: 'The legendary glucose biscuit, powering Indian students for generations.',
  },
  {
    id: '55555555-5555-5555-5555-555555550003',
    name: 'Bourbon Biscuit',
    category: 'snack',
    section_name: 'Other Biscuits',
    price: 25.0,
    stock_count: 40,
    image_url: '/Bourbon.jpg',
    description: 'Crunchy chocolate biscuits with rich chocolate cream filling and sugar crystals.',
  },
  {
    id: '55555555-5555-5555-5555-555555550004',
    name: 'Milk Bikis',
    category: 'snack',
    section_name: 'Other Biscuits',
    price: 20.0,
    stock_count: 35,
    image_url: '/milk-bikis.jpg',
    description: 'Wholesome milk energy biscuits, the classic childhood chai dunker.',
  },
  {
    id: '55555555-5555-5555-5555-555555550005',
    name: 'Tiger Biscuit',
    category: 'snack',
    section_name: 'Other Biscuits',
    price: 10.0,
    stock_count: 50,
    image_url: '/tiger-biscuit.jpg',
    description: 'Fortified glucose wheat biscuits for quick midnight study energy.',
  },

  // 9. Print Services
  {
    id: '66666666-6666-6666-6666-666666660001',
    name: 'Black & White Printout (Per Page)',
    category: 'print_service',
    section_name: 'Print Services',
    price: 3.0,
    stock_count: 500,
    image_url: 'https://images.unsplash.com/photo-1589330694653-ded6df03f754?w=600&auto=format&fit=crop&q=80',
    description: 'Crisp 80 GSM monochrome laser print for assignments, notes & lab manuals.',
  },
  {
    id: '66666666-6666-6666-6666-666666660002',
    name: 'Color Printout (Per Page)',
    category: 'print_service',
    section_name: 'Print Services',
    price: 10.0,
    stock_count: 250,
    image_url: 'https://images.unsplash.com/photo-1562564055-71e051d33c19?w=600&auto=format&fit=crop&q=80',
    description: 'High-res vivid color laser prints for project submissions, diagrams and posters.',
  },
  {
    id: '66666666-6666-6666-6666-666666660003',
    name: 'Blank A4 Sheets (Bundle of 10)',
    category: 'print_service',
    section_name: 'Print Services',
    price: 15.0,
    stock_count: 60,
    image_url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
    description: 'Premium JK 75 GSM bright white blank sheets for rough work and drafts.',
  },
  {
    id: 'aaa11111-1111-1111-1111-111111110001',
    name: 'College PPT Making',
    category: 'academic_service',
    section_name: 'Academic & Tech Services',
    price: 100.0,
    stock_count: 50,
    image_url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80',
    description: 'Custom professional presentation design for college seminars, research topics, and course submissions.',
  },
  {
    id: 'aaa11111-1111-1111-1111-111111110002',
    name: 'Physics Excel Sheet Making',
    category: 'academic_service',
    section_name: 'Academic & Tech Services',
    price: 100.0,
    stock_count: 50,
    image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80',
    description: 'Formatted lab calculation spreadsheets with customized formulas, graphs, error analysis and tables.',
  },
  {
    id: 'aaa11111-1111-1111-1111-111111110003',
    name: 'Coding Project',
    category: 'academic_service',
    section_name: 'Academic & Tech Services',
    price: 200.0,
    stock_count: 30,
    image_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80',
    description: 'Academic code solutions, minor project architectures, debugging assistance, and prototype builds.',
  },
];

const LOCAL_STORAGE_PRODUCTS_KEY = 'khaomojo_products_v5';
const LOCAL_STORAGE_ORDERS_KEY = 'khaomojo_orders_v5';

// Initialize global memory storage for SSR and API routes
globalThis.__khaomojo_products = JSON.parse(JSON.stringify(INITIAL_PRODUCTS));
if (!globalThis.__khaomojo_orders) {
  globalThis.__khaomojo_orders = [];
}

// Create broadcast channel for tab-to-tab realtime sync during local/mock mode
let broadcastChannel = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('khaomojo_events');
  } catch {
    broadcastChannel = null;
  }
}

/**
 * Helper to purge retired items (e.g. Spiral Binding) and fix updated names (Eggs)
 */
function sanitizeProductList(list) {
  if (!Array.isArray(list)) return [...INITIAL_PRODUCTS];

  const fallbackByName = new Map();
  for (const init of INITIAL_PRODUCTS) {
    if (init.name) {
      fallbackByName.set(init.name.toLowerCase().trim(), init);
    }
  }

  let res = list
    .filter((p) => p && !p.name?.toLowerCase().includes('spiral binding') && p.id !== '66666666-6666-6666-6666-666666660004')
    .map((p) => {
      const match = fallbackByName.get(p.name?.toLowerCase().trim());
      let img = p.image_url;
      const isMissingImage =
        !img ||
        img === '/placeholder.png' ||
        img === '/ppt.jpg' ||
        img === '/excel.jpg' ||
        img === '/coding.jpg' ||
        img === '/print_bw.jpg' ||
        img === '/print_color.jpg' ||
        img === '/a4_sheets.jpg';

      if (match && isMissingImage) {
        img = match.image_url || img;
      }

      return {
        ...p,
        image_url: img,
        section_name: p.section_name || match?.section_name || p.category,
        description: p.description || match?.description || '',
      };
    });

  return res;
}

/**
 * Get products list
 */
export async function fetchProducts() {
  const supabase = getSupabase();

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('category', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('Supabase fetch products error, falling back:', error.message);
      } else if (data && data.length > 0) {
        return sanitizeProductList(data);
      }
    } catch (err) {
      console.warn('Supabase fetch exception:', err);
    }
  }

  // Fallback to local storage or initial products
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(LOCAL_STORAGE_PRODUCTS_KEY);
    if (cached) {
      try {
        const sanitized = sanitizeProductList(JSON.parse(cached));
        localStorage.setItem(LOCAL_STORAGE_PRODUCTS_KEY, JSON.stringify(sanitized));
        return sanitized;
      } catch {
        // ignore parse error
      }
    }
    // Clean old storage versions
    try {
      localStorage.removeItem('khaomojo_products_v3');
    } catch {
      // ignore
    }
    // Initialize in localStorage
    localStorage.setItem(LOCAL_STORAGE_PRODUCTS_KEY, JSON.stringify(INITIAL_PRODUCTS));
  }

  return INITIAL_PRODUCTS;
}

/**
 * Update product stock / price (Admin function)
 */
export async function updateProductDetails(productId, updates) {
  const supabase = getSupabase();

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', productId)
        .select()
        .single();

      if (!error && data) {
        return data;
      }
      console.warn('Supabase update product error:', error?.message);
    } catch (err) {
      console.warn('Supabase update product exception:', err);
    }
  }

  // Local storage update
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(LOCAL_STORAGE_PRODUCTS_KEY);
    const list = raw ? JSON.parse(raw) : [...INITIAL_PRODUCTS];
    const index = list.findIndex((p) => p.id === productId);
    if (index !== -1) {
      list[index] = { ...list[index], ...updates };
      localStorage.setItem(LOCAL_STORAGE_PRODUCTS_KEY, JSON.stringify(list));
      if (broadcastChannel) {
        broadcastChannel.postMessage({ type: 'PRODUCT_UPDATED', payload: list[index] });
      }
      return list[index];
    }
  }

  return null;
}

/**
 * Upload print file to Supabase storage or simulate local object URL
 */
export async function uploadPrintDocument(file) {
  const supabase = getSupabase();
  const fileExt = file.name.split('.').pop() || 'pdf';
  const fileName = `print_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.storage
        .from('print-files')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (!error && data) {
        const { data: publicData } = supabase.storage
          .from('print-files')
          .getPublicUrl(fileName);

        return {
          fileName: file.name,
          url: publicData.publicUrl,
          fileSize: file.size,
        };
      }
      console.warn('Supabase storage upload error:', error?.message);
    } catch (err) {
      console.warn('Supabase storage upload exception:', err);
    }
  }

  // Simulation: Convert to Data URL or Blob URL for instant local preview/download
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        fileName: file.name,
        url: reader.result, // base64 data url
        fileSize: file.size,
      });
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Submit a customer order with items
 */
export async function createOrder({ customerName, roomNumber, phoneNumber, items, totalAmount }) {
  const supabase = getSupabase();

  if (isSupabaseConfigured() && supabase) {
    try {
      // 1. Insert order into orders table and obtain order_id
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name: customerName,
          room_number: roomNumber,
          phone_number: phoneNumber,
          total_amount: totalAmount,
          status: 'pending',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderId = orderData.id;
      const insertedOrderItems = [];

      // 2. Loop through cart items and insert each into order_items table
      for (const item of items) {
        const productId = item.id || item.product_id;
        const quantity = item.quantity || 1;
        const unitPrice = item.price ?? item.unit_price ?? item.price_at_time ?? 0;
        const printFileUrl = item.printFileUrl || item.print_file_url || null;

        // Try insert with unit_price (standard schema)
        const itemRecord = {
          order_id: orderId,
          product_id: productId,
          quantity: quantity,
          unit_price: unitPrice,
        };
        if (printFileUrl) {
          itemRecord.print_file_url = printFileUrl;
        }

        let { data: insertedItem, error: itemError } = await supabase
          .from('order_items')
          .insert(itemRecord)
          .select('*, products(*)')
          .single();

        // If column is named price_at_time instead of unit_price, retry with price_at_time
        if (itemError && (itemError.code === 'PGRST204' || itemError.message?.includes('unit_price'))) {
          const fallbackRecord = {
            order_id: orderId,
            product_id: productId,
            quantity: quantity,
            price_at_time: unitPrice,
          };
          if (printFileUrl) {
            fallbackRecord.print_file_url = printFileUrl;
          }
          const retryRes = await supabase
            .from('order_items')
            .insert(fallbackRecord)
            .select('*, products(*)')
            .single();
          insertedItem = retryRes.data;
          itemError = retryRes.error;
        }

        if (itemError) {
          console.warn(`[createOrder] Note inserting order_item for product ${productId}:`, itemError.message || itemError);
        }

        insertedOrderItems.push(insertedItem || {
          order_id: orderId,
          product_id: productId,
          quantity: quantity,
          unit_price: unitPrice,
          price_at_time: unitPrice,
          print_file_url: printFileUrl,
          products: {
            id: productId,
            name: item.name || item.product_name || 'Item',
          },
        });
      }

      const createdOrderWithItems = {
        ...orderData,
        order_items: insertedOrderItems,
        items: items.map((item) => ({
          product_id: item.id || item.product_id,
          product_name: item.name || item.product_name || 'Item',
          quantity: item.quantity,
          unit_price: item.price ?? item.unit_price ?? 0,
          price_at_time: item.price ?? item.unit_price ?? 0,
          print_file_url: item.printFileUrl || item.print_file_url || null,
        })),
      };

      // Persist to localStorage for client caching & offline continuity
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY);
          const current = raw ? JSON.parse(raw) : [];
          localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify([createdOrderWithItems, ...current]));
        } catch {}
      }

      // Broadcast to local tabs as well
      if (typeof window !== 'undefined' && broadcastChannel) {
        broadcastChannel.postMessage({ type: 'ORDER_CREATED', payload: createdOrderWithItems });
      }

      return createdOrderWithItems;
    } catch (err) {
      console.warn('Supabase createOrder error, utilizing client fallback:', err);
    }
  }

  // Local/Offline Fallback simulation
  const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newOrder = {
    id: orderId,
    customer_name: customerName,
    room_number: roomNumber,
    phone_number: phoneNumber,
    total_amount: totalAmount,
    status: 'pending',
    created_at: new Date().toISOString(),
    order_items: items.map((item) => ({
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      order_id: orderId,
      product_id: item.id,
      quantity: item.quantity,
      unit_price: item.price,
      print_file_url: item.printFileUrl || null,
      products: {
        id: item.id,
        name: item.name,
      },
    })),
    items: items.map((item) => ({
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      order_id: orderId,
      product_id: item.id,
      product_name: item.name,
      quantity: item.quantity,
      unit_price: item.price,
      print_file_url: item.printFileUrl || null,
      print_file_name: item.printFileName || null,
    })),
  };

  if (typeof window !== 'undefined') {
    // 1. Save order to localStorage
    const rawOrders = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY);
    const orderList = rawOrders ? JSON.parse(rawOrders) : [];
    orderList.unshift(newOrder);
    localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(orderList));

    // 2. Deduct product stock locally to mimic Postgres trigger
    const rawProducts = localStorage.getItem(LOCAL_STORAGE_PRODUCTS_KEY);
    const prodList = rawProducts ? JSON.parse(rawProducts) : [...INITIAL_PRODUCTS];
    items.forEach((item) => {
      const p = prodList.find((x) => x.id === item.id);
      if (p) {
        p.stock_count = Math.max(0, (p.stock_count || 0) - item.quantity);
      }
    });
    localStorage.setItem(LOCAL_STORAGE_PRODUCTS_KEY, JSON.stringify(prodList));

    // 3. Broadcast to all open tabs (storefront + admin)
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'ORDER_CREATED', payload: newOrder });
      broadcastChannel.postMessage({ type: 'PRODUCTS_UPDATED', payload: prodList });
    }
    // 4. Save to server global memory
    if (globalThis.__khaomojo_orders) {
      globalThis.__khaomojo_orders.unshift(newOrder);
    }
  } else if (globalThis.__khaomojo_orders) {
    globalThis.__khaomojo_orders.unshift(newOrder);
  }

  return newOrder;
}

/**
 * Fetch store settings (id = 1) from Supabase or fallback
 */
export async function fetchStoreSettings() {
  const supabase = getSupabase();

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('id, is_open')
        .eq('id', 1)
        .maybeSingle();

      if (!error && data) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('khaomojo_store_settings_is_open', String(data.is_open));
        }
        return { id: 1, is_open: Boolean(data.is_open) };
      }
      if (error && error.code !== 'PGRST116') {
        console.warn('Supabase fetch store_settings error:', error.message);
      }
    } catch (err) {
      console.warn('Supabase fetch store_settings exception:', err);
    }
  }

  // Local fallback
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem('khaomojo_store_settings_is_open');
    if (cached !== null) {
      return { id: 1, is_open: cached === 'true' };
    }
  }

  return { id: 1, is_open: true };
}

/**
 * Update store settings (id = 1) in Supabase and notify all clients
 */
export async function updateStoreSettings(isOpen) {
  const supabase = getSupabase();
  const nextOpen = Boolean(isOpen);

  if (typeof window !== 'undefined') {
    localStorage.setItem('khaomojo_store_settings_is_open', String(nextOpen));
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'STORE_SETTINGS_CHANGED', payload: { id: 1, is_open: nextOpen } });
    }
  }

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .upsert({ id: 1, is_open: nextOpen, updated_at: new Date().toISOString() })
        .select()
        .single();

      if (!error && data) {
        return { id: 1, is_open: Boolean(data.is_open) };
      }
      console.warn('Supabase update store_settings error:', error?.message);
    } catch (err) {
      console.warn('Supabase update store_settings exception:', err);
    }
  }

  return { id: 1, is_open: nextOpen };
}

/**
 * Fetch all orders (Admin function)
 */
export async function fetchOrders() {
  const supabase = getSupabase();

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, products(*))')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map((order) => {
          let orderItems = order.order_items || [];
          if (orderItems.length === 0 && typeof window !== 'undefined') {
            try {
              const raw = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY);
              if (raw) {
                const localOrders = JSON.parse(raw);
                const match = localOrders.find((lo) => lo.id === order.id);
                if (match && (match.order_items?.length || match.items?.length)) {
                  orderItems = match.order_items || match.items || [];
                }
              }
            } catch {}
          }

          return {
            ...order,
            order_items: orderItems,
            items: orderItems.map((item) => ({
              id: item.id,
              quantity: item.quantity,
              unit_price: item.unit_price || item.price_at_time || item.price || 0,
              price_at_time: item.unit_price || item.price_at_time || item.price || 0,
              print_file_url: item.print_file_url,
              product_name: item.products?.name || (Array.isArray(item.products) ? item.products[0]?.name : null) || item.product_name || 'Item',
              product_id: item.product_id,
            })),
          };
        });
      }
      console.warn('Supabase fetch orders error:', error?.message);
    } catch (err) {
      console.warn('Supabase fetch orders exception:', err);
    }
  }

  // Local fallback
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return parsed.map((order) => ({
          ...order,
          order_items: order.order_items || (order.items || []).map((it) => ({
            id: it.id,
            quantity: it.quantity,
            unit_price: it.unit_price || it.price,
            print_file_url: it.print_file_url,
            products: {
              id: it.product_id || it.id,
              name: it.product_name || it.name,
            },
          })),
        }));
      } catch {
        // ignore parse error
      }
    }
  }

  return (globalThis.__khaomojo_orders || []).map((order) => ({
    ...order,
    order_items: order.order_items || (order.items || []).map((it) => ({
      id: it.id,
      quantity: it.quantity,
      unit_price: it.unit_price || it.price,
      print_file_url: it.print_file_url,
      products: {
        id: it.product_id || it.id,
        name: it.product_name || it.name,
      },
    })),
  }));
}

/**
 * Update order status (pending -> processing -> delivered -> cancelled)
 */
export async function updateOrderStatus(orderId, newStatus) {
  const supabase = getSupabase();

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)
        .select()
        .single();

      if (!error && data) {
        return data;
      }
      console.warn('Supabase update order error:', error?.message);
    } catch (err) {
      console.warn('Supabase update order exception:', err);
    }
  }

  // Local fallback
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY);
    const orderList = raw ? JSON.parse(raw) : [];
    const index = orderList.findIndex((o) => o.id === orderId);
    if (index !== -1) {
      orderList[index].status = newStatus;
      localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(orderList));
      if (broadcastChannel) {
        broadcastChannel.postMessage({ type: 'ORDER_STATUS_CHANGED', payload: orderList[index] });
      }
      return orderList[index];
    }
  }

  return null;
}

/**
 * Subscribe to realtime updates for orders, products and store settings
 */
export function subscribeToRealtime({ onOrderChange, onProductChange, onStoreSettingsChange }) {
  const supabase = getSupabase();

  // 1. Supabase Realtime Subscription if configured
  let supabaseChannel = null;
  if (isSupabaseConfigured() && supabase) {
    try {
      const channelId = `khaomojo-orders-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      supabaseChannel = supabase
        .channel(channelId)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          (payload) => {
            console.log('[Supabase Realtime Order Event]:', payload.eventType, payload.new?.id);
            if (onOrderChange) onOrderChange(payload);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'products' },
          (payload) => {
            console.log('[Supabase Realtime Product Event]:', payload.eventType, payload.new?.name);
            if (onProductChange) onProductChange(payload);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'store_settings' },
          (payload) => {
            console.log('[Supabase Realtime Store Settings Event]:', payload.eventType, payload.new);
            if (onStoreSettingsChange) onStoreSettingsChange(payload);
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log(`[Supabase Realtime] Successfully subscribed to orders channel (${channelId})`);
          } else if (err) {
            console.warn(`[Supabase Realtime] Subscription status: ${status}`, err);
          }
        });
    } catch (err) {
      console.warn('Failed to set up Supabase channel:', err);
    }
  }

  // 2. BroadcastChannel for local/multi-tab sync
  const handleBroadcastMessage = (event) => {
    const { type, payload } = event.data || {};
    if (type === 'ORDER_CREATED' && onOrderChange) {
      onOrderChange({ eventType: 'INSERT', new: payload });
    } else if (type === 'ORDER_STATUS_CHANGED' && onOrderChange) {
      onOrderChange({ eventType: 'UPDATE', new: payload });
    } else if ((type === 'PRODUCT_UPDATED' || type === 'PRODUCTS_UPDATED') && onProductChange) {
      onProductChange({ eventType: 'UPDATE', new: payload });
    } else if (type === 'STORE_SETTINGS_CHANGED' && onStoreSettingsChange) {
      onStoreSettingsChange({ eventType: 'UPDATE', new: payload });
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcastMessage);
  }

  // Cleanup function
  return () => {
    if (supabaseChannel && supabase) {
      supabase.removeChannel(supabaseChannel);
    }
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcastMessage);
    }
  };
}
