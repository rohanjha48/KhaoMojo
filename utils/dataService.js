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
      if (updates.price !== undefined || updates.stock_count !== undefined) {
        const { data: rpcData, error: rpcError } = await supabase.rpc('admin_update_product', {
          p_product_id: productId,
          p_price: updates.price !== undefined ? Number(updates.price) : null,
          p_stock_count: updates.stock_count !== undefined ? Number(updates.stock_count) : null,
        });
        if (!rpcError && rpcData) {
          if (broadcastChannel) {
            broadcastChannel.postMessage({ type: 'PRODUCT_UPDATED', payload: rpcData });
          }
          return rpcData;
        }
      }

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
export async function createOrder({ 
  customerName, 
  roomNumber, 
  phoneNumber, 
  utrNumber, 
  items, 
  totalAmount, 
  paymentMethod, 
  payment_method, 
  userId 
}) {
  const supabase = getSupabase();

  if (!isSupabaseConfigured() || !supabase) {
    console.error('[createOrder] Supabase client is not configured.');
    throw new Error('Supabase client is not configured.');
  }

  const isUpi = paymentMethod === 'UPI' || payment_method === 'UPI';
  const paymentMethodStr = isUpi ? 'UPI' : 'COD';
  const passedUtr = isUpi ? (utrNumber || '').trim() : null;

  const cart = items || [];

  const mappedCartItems = cart.map(item => ({
    id: item.id,
    name: item.name || item.title || 'Unknown Item',
    quantity: item.quantity,
    price: item.price,
  }));

  if (mappedCartItems.length === 0) {
    throw new Error('Cart is empty! Cannot place order.');
  }

  // Atomic transactional order creation with strict parameter keys
  const { data: orderData, error: orderError } = await supabase.rpc('place_order', {
    p_cart_items: mappedCartItems,
    p_customer_name: (customerName || '').trim(),
    p_payment_method: paymentMethodStr,
    p_phone_number: (phoneNumber || '').trim(),
    p_room_number: (roomNumber || '').trim(),
    p_total_amount: Number(totalAmount.toFixed(2)),
    p_user_id: userId || null,
    p_utr_number: paymentMethodStr === 'UPI' ? passedUtr : null,
  });

  if (orderError || !orderData) {
    console.error("[createOrder] Failed to place order via RPC:", orderError);
    throw orderError || new Error("Failed to place order");
  }

  const safeOrderId = typeof orderData === 'object' && orderData?.id
    ? orderData.id
    : String(orderData);

  const completeOrder = {
    id: safeOrderId,
    customer_name: (customerName || '').trim(),
    room_number: (roomNumber || '').trim(),
    phone_number: (phoneNumber || '').trim(),
    payment_method: paymentMethodStr,
    utr_number: paymentMethodStr === 'UPI' ? passedUtr : null,
    total_amount: Number(totalAmount.toFixed(2)),
    order_items: cart.map(it => ({
      order_id: safeOrderId,
      product_id: it.id,
      product_name: it.name || it.title,
      quantity: it.quantity,
      price_at_time: it.price,
      unit_price: it.price,
      products: { id: it.id, name: it.name || it.title },
    })),
    ...(typeof orderData === 'object' && orderData !== null ? orderData : {}),
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
  const nextOpen = Boolean(isOpen);

  if (typeof window !== 'undefined' && broadcastChannel) {
    broadcastChannel.postMessage({ type: 'STORE_SETTINGS_CHANGED', payload: { id: 1, is_open: nextOpen } });
  }

  // 1. Try server-side admin API first (uses Service Role / server bypass)
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/admin/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_open: nextOpen }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data?.success) {
          return { id: 1, is_open: Boolean(data.is_open) };
        }
      }
    } catch (apiErr) {
      console.warn('[updateStoreSettings] API route error, falling back to Supabase client:', apiErr);
    }
  }

  // 2. Fallback to direct client RPC / table update
  const supabase = getSupabase();
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('admin_update_store_status', {
        p_is_open: nextOpen,
      });
      if (!rpcError && rpcData) {
        return { id: 1, is_open: Boolean(rpcData.is_open) };
      }

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
  // 1. Try server-side admin API first (bypasses RLS with Service Role & selects ALL orders)
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/admin/orders');
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (Array.isArray(data)) {
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
      }
    } catch (apiErr) {
      console.warn('[fetchOrders] Admin API route error, falling back to client Supabase:', apiErr);
    }
  }

  // 2. Fallback to client Supabase (RPC get_admin_orders first, then table)
  const supabase = getSupabase();
  if (isSupabaseConfigured() && supabase) {
    try {
      // 1. Try secure RPC get_admin_orders() first (SECURITY DEFINER works regardless of RLS)
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_admin_orders');
      if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
        return rpcData.map((order) => {
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

      // 2. Fallback to direct table query
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
  // 1. Try server-side admin API first (uses Service Role / server bypass)
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data?.success && data?.order) {
          if (broadcastChannel && typeof window !== 'undefined') {
            broadcastChannel.postMessage({ type: 'ORDER_STATUS_CHANGED', payload: data.order });
          }
          return data.order;
        }
      }
    } catch (apiErr) {
      console.warn('[updateOrderStatus] Admin API PATCH error, falling back to client Supabase:', apiErr);
    }
  }

  // 2. Fallback to client Supabase
  const supabase = getSupabase();
  if (isSupabaseConfigured() && supabase) {
    try {
      // 1. Try secure RPC first (SECURITY DEFINER)
      const { data: rpcData, error: rpcError } = await supabase.rpc('admin_update_order_status', {
        p_order_id: orderId,
        p_status: newStatus,
      });
      if (!rpcError && rpcData) {
        if (broadcastChannel && typeof window !== 'undefined') {
          broadcastChannel.postMessage({ type: 'ORDER_STATUS_CHANGED', payload: rpcData });
        }
        return rpcData;
      }

      // 2. Fallback to direct update
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
