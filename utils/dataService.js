import { getSupabase, isSupabaseConfigured } from './supabase/client';

// Create broadcast channel for tab-to-tab realtime sync
let broadcastChannel = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('khaomojo_events');
  } catch {
    broadcastChannel = null;
  }
}

/**
 * Get products list strictly from Supabase products table
 * Never returns hardcoded dummy arrays or old fallback prices.
 */
export async function fetchProducts() {
  const supabase = getSupabase();

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[fetchProducts] Supabase fetch error:', error.message);
        return [];
      } else if (Array.isArray(data)) {
        return data;
      }
    } catch (err) {
      console.error('[fetchProducts] Supabase exception:', err);
      return [];
    }
  }

  return [];
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
        if (broadcastChannel) {
          broadcastChannel.postMessage({ type: 'PRODUCT_UPDATED', payload: data });
        }
        return data;
      }
      console.error('[updateProductDetails] Supabase update product error:', error?.message);
    } catch (err) {
      console.error('[updateProductDetails] Supabase update product exception:', err);
    }
  }

  return null;
}

/**
 * Upload print file to Supabase storage or return object URL
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
      console.warn('[uploadPrintDocument] Supabase storage upload error:', error?.message);
    } catch (err) {
      console.warn('[uploadPrintDocument] Supabase storage upload exception:', err);
    }
  }

  // Local fallback object preview
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        fileName: file.name,
        url: reader.result,
        fileSize: file.size,
      });
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Submit a customer order with items strictly inserting into Supabase
 */
export async function createOrder({ customerName, roomNumber, phoneNumber, items, totalAmount }) {
  const supabase = getSupabase();

  if (!isSupabaseConfigured() || !supabase) {
    console.error('[createOrder] Supabase client is not configured.');
    throw new Error('Supabase client is not configured.');
  }

  // Step 1: Insert Order and GET the returned ID
  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .insert([{
      customer_name: customerName,
      room_number: roomNumber,
      phone_number: phoneNumber,
      total_amount: totalAmount,
      status: 'pending',
    }])
    .select()
    .single();

  if (orderError || !orderData) {
    console.error("Failed to insert order:", orderError);
    throw orderError || new Error("Failed to insert order");
  }

  // Step 2: Map cart items using the NEW orderData.id
  const cart = items || [];
  const itemsToInsert = cart.map(item => ({
    order_id: orderData.id,
    product_id: item.id,
    product_name: item.name || item.title,
    quantity: item.quantity,
    price_at_time: item.price
  }));

  // Step 3: Insert into order_items
  let { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert);

  if (itemsError) {
    console.error("Failed to insert items:", itemsError);
    // Schema fallback: if Postgres schema requires unit_price or does not yet have product_name/price_at_time
    if (itemsError.code === 'PGRST204' || itemsError.code === '23502' || itemsError.message?.includes('column')) {
      const fallbackItems = cart.map(item => ({
        order_id: orderData.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        ...(item.printFileUrl ? { print_file_url: item.printFileUrl } : {}),
      }));
      const retryRes = await supabase.from('order_items').insert(fallbackItems);
      if (retryRes.error) {
        console.error("Fallback items insert failed:", retryRes.error);
      } else {
        itemsError = null;
      }
    }
  }

  const completeOrder = {
    ...orderData,
    order_items: cart.map(it => ({
      order_id: orderData.id,
      product_id: it.id,
      product_name: it.name || it.title,
      quantity: it.quantity,
      price_at_time: it.price,
      unit_price: it.price,
      products: { id: it.id, name: it.name || it.title },
    })),
  };

  if (broadcastChannel && typeof window !== 'undefined') {
    broadcastChannel.postMessage({ type: 'ORDER_CREATED', payload: completeOrder });
  }

  return completeOrder;
}

/**
 * Fetch store settings (id = 1) strictly from Supabase store_settings table
 * Defaults strictly to false until DB confirms it is open.
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

      if (!error && data && typeof data.is_open === 'boolean') {
        return { id: 1, is_open: data.is_open };
      }
      if (error) {
        console.error('[fetchStoreSettings] Supabase error:', error.message);
      }
    } catch (err) {
      console.error('[fetchStoreSettings] Supabase exception:', err);
    }
  }

  // Must default to false until the DB confirms it is open
  return { id: 1, is_open: false };
}

/**
 * Update store settings (id = 1) in Supabase and notify all clients
 */
