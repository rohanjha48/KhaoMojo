'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { 
  Shield, Lock, LogOut, ArrowLeft, Clock, MapPin, Phone, 
  User, CheckCircle2, AlertCircle, RefreshCw, Download, 
  ExternalLink, FileText, ShoppingBag, Banknote, Edit3, 
  Save, Plus, Flame, Check, X, Bell, Volume2, Sparkles, Database,
  History, Calendar, Search
} from 'lucide-react';
import { 
  fetchOrders, 
  updateOrderStatus, 
  fetchProducts, 
  updateProductDetails, 
  subscribeToRealtime,
  fetchStoreSettings,
  updateStoreSettings
} from '../../utils/dataService';
import { isSupabaseConfigured, getSupabase } from '../../utils/supabase/client';
import { playChime } from '../../utils/audio';

const DEFAULT_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN || 'khaopiyoashkaro';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('khaomojo_admin_auth') === 'true';
    }
    return false;
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Active Tab: 'orders', 'history', or 'inventory'
  const [activeTab, setActiveTab] = useState('orders');

  // Orders State
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orderFilter, setOrderFilter] = useState('all'); // 'all', 'pending', 'processing', 'delivered'
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [latestOrderAlert, setLatestOrderAlert] = useState(null);
  const [hasDesktopNotificationPerm, setHasDesktopNotificationPerm] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission === 'granted';
    }
    return false;
  });

  // Store Settings State (Open / Closed toggle moved to admin)
  const [storeIsOpen, setStoreIsOpen] = useState(true);
  const [isTogglingStore, setIsTogglingStore] = useState(false);

  // Order History Filter & Search State
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all'); // 'all', 'delivered', 'cancelled'

  // Products State
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null); // id of product being edited
  const [saveSuccessId, setSaveSuccessId] = useState(null);

  // Supabase connection state
  const [isLiveDB] = useState(() => isSupabaseConfigured());

  // Track seen order IDs to prevent duplicate alerts
  const seenOrderIds = React.useRef(new Set());

  // Request browser notification permission
  const requestDesktopNotifications = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setHasDesktopNotificationPerm(perm === 'granted');
        if (perm === 'granted') {
          triggerOrderChime();
          new Notification('KhaoMojo Dispatch Active 🚀', {
            body: 'You will receive instant desktop alerts the exact second an order is placed!',
            icon: '/favicon.ico',
          });
        }
      } catch (err) {
        console.warn('Failed to request notification permission:', err);
      }
    }
  };

  // Trigger high-priority audio chime using HTML5 Audio (new Audio) + Synthesizer fallback
  const triggerOrderChime = () => {
    try {
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 1.0;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('HTML5 Audio playback caught, falling back to Web Audio synth:', err);
          playChime('new-order');
        });
      }
    } catch {
      playChime('new-order');
    }
  };

  // Load store open/close setting
  const loadStoreStatus = useCallback(async () => {
    try {
      const settings = await fetchStoreSettings();
      if (settings && typeof settings.is_open === 'boolean') {
        setStoreIsOpen(settings.is_open);
      }
    } catch (err) {
      console.error('Failed to load store settings in admin:', err);
    }
  }, []);

  // Handle Admin Store Open/Close Toggle
  const handleToggleStore = async () => {
    try {
      setIsTogglingStore(true);
      const nextStatus = !storeIsOpen;
      setStoreIsOpen(nextStatus); // Optimistic UI update
      await updateStoreSettings(nextStatus);
    } catch (err) {
      console.error('Failed to toggle store status in admin:', err);
      loadStoreStatus();
    } finally {
      setIsTogglingStore(false);
    }
  };

  // Fetch orders with Relational Join (orders with order_items and products)
  const loadOrders = useCallback(async (showSpinner = false) => {
    try {
      if (showSpinner) setOrdersLoading(true);
      const supabase = getSupabase();
      if (isSupabaseConfigured() && supabase) {
        // Relational join: orders with order_items and products
        const { data, error } = await supabase
          .from('orders')
          .select('*, order_items(*, products(*))')
          .order('created_at', { ascending: false });

        if (!error && data) {
          const hydratedData = data.map((order) => {
            if ((!order.order_items || order.order_items.length === 0) && typeof window !== 'undefined') {
              try {
                const localRaw = localStorage.getItem('khaomojo_orders');
                if (localRaw) {
                  const localList = JSON.parse(localRaw);
                  const found = localList.find((lo) => lo.id === order.id);
                  if (found && (found.order_items?.length || found.items?.length)) {
                    return {
                      ...order,
                      order_items: found.order_items || found.items,
                      items: found.items || found.order_items,
                    };
                  }
                }
              } catch {}
            }
            return order;
          });
          setOrders(hydratedData);
          hydratedData.forEach((o) => {
            if (o?.id) seenOrderIds.current.add(o.id);
          });
          return;
        }
        if (error) {
          console.warn('Supabase fetch orders with relational join error, trying dataService:', error.message);
        }
      }

      const data = await fetchOrders();
      setOrders(data);
      if (Array.isArray(data)) {
        data.forEach((o) => {
          if (o?.id) seenOrderIds.current.add(o.id);
        });
      }
    } catch (err) {
      console.error('Failed to load orders in admin:', err);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  const loadProducts = useCallback(async (showSpinner = false) => {
    try {
      if (showSpinner) setProductsLoading(true);
      const data = await fetchProducts();
      setProducts(data);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  // Dedicated handler for instant new order dispatch
  const handleIncomingOrder = useCallback((newRecord) => {
    if (!newRecord?.id) return;
    if (seenOrderIds.current.has(newRecord.id)) return;
    seenOrderIds.current.add(newRecord.id);

    // 1. Play audio chime the exact second order is received
    if (soundEnabled) {
      triggerOrderChime();
    }

    // 2. Trigger high-visibility toast alert
    setLatestOrderAlert(newRecord);
    setTimeout(() => {
      setLatestOrderAlert((curr) => (curr?.id === newRecord.id ? null : curr));
    }, 10000);

    // 3. Desktop native notification
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('🚨 New KhaoMojo Order!', {
          body: `Room ${newRecord.room_number || 'N/A'} • ₹${newRecord.total_amount || 0} • ${newRecord.customer_name || 'Student'}`,
          icon: '/favicon.ico',
        });
      } catch (err) {
        console.warn('Desktop notification error:', err);
      }
    }

    // 4. Prepend to list
    setOrders((prev) => {
      const exists = prev.some((o) => o.id === newRecord.id);
      if (exists) return prev;
      return [{ ...newRecord, items: newRecord.items || [] }, ...prev];
    });

    // 5. Hydrate full items from DB
    loadOrders(false);
    setTimeout(() => loadOrders(false), 800);
  }, [soundEnabled, loadOrders]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let isMounted = true;
    (async () => {
      await Promise.all([loadOrders(false), loadProducts(false), loadStoreStatus()]);
    })();

    const supabase = getSupabase();
    let supabaseChannel = null;

    // 1. Direct Supabase Realtime channel subscription to orders, order_items and store_settings
    if (isSupabaseConfigured() && supabase) {
      try {
        const channelId = `admin-live-orders-${Date.now()}`;
        supabaseChannel = supabase
          .channel(channelId)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'orders' },
            (payload) => {
              console.log('[Supabase Realtime INSERT on orders]:', payload.new);
              handleIncomingOrder(payload.new);
            }
          )
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'order_items' },
            () => {
              loadOrders(false);
            }
          )
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'orders' },
            (payload) => {
              const updated = payload.new;
              setOrders((prev) =>
                prev.map((o) => (o.id === updated.id ? { ...o, ...updated, items: o.items || [] } : o))
              );
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'store_settings' },
            (payload) => {
              if (payload?.new && typeof payload.new.is_open === 'boolean') {
                setStoreIsOpen(payload.new.is_open);
              }
            }
          )
          .subscribe((status, err) => {
            console.log(`[Admin Supabase Channel Status]: ${status}`, err || '');
          });
      } catch (err) {
        console.warn('Failed to subscribe direct Supabase channel in admin:', err);
      }
    }

    // 2. Also subscribe via dataService (handles local fallback & broadcast sync)
    const unsubscribeBroadcast = subscribeToRealtime({
      onOrderChange: (payload) => {
        const { eventType, new: newRecord } = payload;
        if (eventType === 'INSERT' && newRecord) {
          handleIncomingOrder(newRecord);
        } else if (eventType === 'UPDATE' && newRecord) {
          setOrders((prev) =>
            prev.map((o) => (o.id === newRecord.id ? { ...o, ...newRecord, items: o.items || [] } : o))
          );
        } else {
          loadOrders(false);
        }
      },
      onProductChange: (payload) => {
        if (payload.new) {
          setProducts((prev) =>
            prev.map((p) => (p.id === payload.new.id ? { ...p, ...payload.new } : p))
          );
        } else {
          loadProducts(false);
        }
      },
      onStoreSettingsChange: (payload) => {
        if (payload?.new && typeof payload.new.is_open === 'boolean') {
          setStoreIsOpen(payload.new.is_open);
        }
      },
    });

    return () => {
      isMounted = false;
      if (supabaseChannel && supabase) {
        supabase.removeChannel(supabaseChannel);
      }
      unsubscribeBroadcast();
    };
  }, [isAuthenticated, handleIncomingOrder, loadOrders, loadProducts, loadStoreStatus]);

  // Handle PIN Login (strictly requires khaopiyoashkaro or NEXT_PUBLIC_ADMIN_PIN)
  const handleLogin = (e) => {
    e.preventDefault();
    if (pinInput === DEFAULT_PIN || pinInput === 'khaopiyoashkaro') {
      setIsAuthenticated(true);
      sessionStorage.setItem('khaomojo_admin_auth', 'true');
      setPinError('');
      // Prime audio permissions on user click
      try {
        const audio = new Audio('/sounds/notification.mp3');
        audio.volume = 0.01;
        audio.play().then(() => audio.pause()).catch(() => {});
      } catch {}
    } else {
      setPinError('Incorrect admin password. Please try again.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('khaomojo_admin_auth');
    setPinInput('');
  };

  // Status transitions
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      // Optimistic update
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      await updateOrderStatus(orderId, newStatus);
    } catch (err) {
      console.error('Failed to update order status:', err);
      loadOrders();
    }
  };

  // Inline product editing
  const handleProductSave = async (product) => {
    try {
      await updateProductDetails(product.id, {
        price: Number(product.price),
        stock_count: Number(product.stock_count),
      });
      setSaveSuccessId(product.id);
      setTimeout(() => setSaveSuccessId(null), 2000);
      setEditingProduct(null);
    } catch (err) {
      console.error('Failed to save product:', err);
    }
  };

  const handleQuickRestock = async (productId, delta) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    const newStock = Math.max(0, (prod.stock_count || 0) + delta);
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock_count: newStock } : p))
    );
    await updateProductDetails(productId, { stock_count: newStock });
  };

  // Metrics Calculations for active orders
  const metrics = useMemo(() => {
    const totalRevenue = orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const pendingCount = orders.filter((o) => o.status === 'pending').length;
    const processingCount = orders.filter((o) => o.status === 'processing').length;
    const deliveredCount = orders.filter((o) => o.status === 'delivered').length;
    const lowStockCount = products.filter((p) => (p.stock_count || 0) <= 5).length;

    return { totalRevenue, pendingCount, processingCount, deliveredCount, lowStockCount };
  }, [orders, products]);

  const filteredOrders = orders.filter((order) => {
    if (orderFilter === 'all') return true;
    return order.status === orderFilter;
  });

  // Order History Panel Calculations (status = 'delivered' or 'cancelled')
  const historyOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'delivered' || o.status === 'cancelled');
  }, [orders]);

  const historyMetrics = useMemo(() => {
    const deliveredOrders = historyOrders.filter((o) => o.status === 'delivered');
    const totalRevenue = deliveredOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const deliveredCount = deliveredOrders.length;
    const cancelledCount = historyOrders.filter((o) => o.status === 'cancelled').length;
    return { totalRevenue, deliveredCount, cancelledCount };
  }, [historyOrders]);

  const filteredHistoryOrders = useMemo(() => {
    return historyOrders.filter((order) => {
      if (historyStatusFilter !== 'all' && order.status !== historyStatusFilter) {
        return false;
      }
      if (!historySearchQuery.trim()) return true;
      const q = historySearchQuery.toLowerCase();
      const name = (order.customer_name || '').toLowerCase();
      const room = (order.room_number || '').toLowerCase();
      const phone = (order.phone_number || '').toLowerCase();
      const itemsList = order.order_items || order.items || [];
      const itemMatch = itemsList.some((it) => {
        const prodName = (it.products?.name || (Array.isArray(it.products) ? it.products[0]?.name : null) || it.product_name || '').toLowerCase();
        return prodName.includes(q);
      });
      return name.includes(q) || room.includes(q) || phone.includes(q) || itemMatch;
    });
  }, [historyOrders, historyStatusFilter, historySearchQuery]);

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 font-sans text-zinc-100">
        <div className="w-full max-w-md p-8 rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-2xl relative overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 right-0 h-32 w-32 bg-emerald-500/10 blur-2xl pointer-events-none" />

          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-zinc-800 border border-zinc-700 text-emerald-400 mb-3 shadow">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              KhaoMojo Admin Portal
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Late-night kitchen & printer dispatch manager
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Enter Admin Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                <input
                  type="password"
                  autoFocus
                  placeholder="Enter Admin Password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition font-mono tracking-wider"
                />
              </div>
            </div>

            {pinError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400">
                {pinError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20"
            >
              Unlock Dashboard
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-zinc-800 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Storefront</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Top Admin Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition"
              title="Return to Student Storefront"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white flex items-center gap-2">
                  <span>KhaoMojo Dispatch</span>
                  <span className="hidden sm:inline-flex px-1.5 py-0.2 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Live Dashboard
                  </span>
                </h1>
              </div>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Database indicator */}
            <span
              className={`hidden lg:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono border ${
                isLiveDB
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                  : 'bg-zinc-800 text-zinc-300 border-zinc-700'
              }`}
            >
              <Database className="w-3 h-3" />
              {isLiveDB ? 'Supabase Realtime' : 'Demo DB Mode'}
            </span>

            {/* Desktop Alerts Request Button */}
            <button
              onClick={requestDesktopNotifications}
              className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition ${
                hasDesktopNotificationPerm
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
              }`}
              title={hasDesktopNotificationPerm ? 'Desktop Notifications Active' : 'Enable Desktop Notifications'}
            >
              <Bell className="w-3.5 h-3.5" />
              <span className="text-[11px]">{hasDesktopNotificationPerm ? 'Alerts ON' : 'Enable Alerts'}</span>
            </button>

            {/* Test Audio Chime */}
            <button
              onClick={triggerOrderChime}
              className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-emerald-400 transition flex items-center gap-1.5"
              title="Test audio chime now"
            >
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] hidden md:inline">Test Chime</span>
            </button>

            {/* Audio Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                soundEnabled
                  ? 'bg-zinc-900 border-zinc-700 text-emerald-400'
                  : 'bg-zinc-900/50 border-zinc-800 text-zinc-500'
              }`}
              title={soundEnabled ? 'Order sound alert ON' : 'Order sound alert MUTED'}
            >
              <Volume2 className={`w-4 h-4 ${!soundEnabled ? 'opacity-40 line-through' : ''}`} />
            </button>

            {/* Manual Refresh */}
            <button
              onClick={() => {
                loadOrders();
                loadProducts();
              }}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition"
              title="Refresh Orders & Inventory"
            >
              <RefreshCw className={`w-4 h-4 ${ordersLoading ? 'animate-spin' : ''}`} />
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-rose-950/40 border border-zinc-800 hover:border-rose-800 text-zinc-400 hover:text-rose-400 transition"
              title="Lock & Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Floating New Order Alert Toast */}
      {latestOrderAlert && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 animate-in slide-in-from-top-4 duration-300">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-zinc-950 font-bold shadow-2xl flex items-center gap-3.5 border-2 border-emerald-300 ring-4 ring-emerald-500/20 max-w-md">
            <div className="h-10 w-10 rounded-xl bg-black/15 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider font-black px-1.5 py-0.5 rounded bg-black/20">
                  LIVE ORDER
                </span>
                <span className="text-xs text-zinc-900 font-mono">
                  Room {latestOrderAlert.room_number || 'N/A'}
                </span>
              </div>
              <div className="text-sm font-extrabold truncate mt-0.5">
                Total: ₹{Number(latestOrderAlert.total_amount || 0).toFixed(0)}
              </div>
              <div className="text-xs font-medium text-zinc-900/80 truncate">
                {latestOrderAlert.customer_name ? `${latestOrderAlert.customer_name} • ` : ''}
                {latestOrderAlert.phone_number || 'Prepaid UPI'}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setOrderFilter('all');
                  setActiveTab('orders');
                  setLatestOrderAlert(null);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-black/20 hover:bg-black/30 text-xs font-bold transition shrink-0"
              >
                View
              </button>
              <button
                onClick={() => setLatestOrderAlert(null)}
                className="p-1 rounded-lg hover:bg-black/20 transition shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Admin Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Store Operating Status Controller (Moved completely to /admin for security) */}
        <div className={`p-4 sm:p-5 rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl ${
          storeIsOpen
            ? 'bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-zinc-900/90 border-emerald-500/40 shadow-emerald-500/5'
            : 'bg-gradient-to-r from-rose-950/40 via-zinc-900 to-zinc-900/90 border-rose-500/40 shadow-rose-500/5'
        }`}>
          <div className="flex items-start sm:items-center gap-3.5">
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner ${
              storeIsOpen
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}>
              {storeIsOpen ? <Sparkles className="w-6 h-6 animate-pulse" /> : <Lock className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-extrabold text-white">Storefront Status Controller:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider border ${
                  storeIsOpen
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}>
                  {storeIsOpen ? '● Store is OPEN (Accepting Orders)' : '● Store is CLOSED (Cart Disabled)'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 max-w-xl">
                {storeIsOpen
                  ? 'The public storefront is currently open. Students can add items to cart, attach assignments, and checkout.'
                  : 'The public storefront is closed. Homepage displays the Closed notice and disables the cart for all students.'}
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleStore}
            disabled={isTogglingStore}
            className={`px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 shrink-0 ${
              storeIsOpen
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/25 hover:scale-[1.02] active:scale-[0.98]'
                : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98]'
            } disabled:opacity-50`}
          >
            {isTogglingStore ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Updating Store...</span>
              </>
            ) : storeIsOpen ? (
              <>
                <Lock className="w-4 h-4" />
                <span>Close Store Now</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Open Store Now</span>
              </>
            )}
          </button>
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {/* Revenue */}
          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/80">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
              <span>Tonight Revenue</span>
              <Banknote className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black font-mono text-emerald-400">
              ₹{metrics.totalRevenue.toFixed(0)}
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">
              {metrics.deliveredCount} delivered orders
            </div>
          </div>

          {/* Pending Kitchen Queue */}
          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/80">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
              <span>Pending Orders</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black font-mono text-amber-400">
              {metrics.pendingCount}
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">Awaiting confirmation</div>
          </div>

          {/* In Processing / Out for Delivery */}
          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/80">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
              <span>Out for Delivery</span>
              <Flame className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-black font-mono text-cyan-400">
              {metrics.processingCount}
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">On runners route</div>
          </div>

          {/* Low Stock Alerts */}
          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/80">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
              <span>Low Stock Alerts</span>
              <AlertCircle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-black font-mono text-rose-400">
              {metrics.lowStockCount}
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">Items ≤ 5 stock count</div>
          </div>
        </div>

        {/* Tab Switcher: Orders vs History vs Inventory */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
                activeTab === 'orders'
                  ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Real-time Orders Feed</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-black/20">
                {orders.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
                activeTab === 'history'
                  ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Order History</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-black/20">
                {historyOrders.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
                activeTab === 'inventory'
                  ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              <span>Inventory & Prices Manager</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-black/20">
                {products.length}
              </span>
            </button>
          </div>
        </div>

        {/* TAB 1: REAL-TIME ORDER FEED */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* Status Filter Sub-bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {['all', 'pending', 'processing', 'delivered', 'cancelled'].map((st) => (
                <button
                  key={st}
                  onClick={() => setOrderFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition shrink-0 ${
                    orderFilter === st
                      ? 'bg-zinc-800 text-white border border-zinc-700'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {st} (
                  {st === 'all'
                    ? orders.length
                    : orders.filter((o) => o.status === st).length}
                  )
                </button>
              ))}
            </div>

            {/* Orders List */}
            {ordersLoading ? (
              <div className="text-center py-16 text-zinc-500 text-sm">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-zinc-400" />
                <span>Loading incoming orders...</span>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-12 rounded-3xl bg-zinc-900/40 border border-zinc-800 text-center space-y-2">
                <ShoppingBag className="w-10 h-10 text-zinc-600 mx-auto" />
                <h3 className="text-base font-bold text-white">No orders matching filter</h3>
                <p className="text-xs text-zinc-400">
                  New orders will instantly pop up here in real-time as students check out.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOrders.map((order) => {
                  const isPending = order.status === 'pending';
                  const isProcessing = order.status === 'processing';
                  const isDelivered = order.status === 'delivered';
                  const isCancelled = order.status === 'cancelled';

                  return (
                    <div
                      key={order.id}
                      className={`relative flex flex-col justify-between p-5 rounded-2xl bg-zinc-900/90 border transition-all shadow-lg ${
                        isPending
                          ? 'border-amber-500/50 shadow-amber-500/5'
                          : isProcessing
                          ? 'border-cyan-500/50 shadow-cyan-500/5'
                          : isDelivered
                          ? 'border-emerald-500/30'
                          : 'border-zinc-800 opacity-60'
                      }`}
                    >
                      {/* Top Bar: Room Number & Status */}
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="min-w-0">
                            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
                              Deliver To:
                            </span>
                            <div className="text-lg font-black text-white tracking-tight flex items-center gap-1.5 truncate">
                              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span className="truncate">{order.room_number}</span>
                            </div>
                          </div>

                          {/* Status Pill */}
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 border ${
                              isPending
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                                : isProcessing
                                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                                : isDelivered
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>

                        {/* Customer Info */}
                        <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-xs space-y-1 mb-3">
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-400 flex items-center gap-1">
                              <User className="w-3 h-3 text-zinc-500" />
                              {order.customer_name}
                            </span>
                            <a
                              href={`tel:${order.phone_number}`}
                              className="font-mono text-emerald-400 hover:underline flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3" />
                              {order.phone_number}
                            </a>
                          </div>
                          <div className="text-[10px] text-zinc-500">
                            Ordered: {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>

                        {/* Order Items List (Iterating over order.order_items with relational products join) */}
                        <div className="space-y-1.5 mb-4">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                            Order Items:
                          </span>
                          <div className="mt-2 space-y-1">
                            {order.order_items && order.order_items.length > 0 ? (
                              order.order_items.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm text-[#F5F2EB]">
                                  <span>{item.quantity}x {item.product_name || item.products?.name || 'Unknown Item'}</span>
                                </div>
                              ))
                            ) : (
                              <div className="text-xs text-red-400 font-mono">⚠️ Items missing in database</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Footer: Total & Status Action Buttons */}
                      <div className="pt-3 border-t border-zinc-800">
                        <div className="flex items-center justify-between mb-3 text-xs">
                          <span className="text-zinc-400">Total (Prepaid UPI):</span>
                          <span className="text-base font-bold font-mono text-emerald-400">
                            ₹{Number(order.total_amount).toFixed(0)}
                          </span>
                        </div>

                        {/* Status Stepper Action Buttons */}
                        <div className="grid grid-cols-2 gap-2">
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleStatusChange(order.id, 'processing')}
                                className="py-2 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition text-center shadow"
                              >
                                Start Preparing
                              </button>
                              <button
                                onClick={() => handleStatusChange(order.id, 'cancelled')}
                                className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-rose-900/60 text-zinc-400 hover:text-rose-300 font-semibold text-xs transition text-center"
                              >
                                Cancel Order
                              </button>
                            </>
                          )}

                          {isProcessing && (
                            <>
                              <button
                                onClick={() => handleStatusChange(order.id, 'delivered')}
                                className="py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition text-center shadow col-span-2"
                              >
                                ✓ Mark Delivered
                              </button>
                            </>
                          )}

                          {isDelivered && (
                            <div className="col-span-2 text-center text-xs text-emerald-400 font-semibold flex items-center justify-center gap-1 py-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Delivered to Room</span>
                            </div>
                          )}

                          {isCancelled && (
                            <div className="col-span-2 text-center text-xs text-rose-400 font-semibold py-1">
                              Order Cancelled
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ORDER HISTORY (Delivered & Cancelled) */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            {/* Top Stat Cards for History */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">
                <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                  <span>Delivered Revenue</span>
                  <Banknote className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black font-mono text-emerald-400">
                  ₹{historyMetrics.totalRevenue.toFixed(0)}
                </div>
                <div className="text-[10px] text-zinc-500 mt-1">
                  Total collected from delivered orders
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">
                <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                  <span>Fulfilled Orders</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black font-mono text-white">
                  {historyMetrics.deliveredCount}
                </div>
                <div className="text-[10px] text-zinc-500 mt-1">
                  Orders successfully delivered
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">
                <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                  <span>Cancelled Orders</span>
                  <X className="w-4 h-4 text-rose-400" />
                </div>
                <div className="text-2xl font-black font-mono text-rose-400">
                  {historyMetrics.cancelledCount}
                </div>
                <div className="text-[10px] text-zinc-500 mt-1">
                  Out of stock or student cancelled
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Filter pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                {[
                  { id: 'all', label: 'All History', count: historyOrders.length },
                  { id: 'delivered', label: 'Delivered', count: historyMetrics.deliveredCount },
                  { id: 'cancelled', label: 'Cancelled', count: historyMetrics.cancelledCount },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setHistoryStatusFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${
                      historyStatusFilter === tab.id
                        ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                        : 'text-zinc-400 hover:text-white border border-transparent'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-black/30">
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search customer, room, phone, item..."
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
                />
                {historySearchQuery && (
                  <button
                    onClick={() => setHistorySearchQuery('')}
                    className="absolute right-2.5 top-2 text-zinc-500 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* History Table Container */}
            <div className="rounded-3xl bg-zinc-900/80 border border-zinc-800 overflow-hidden shadow-xl">
              <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <History className="w-4 h-4 text-emerald-400" />
                    <span>Archived Order History</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Records of delivered & cancelled orders with full customer and item details
                  </p>
                </div>
                <button
                  onClick={loadOrders}
                  className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition"
                  title="Reload Orders"
                >
                  <RefreshCw className={`w-4 h-4 ${ordersLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {filteredHistoryOrders.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <History className="w-10 h-10 text-zinc-600 mx-auto" />
                  <h4 className="text-sm font-bold text-white">No order history records found</h4>
                  <p className="text-xs text-zinc-400">
                    {historySearchQuery
                      ? `No history records matching "${historySearchQuery}".`
                      : 'Orders marked as delivered or cancelled will automatically appear in this historical archive.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 uppercase font-mono tracking-wider text-[11px]">
                        <th className="py-3 px-4">Date & Time</th>
                        <th className="py-3 px-4">Customer Details</th>
                        <th className="py-3 px-4">Room Number</th>
                        <th className="py-3 px-4">Items Purchased</th>
                        <th className="py-3 px-4 text-right">Revenue</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-sans">
                      {filteredHistoryOrders.map((order) => {
                        const itemsList = (order.order_items && order.order_items.length > 0)
                          ? order.order_items
                          : (order.items || []);
                        const isDelivered = order.status === 'delivered';

                        return (
                          <tr key={order.id} className="hover:bg-zinc-950/30 transition">
                            {/* Date & Time */}
                            <td className="py-3.5 px-4 align-top whitespace-nowrap">
                              <div className="font-semibold text-white">
                                {new Date(order.created_at).toLocaleDateString('en-IN', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </div>
                              <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                                {new Date(order.created_at).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </td>

                            {/* Customer Details */}
                            <td className="py-3.5 px-4 align-top">
                              <div className="font-semibold text-white flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                <span>{order.customer_name || 'Student'}</span>
                              </div>
                              <div className="mt-0.5">
                                <a
                                  href={`tel:${order.phone_number}`}
                                  className="text-emerald-400 hover:underline font-mono text-[11px] inline-flex items-center gap-1"
                                >
                                  <Phone className="w-2.5 h-2.5" />
                                  <span>{order.phone_number || 'N/A'}</span>
                                </a>
                              </div>
                            </td>

                            {/* Room Number */}
                            <td className="py-3.5 px-4 align-top whitespace-nowrap">
                              <div className="inline-flex items-center gap-1 font-mono font-bold text-white bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800 text-[11px]">
                                <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                                <span>{order.room_number}</span>
                              </div>
                            </td>

                            {/* Items Purchased */}
                            <td className="py-3.5 px-4 align-top min-w-[240px]">
                              <div className="space-y-1.5">
                                {itemsList.map((item, idx) => {
                                  const prodName = item.products?.name || (Array.isArray(item.products) ? item.products[0]?.name : null) || item.product_name || 'Item';
                                  const qty = item.quantity || 1;
                                  const unitPrice = item.unit_price || item.price || 0;

                                  return (
                                    <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                                      <span className="text-zinc-200">
                                        <strong className="text-white font-mono">{qty}x</strong> {prodName}
                                      </span>
                                      <span className="text-zinc-400 font-mono text-[11px] shrink-0">
                                        ₹{(unitPrice * qty).toFixed(0)}
                                      </span>
                                    </div>
                                  );
                                })}

                                {itemsList.length === 0 && (
                                  <span className="text-zinc-500 italic text-[11px]">No items details</span>
                                )}
                              </div>
                            </td>

                            {/* Revenue */}
                            <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                              <div className={`font-mono font-bold text-sm ${
                                isDelivered ? 'text-emerald-400' : 'text-zinc-500 line-through'
                              }`}>
                                ₹{Number(order.total_amount || 0).toFixed(0)}
                              </div>
                              <div className="text-[10px] text-zinc-500">
                                {isDelivered ? 'Settled' : 'Not Collected'}
                              </div>
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4 align-top text-center whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                isDelivered
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              }`}>
                                {isDelivered ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Delivered</span>
                                  </>
                                ) : (
                                  <>
                                    <X className="w-3 h-3" />
                                    <span>Cancelled</span>
                                  </>
                                )}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: INVENTORY & PRICES MANAGER */}
        {activeTab === 'inventory' && (
          <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Live Inventory & Prices</h2>
                <p className="text-xs text-zinc-400">
                  Edit stock counts and prices in real-time. Changes instantly reflect on student screens.
                </p>
              </div>

              <button
                onClick={loadProducts}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition"
                title="Reload Inventory"
              >
                <RefreshCw className={`w-4 h-4 ${productsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 uppercase font-mono tracking-wider">
                    <th className="py-3 px-3">Item</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Price (₹)</th>
                    <th className="py-3 px-3">Stock Count</th>
                    <th className="py-3 px-3">Quick Restock</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {products.map((p) => {
                    const isEditing = editingProduct?.id === p.id;
                    const isSuccess = saveSuccessId === p.id;

                    return (
                      <tr key={p.id} className="hover:bg-zinc-950/40 transition">
                        {/* Name & Image */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={p.image_url ? encodeURI(p.image_url) : '/placeholder.png'}
                              alt={p.name}
                              className="h-9 w-9 rounded-lg object-cover bg-zinc-950 shrink-0 border border-zinc-800"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = '/placeholder.png';
                              }}
                            />
                            <div>
                              <div className="font-semibold text-white">{p.name}</div>
                              <div className="text-[10px] text-zinc-500 font-mono">
                                ID: {p.id.slice(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category / Section */}
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-800 text-zinc-300">
                            {p.section_name || p.category}
                          </span>
                        </td>

                        {/* Price */}
                        <td className="py-3 px-3">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editingProduct.price}
                              onChange={(e) =>
                                setEditingProduct({ ...editingProduct, price: e.target.value })
                              }
                              className="w-20 px-2 py-1 rounded bg-zinc-950 border border-emerald-500 text-white font-mono"
                            />
                          ) : (
                            <span className="font-mono font-bold text-emerald-400">
                              ₹{Number(p.price).toFixed(0)}
                            </span>
                          )}
                        </td>

                        {/* Stock Count */}
                        <td className="py-3 px-3">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editingProduct.stock_count}
                              onChange={(e) =>
                                setEditingProduct({ ...editingProduct, stock_count: e.target.value })
                              }
                              className="w-20 px-2 py-1 rounded bg-zinc-950 border border-emerald-500 text-white font-mono"
                            />
                          ) : (
                            <span
                              className={`font-mono font-bold ${
                                p.stock_count === 0
                                  ? 'text-rose-400'
                                  : p.stock_count <= 5
                                  ? 'text-amber-400'
                                  : 'text-zinc-200'
                              }`}
                            >
                              {p.stock_count}{' '}
                              {p.stock_count === 0 && (
                                <span className="text-[10px] text-rose-500 uppercase font-sans">
                                  (Out)
                                </span>
                              )}
                            </span>
                          )}
                        </td>

                        {/* Quick Restock Buttons */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleQuickRestock(p.id, 10)}
                              className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-semibold text-[10px] transition"
                            >
                              +10
                            </button>
                            <button
                              onClick={() => handleQuickRestock(p.id, 25)}
                              className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-semibold text-[10px] transition"
                            >
                              +25
                            </button>
                            <button
                              onClick={() => handleQuickRestock(p.id, -1)}
                              className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white font-semibold text-[10px] transition"
                            >
                              -1
                            </button>
                          </div>
                        </td>

                        {/* Action buttons */}
                        <td className="py-3 px-3 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleProductSave(editingProduct)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold transition flex items-center gap-1"
                              >
                                <Save className="w-3 h-3" />
                                <span>Save</span>
                              </button>
                              <button
                                onClick={() => setEditingProduct(null)}
                                className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : isSuccess ? (
                            <span className="text-emerald-400 font-bold inline-flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Saved
                            </span>
                          ) : (
                            <button
                              onClick={() => setEditingProduct({ ...p })}
                              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-semibold transition inline-flex items-center gap-1"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
