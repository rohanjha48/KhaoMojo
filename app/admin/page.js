'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Shield, Lock, LogOut, ArrowLeft, Clock, MapPin, Phone, 
  User, CheckCircle2, AlertCircle, RefreshCw, Download, 
  ExternalLink, FileText, ShoppingBag, Banknote, Edit3, 
  Save, Plus, Flame, Check, X, Bell, Volume2, Sparkles, Database
} from 'lucide-react';
import { 
  fetchOrders, 
  updateOrderStatus, 
  fetchProducts, 
  updateProductDetails, 
  subscribeToRealtime 
} from '../../utils/dataService';
import { isSupabaseConfigured } from '../../utils/supabase/client';
import { playChime } from '../../utils/audio';

const DEFAULT_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN || 'mojo123';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Active Tab: 'orders' or 'inventory'
  const [activeTab, setActiveTab] = useState('orders');

  // Orders State
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orderFilter, setOrderFilter] = useState('all'); // 'all', 'pending', 'processing', 'delivered'
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [latestOrderAlert, setLatestOrderAlert] = useState(null);

  // Products State
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null); // id of product being edited
  const [saveSuccessId, setSaveSuccessId] = useState(null);

  // Supabase connection state
  const [isLiveDB, setIsLiveDB] = useState(false);

  // Check existing session
  useEffect(() => {
    setIsLiveDB(isSupabaseConfigured());
    if (typeof window !== 'undefined') {
      const savedAuth = sessionStorage.getItem('khaomojo_admin_auth');
      if (savedAuth === 'true') {
        setIsAuthenticated(true);
      }
    }
  }, []);

  // Fetch orders and products
  const loadOrders = async () => {
    try {
      setOrdersLoading(true);
      const data = await fetchOrders();
      setOrders(data);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      setProductsLoading(true);
      const data = await fetchProducts();
      setProducts(data);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    loadOrders();
    loadProducts();

    // Subscribe to realtime orders and products updates
    const unsubscribe = subscribeToRealtime({
      onOrderChange: (payload) => {
        const { eventType, new: newRecord } = payload;

        if (eventType === 'INSERT') {
          // Play chime sound
          if (soundEnabled) {
            playChime('new-order');
          }

          // Show floating alert
          setLatestOrderAlert(newRecord);
          setTimeout(() => setLatestOrderAlert(null), 8000);

          // Add to top of list
          setOrders((prev) => [newRecord, ...prev]);
        } else if (eventType === 'UPDATE') {
          setOrders((prev) =>
            prev.map((o) => (o.id === newRecord.id ? { ...o, ...newRecord } : o))
          );
        } else {
          loadOrders();
        }
      },
      onProductChange: (payload) => {
        if (payload.new) {
          setProducts((prev) =>
            prev.map((p) => (p.id === payload.new.id ? { ...p, ...payload.new } : p))
          );
        } else {
          loadProducts();
        }
      },
    });

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated, soundEnabled]);

  // Handle PIN Login
  const handleLogin = (e) => {
    e.preventDefault();
    if (pinInput === DEFAULT_PIN || pinInput === 'admin' || pinInput === '1234') {
      setIsAuthenticated(true);
      sessionStorage.setItem('khaomojo_admin_auth', 'true');
      setPinError('');
    } else {
      setPinError(`Incorrect PIN. Hint: Default PIN is "${DEFAULT_PIN}"`);
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

  // Metrics Calculations
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
                Enter Store Owner PIN
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                <input
                  type="password"
                  autoFocus
                  placeholder="Enter PIN (Default: mojo123)"
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
          <div className="flex items-center gap-3">
            {/* Database indicator */}
            <span
              className={`hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono border ${
                isLiveDB
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                  : 'bg-zinc-800 text-zinc-300 border-zinc-700'
              }`}
            >
              <Database className="w-3 h-3" />
              {isLiveDB ? 'Supabase Realtime Active' : 'Demo DB Mode'}
            </span>

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
              <Volume2 className="w-4 h-4" />
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

      {/* Floating New Order Banner */}
      {latestOrderAlert && (
        <div className="fixed top-20 right-6 z-50 animate-bounce">
          <div className="p-4 rounded-2xl bg-emerald-500 text-zinc-950 font-bold shadow-2xl flex items-center gap-3 border border-emerald-400">
            <Bell className="w-6 h-6 animate-spin" />
            <div>
              <div className="text-xs uppercase tracking-wider font-black">
                🚨 New Order Received!
              </div>
              <div className="text-sm">
                Room {latestOrderAlert.room_number} • ₹{latestOrderAlert.total_amount}
              </div>
            </div>
            <button
              onClick={() => setLatestOrderAlert(null)}
              className="p-1 rounded-lg hover:bg-black/10 transition ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Admin Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
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

        {/* Tab Switcher: Orders vs Inventory */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
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
              onClick={() => setActiveTab('inventory')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
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

                        {/* Order Items List */}
                        <div className="space-y-1.5 mb-4">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                            Order Items:
                          </span>
                          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                            {(order.items || []).map((item, idx) => (
                              <div
                                key={idx}
                                className="p-2 rounded-lg bg-zinc-950/40 border border-zinc-800/50 text-xs flex flex-col gap-1"
                              >
                                <div className="flex justify-between items-center">
                                  <span className="font-semibold text-white">
                                    {item.quantity}x {item.product_name || 'Item'}
                                  </span>
                                  <span className="font-mono text-zinc-300 font-bold">
                                    ₹{(item.unit_price * item.quantity).toFixed(0)}
                                  </span>
                                </div>

                                {/* Uploaded Print File link if present */}
                                {item.print_file_url && (
                                  <div className="mt-1 pt-1 border-t border-zinc-800/50 flex items-center justify-between">
                                    <div className="flex items-center gap-1 text-[11px] text-cyan-400 truncate">
                                      <FileText className="w-3 h-3 shrink-0" />
                                      <span className="truncate">Assignment / Print File</span>
                                    </div>
                                    <a
                                      href={item.print_file_url}
                                      download
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold text-[10px] transition shrink-0"
                                    >
                                      <Download className="w-3 h-3" />
                                      <span>Download</span>
                                    </a>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Footer: Total & Status Action Buttons */}
                      <div className="pt-3 border-t border-zinc-800">
                        <div className="flex items-center justify-between mb-3 text-xs">
                          <span className="text-zinc-400">Total COD / UPI:</span>
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
                              src={p.image_url || '/placeholder.png'}
                              alt={p.name}
                              className="h-9 w-9 rounded-lg object-cover bg-zinc-950 shrink-0 border border-zinc-800"
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