export async function updateStoreSettings(isOpen) {
  const supabase = getSupabase();
  const nextOpen = Boolean(isOpen);

  if (typeof window !== 'undefined' && broadcastChannel) {
    broadcastChannel.postMessage({ type: 'STORE_SETTINGS_CHANGED', payload: { id: 1, is_open: nextOpen } });
  }

  if (isSupabaseConfigured() && supabase) {
    try {
      let { data, error } = await supabase
        .from('store_settings')
        .update({ is_open: nextOpen, updated_at: new Date().toISOString() })
        .eq('id', 1)
        .select();

      if (!error && (!data || data.length === 0)) {
        const upsertRes = await supabase
          .from('store_settings')
          .upsert([{ id: 1, is_open: nextOpen, updated_at: new Date().toISOString() }])
          .select();
        data = upsertRes.data;
        error = upsertRes.error;
      }

      if (!error && data && data.length > 0) {
        return { id: 1, is_open: Boolean(data[0].is_open) };
      }
      if (error) {
        console.error('[updateStoreSettings] Supabase update store_settings error:', error?.message);
      }
    } catch (err) {
      console.error('[updateStoreSettings] Supabase update store_settings exception:', err);
    }
  }

  return { id: 1, is_open: nextOpen };
}

/**
 * Fetch all orders strictly from Supabase (Admin function)
 */
export async function fetchOrders() {
  const supabase = getSupabase();

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, products(*))')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        return data.map((order) => {
          const orderItems = order.order_items || [];
          return {
            ...order,
            order_items: orderItems,
            items: orderItems.map((item) => ({
              id: item.id,
              quantity: item.quantity,
              unit_price: item.price_at_time ?? item.unit_price ?? item.price ?? 0,
              price_at_time: item.price_at_time ?? item.unit_price ?? item.price ?? 0,
              print_file_url: item.print_file_url,
              product_name: item.product_name || item.products?.name || (Array.isArray(item.products) ? item.products[0]?.name : null) || 'Item',
              product_id: item.product_id,
            })),
          };
        });
      }
      console.error('[fetchOrders] Supabase fetch orders error:', error?.message);
    } catch (err) {
      console.error('[fetchOrders] Supabase fetch orders exception:', err);
    }
  }

  return [];
}

/**
 * Update order status in Supabase (Admin function)
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
        if (broadcastChannel && typeof window !== 'undefined') {
          broadcastChannel.postMessage({ type: 'ORDER_STATUS_CHANGED', payload: data });
        }
        return data;
      }
      console.error('[updateOrderStatus] Supabase update order error:', error?.message);
    } catch (err) {
      console.error('[updateOrderStatus] Supabase update order exception:', err);
    }
  }

  return null;
}

/**
 * Subscribe to realtime updates for orders, products and store settings
 */
export function subscribeToRealtime({ onOrderChange, onProductChange, onStoreSettingsChange }) {
  const supabase = getSupabase();

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
            if (onOrderChange) onOrderChange(payload);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'products' },
          (payload) => {
            if (onProductChange) onProductChange(payload);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'store_settings' },
          (payload) => {
            if (onStoreSettingsChange) onStoreSettingsChange(payload);
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log(`[Supabase Realtime] Subscribed to channel ${channelId}`);
          } else if (err) {
            console.warn(`[Supabase Realtime] Status: ${status}`, err);
          }
        });
    } catch (err) {
      console.warn('Failed to set up Supabase channel:', err);
    }
  }

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

  if (broadcastChannel && typeof window !== 'undefined') {
    broadcastChannel.addEventListener('message', handleBroadcastMessage);
  }

  return () => {
    if (supabaseChannel && supabase) {
      supabase.removeChannel(supabaseChannel);
    }
    if (broadcastChannel && typeof window !== 'undefined') {
      broadcastChannel.removeEventListener('message', handleBroadcastMessage);
    }
  };
}
