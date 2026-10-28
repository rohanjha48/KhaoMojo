'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  ShoppingBag, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Truck, 
  ChefHat, 
  LogOut, 
  RefreshCw, 
  AlertCircle, 
  Calendar, 
  MapPin, 
  Phone, 
  FileText, 
  ExternalLink,
  Ban,
  Loader2
} from 'lucide-react';
import { useAuth } from '../../components/AuthContext';
import { getSupabase } from '../../utils/supabase/client';

export default function ProfilePage() {
  const { user, loading: authLoading, openAuthModal, signOut } = useAuth();
  const [orders, setOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [cancelModalOrder, setCancelModalOrder] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // Fetch orders for the logged-in user
  const fetchOrders = useCallback(async () => {
    if (!user) {
      setOrders([]);
      setIsLoadingOrders(false);
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setIsLoadingOrders(false);
      return;
    }

    try {
      setIsLoadingOrders(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          customer_name,
          room_number,
          phone_number,
          utr_number,
          total_amount,
          status,
          created_at,
          order_items (
            id,
            product_name,
            quantity,
            price_at_time,
            print_file_url
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Profile] Error fetching orders:', error);
      } else {
        setOrders(data || []);
      }
    } catch (err) {
      console.error('[Profile] Exception fetching orders:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  }, [user]);

  // Initial fetch and Realtime subscription
  useEffect(() => {
    fetchOrders();

    if (!user) return;

    const supabase = getSupabase();
    if (!supabase) return;

    const channel = supabase
      .channel(`profile-orders-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchOrders]);

  // Handle Cancel Order
  const handleCancelOrder = async () => {
    if (!cancelModalOrder || !user) return;

    const supabase = getSupabase();
    if (!supabase) return;

    try {
      setIsCancelling(true);

      // Attempt direct update using RLS policy
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', cancelModalOrder.id)
        .eq('user_id', user.id)
        .eq('status', 'pending');

      if (error) {
        // Fallback to RPC if direct update failed
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('cancel_my_order', {
          p_order_id: cancelModalOrder.id,
        });

        if (rpcErr || (rpcRes && rpcRes.success === false)) {
          throw new Error(rpcErr?.message || rpcRes?.message || 'Could not cancel order.');
        }
      }

      // Optimistically update the UI
      setOrders((prev) =>
        prev.map((o) => (o.id === cancelModalOrder.id ? { ...o, status: 'cancelled' } : o))
      );

      setActionMessage({
        type: 'success',
        text: `Order #${cancelModalOrder.id.slice(0, 6).toUpperCase()} cancelled successfully.`,
      });

      setCancelModalOrder(null);
    } catch (err) {
      console.error('[Profile] Failed to cancel order:', err);
      setActionMessage({
        type: 'error',
        text: err.message || 'Failed to cancel order. It may have already been processed.',
      });
    } finally {
      setIsCancelling(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  // Helper: Status Badge formatting
  const renderStatusBadge = (status) => {
    const s = (status || 'pending').toLowerCase();
    switch (s) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3 animate-pulse" />
            <span>Order Placed (Pending)</span>
          </span>
        );
      case 'preparing':
      case 'in-progress':
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30">
            <ChefHat className="w-3 h-3" />
            <span>Preparing in Kitchen</span>
          </span>
        );
      case 'out_for_delivery':
      case 'out for delivery':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
            <Truck className="w-3 h-3" />
            <span>Out for Delivery</span>
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            <span>Delivered</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3 h-3" />
            <span>Cancelled</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#292520] text-[#A8A29E] border border-[#2E2924]">
            {status}
          </span>
        );
    }
  };

  // Helper: Format timestamp
  const formatOrderDate = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#141210] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#FF5500] animate-spin" />
          <p className="text-xs text-[#A8A29E]">Loading your account...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated View
  if (!user) {
    return (
      <div className="min-h-screen bg-[#141210] text-[#F5F2EB] flex flex-col">
        {/* Navigation Bar */}
        <header className="sticky top-0 z-30 w-full bg-[#141210]/95 backdrop-blur-md border-b border-[#2E2924] py-3">
          <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 text-xs font-semibold text-[#A8A29E] hover:text-[#F5F2EB] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Store</span>
            </Link>
            <div className="flex items-center gap-1.5 font-bold text-sm tracking-tight">
              <span>Khao<span className="text-[#FF5500]">Mojo</span></span>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-md mx-auto w-full px-4 py-16 flex flex-col items-center justify-center text-center">
          <div className="h-16 w-16 rounded-2xl bg-[#1F1C18] border border-[#2E2924] flex items-center justify-center text-[#FF5500] mb-5 shadow-xl">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#F5F2EB] mb-2">
            Sign In to View Orders
          </h1>
          <p className="text-xs text-[#A8A29E] leading-relaxed max-w-xs mb-6">
            Track your late-night food deliveries, live order status, and assignment printouts with your account.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
            <button
              onClick={openAuthModal}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#FF5500] hover:bg-[#ff6a1a] text-white font-bold text-xs shadow-lg shadow-[#FF5500]/20 transition-all cursor-pointer"
            >
              Sign In / Sign Up
            </button>
            <Link
              href="/"
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#1F1C18] hover:bg-[#292520] border border-[#2E2924] text-[#F5F2EB] font-semibold text-xs text-center transition-colors"
            >
              Browse Menu
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Authenticated View
  return (
    <div className="min-h-screen bg-[#141210] text-[#F5F2EB] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 w-full bg-[#141210]/95 backdrop-blur-md border-b border-[#2E2924] py-3">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-semibold text-[#A8A29E] hover:text-[#F5F2EB] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Store</span>
          </Link>

          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-[#FF5500] flex items-center justify-center text-white font-black text-xs">
              KM
            </div>
            <span className="font-bold text-sm tracking-tight">
              My <span className="text-[#FF5500]">Orders</span>
            </span>
          </div>

          <button
            onClick={signOut}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1F1C18] hover:bg-rose-500/10 border border-[#2E2924] hover:border-rose-500/30 text-[#A8A29E] hover:text-rose-400 text-xs font-medium transition-colors cursor-pointer"
            title="Sign out of account"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 space-y-6">
        {/* User Profile Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#1F1C18] border border-[#2E2924] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-[#FF5500]/20 border border-[#FF5500]/40 flex items-center justify-center text-[#FF5500] font-black text-lg">
              {user.email ? user.email[0].toUpperCase() : 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[#F5F2EB]">
                  {user.user_metadata?.full_name || user.email?.split('@')[0]}
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#FF5500]/15 text-[#FF5500] border border-[#FF5500]/30 font-mono">
                  Member
                </span>
              </div>
              <p className="text-xs text-[#A8A29E] font-mono mt-0.5">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#A8A29E] bg-[#141210] px-3 py-2 rounded-xl border border-[#2E2924]">
            <Clock className="w-4 h-4 text-[#FF5500]" />
            <span>Hostel Late-Night Service (10 PM – 4 AM)</span>
          </div>
        </div>

        {/* Action Notifications */}
        {actionMessage && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              actionMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
        )}

        {/* Orders Header */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <h3 className="text-base font-bold text-[#F5F2EB] tracking-tight">Order History</h3>
            <p className="text-xs text-[#A8A29E]">Realtime updates for your midnight deliveries</p>
          </div>

          <button
            onClick={fetchOrders}
            disabled={isLoadingOrders}
            className="p-2 rounded-lg bg-[#1F1C18] hover:bg-[#292520] border border-[#2E2924] text-[#A8A29E] hover:text-[#F5F2EB] text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh orders"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingOrders ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Orders List */}
        {isLoadingOrders && orders.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <Loader2 className="w-6 h-6 text-[#FF5500] animate-spin" />
            <p className="text-xs text-[#A8A29E]">Retrieving your orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#1F1C18] border border-[#2E2924] text-center space-y-3">
            <div className="h-12 w-12 rounded-xl bg-[#141210] border border-[#2E2924] flex items-center justify-center text-[#A8A29E] mx-auto">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-[#F5F2EB]">No orders placed yet</h4>
            <p className="text-xs text-[#A8A29E] max-w-xs mx-auto">
              Ready for snacks, Maggi, Kurkure or document prints? Place an order and track it here in real-time!
            </p>
            <Link
              href="/"
              className="inline-block mt-2 py-2 px-4 rounded-xl bg-[#FF5500] hover:bg-[#ff6a1a] text-white font-bold text-xs shadow-sm transition-all"
            >
              Browse Menu
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const isPending = order.status?.toLowerCase() === 'pending';
              const itemsList = order.order_items || [];

              return (
                <div
                  key={order.id}
                  className="rounded-2xl bg-[#1F1C18] border border-[#2E2924] p-4 sm:p-5 space-y-4 hover:border-[#38332C] transition-all shadow-lg"
                >
                  {/* Order Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2E2924] pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold text-xs text-[#FF5500] bg-[#FF5500]/10 border border-[#FF5500]/25 px-2 py-0.5 rounded">
                        #KM-{order.id.slice(0, 6).toUpperCase()}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs text-[#A8A29E]">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatOrderDate(order.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      {renderStatusBadge(order.status)}
                    </div>
                  </div>

                  {/* Delivery & Payment Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="flex items-center gap-2 text-[#A8A29E] bg-[#141210] p-2.5 rounded-xl border border-[#2E2924]">
                      <MapPin className="w-3.5 h-3.5 text-[#FF5500] shrink-0" />
                      <span className="truncate">
                        <strong className="text-[#F5F2EB]">Room:</strong> {order.room_number}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[#A8A29E] bg-[#141210] p-2.5 rounded-xl border border-[#2E2924]">
                      <Phone className="w-3.5 h-3.5 text-[#FF5500] shrink-0" />
                      <span className="truncate">
                        <strong className="text-[#F5F2EB]">Phone:</strong> {order.phone_number}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[#A8A29E] bg-[#141210] p-2.5 rounded-xl border border-[#2E2924]">
                      <span className="font-mono text-[10px] bg-[#292520] text-emerald-400 px-1 rounded border border-[#2E2924]">
                        UTR
                      </span>
                      <span className="truncate font-mono">
                        {order.utr_number || 'Prepaid UPI'}
                      </span>
                    </div>
                  </div>

                  {/* Ordered Items List */}
                  <div className="bg-[#141210] rounded-xl p-3 border border-[#2E2924] space-y-2">
                    <h5 className="text-[11px] font-semibold text-[#A8A29E] uppercase tracking-wider">
                      Ordered Items ({itemsList.reduce((acc, it) => acc + (it.quantity || 1), 0)})
                    </h5>
                    <div className="divide-y divide-[#2E2924]/60">
                      {itemsList.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="py-1.5 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[#FF5500] font-bold font-mono">
                              {item.quantity}x
                            </span>
                            <span className="text-[#F5F2EB] font-medium">
                              {item.product_name}
                            </span>
                            {item.print_file_url && (
                              <a
                                href={item.print_file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20 hover:underline"
                              >
                                <FileText className="w-3 h-3" />
                                <span>View PDF</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                          <span className="font-mono text-[#A8A29E]">
                            ₹{((item.price_at_time || 0) * (item.quantity || 1)).toFixed(0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Order Footer: Total and Action Buttons */}
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-xs text-[#A8A29E]">Total Paid: </span>
                      <span className="text-base font-bold text-[#F5F2EB] font-mono">
                        ₹{Number(order.total_amount || 0).toFixed(0)}
                      </span>
                    </div>

                    {/* Cancel Feature: Strictly only if pending */}
                    {isPending ? (
                      <button
                        onClick={() => setCancelModalOrder(order)}
                        className="py-1.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Cancel this pending order"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Cancel Order</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-[#A8A29E]/80 italic">
                        {order.status === 'cancelled'
                          ? 'Order was cancelled'
                          : 'Order locked / In progress'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Cancel Order Confirmation Modal */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            onClick={() => !isCancelling && setCancelModalOrder(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />

          <div className="relative w-full max-w-sm bg-[#141210] border border-[#2E2924] rounded-2xl p-5 shadow-2xl z-10 space-y-4">
            <div className="h-10 w-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Ban className="w-5 h-5" />
            </div>

            <div>
              <h3 className="text-base font-bold text-[#F5F2EB]">Cancel Order?</h3>
              <p className="text-xs text-[#A8A29E] mt-1 leading-relaxed">
                Are you sure you want to cancel order{' '}
                <strong className="text-[#F5F2EB]">
                  #KM-{cancelModalOrder.id.slice(0, 6).toUpperCase()}
                </strong>{' '}
                for ₹{Number(cancelModalOrder.total_amount).toFixed(0)}? This cannot be undone.
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => setCancelModalOrder(null)}
                className="flex-1 py-2 px-3 rounded-xl bg-[#1F1C18] hover:bg-[#292520] border border-[#2E2924] text-xs font-semibold text-[#A8A29E] hover:text-[#F5F2EB] transition-colors cursor-pointer"
              >
                Keep Order
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleCancelOrder}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <span>Yes, Cancel</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
