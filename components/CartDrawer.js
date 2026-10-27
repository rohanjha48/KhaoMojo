'use client';

import React, { useState } from 'react';
import { 
  X, Trash2, ShoppingBag, ArrowRight, ShieldCheck, 
  MapPin, Phone, User, CheckCircle2, Loader2, Sparkles, 
  QrCode, FileText, ExternalLink 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useCart } from './CartContext';
import { getSupabase } from '../utils/supabase/client';
import { playChime } from '../utils/audio';

export default function CartDrawer({ onOrderSuccess, storeIsOpen = false }) {
  const { 
    items, 
    isCartOpen, 
    setIsCartOpen, 
    updateQuantity, 
    removeFromCart, 
    clearCart, 
    totalItems, 
    totalAmount 
  } = useCart();

  const [customerName, setCustomerName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  if (!isCartOpen) return null;

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!storeIsOpen) {
      setFormError('The store is currently closed. Orders cannot be placed at this time.');
      return;
    }

    if (items.length === 0) {
      setFormError('Your cart is empty. Add items first!');
      return;
    }

    if (!customerName.trim()) {
      setFormError('Please enter your name.');
      return;
    }

    if (!roomNumber.trim()) {
      setFormError('Please enter your hostel block and room number.');
      return;
    }

    if (!phoneNumber.trim() || phoneNumber.trim().length < 8) {
      setFormError('Please enter a valid phone number for contact.');
      return;
    }

    try {
      setIsSubmitting(true);
      const supabase = getSupabase();

      if (!supabase) {
        setFormError('Database connection unavailable. Please check your connection.');
        return;
      }

      const cart = items;

      // Step 1: Insert Order and GET the returned ID
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
          customer_name: customerName.trim(),
          room_number: roomNumber.trim(),
          phone_number: phoneNumber.trim(),
          total_amount: Number(totalAmount.toFixed(2)),
          status: 'pending',
        }])
        .select()
        .single();

      if (orderError || !orderData) {
        console.error("Failed to insert order:", orderError);
        setFormError(orderError?.message || "Failed to insert order");
        return; 
      }

      // Step 2: Map cart items using the NEW orderData.id
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

      // 3. Trigger Telegram Notification
      try {
        const notifyRes = await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomNumber: roomNumber.trim(),
            customerName: customerName.trim(),
            phoneNumber: phoneNumber.trim(),
            items: cart.map(it => ({
              id: it.id,
              name: it.name || it.title,
              price: it.price,
              quantity: it.quantity,
            })),
            totalAmount: Number(totalAmount.toFixed(2)),
            orderId: orderData.id,
          }),
        });
        const notifyData = await notifyRes.json().catch(() => ({}));
        if (!notifyRes.ok || notifyData?.success === false) {
          console.error('[CartDrawer] Telegram notification error response:', notifyData);
        } else {
          console.log('[CartDrawer] Telegram notification dispatched successfully:', notifyData);
        }
      } catch (notifyErr) {
        console.error('[CartDrawer] Failed to dispatch Telegram notification:', notifyErr);
      }

      // 4. Play success chime & celebratory confetti
      playChime('success');
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#06b6d4', '#f59e0b', '#8b5cf6'],
        });
      } catch {
        // ignore confetti errors
      }

      // 5. Clear cart and close drawer
      clearCart();
      setIsCartOpen(false);

      if (onOrderSuccess) {
        onOrderSuccess(orderData);
      }
    } catch (err) {
      console.error('Checkout failed:', err);
      setFormError('Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleCheckout = handlePlaceOrder;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        onClick={() => setIsCartOpen(false)} 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div className="w-screen max-w-md bg-[#141210] border-l border-[#2E2924] shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="p-4 sm:p-5 border-b border-[#2E2924] flex items-center justify-between bg-[#1F1C18]">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-[#FF5500]/15 border border-[#FF5500]/30 flex items-center justify-center text-[#FF5500]">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#F5F2EB] tracking-tight">Your Cart</h2>
                <p className="text-xs text-[#A8A29E] font-mono tabular-nums">
                  {totalItems} {totalItems === 1 ? 'item' : 'items'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsCartOpen(false)}
              className="p-1.5 rounded-lg text-[#A8A29E] hover:text-[#F5F2EB] bg-[#292520] hover:bg-[#38332C] border border-[#2E2924] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Cart Content: Items List or Empty */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="h-14 w-14 rounded-2xl bg-[#1F1C18] border border-[#2E2924] flex items-center justify-center text-[#A8A29E]">
                  <ShoppingBag className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-[#F5F2EB]">Your cart is empty</h3>
                <p className="text-xs text-[#A8A29E] max-w-xs leading-relaxed">
                  Your midnight cravings are waiting! Add Maggi, Kurkure, eggs or upload assignments to print.
                </p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="mt-2 px-3.5 py-1.5 rounded-xl bg-[#1F1C18] hover:bg-[#292520] text-xs font-semibold text-[#FF5500] border border-[#2E2924] transition-colors cursor-pointer"
                >
                  Browse Store
                </button>
              </div>
            ) : (
              <>
                {/* Pickup details banner */}
                <div className="p-2.5 rounded-xl bg-[#1F1C18] border border-[#2E2924] flex items-center gap-2.5 text-xs text-[#A8A29E]">
                  <Sparkles className="w-4 h-4 text-[#FF5500] shrink-0" />
                  <span>
                    Pickup details: B block 8th floor and C block 4th floor.
                  </span>
                </div>

                {/* Items */}
                <div className="space-y-2.5">
                  {items.map((item) => (
                    <div
                      key={item.cartItemId}
                      className="p-3 rounded-2xl bg-[#1F1C18] border border-[#2E2924] flex flex-col gap-2 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 min-w-0">
                          {/* Item Thumbnail */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.image_url ? encodeURI(item.image_url) : '/placeholder.png'}
                            alt={item.name}
                            className="h-12 w-12 rounded-xl object-contain bg-[#292520] shrink-0 border border-[#2E2924] p-1"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = '/placeholder.png';
                            }}
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-semibold text-[#F5F2EB] truncate">
                              {item.name}
                            </h4>
                            <p className="text-xs font-mono text-[#F5F2EB] font-bold tabular-nums">
                              ₹{Number(item.price).toFixed(0)}{' '}
                              <span className="text-[10px] text-[#A8A29E] font-normal font-sans">each</span>
                            </p>
                          </div>
                        </div>

                        {/* Remove Button */}
                        <button
                          onClick={() => removeFromCart(item.cartItemId)}
                          className="p-1.5 rounded-lg text-[#A8A29E] hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Print Document Attachment Badge */}
                      {item.printFileUrl && (
                        <div className="p-2 rounded-xl bg-cyan-950/30 border border-cyan-800/40 flex items-center justify-between text-xs text-cyan-300">
                          <div className="flex items-center gap-1.5 truncate">
                            <FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span className="truncate text-[11px] font-medium">
                              {item.printFileName || 'Attached Document'}
                            </span>
                          </div>
                          <a
                            href={item.printFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-cyan-400 hover:text-cyan-200 underline flex items-center gap-0.5 ml-2 shrink-0"
                          >
                            <span>View</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      )}

                      {/* Quantity Stepper & Subtotal */}
                      <div className="flex items-center justify-between pt-1 border-t border-[#2E2924]/60 text-xs">
                        <div className="flex items-center border border-[#FF5500]/40 bg-[#292520] rounded-lg overflow-hidden h-7">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                            className="px-2 h-full text-[#FF5500] hover:text-white hover:bg-[#FF5500] text-xs font-bold transition-colors cursor-pointer"
                          >
                            -
                          </button>
                          <span className="px-2.5 font-mono font-bold text-[#F5F2EB] text-xs tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                            disabled={item.stock_count !== undefined && item.quantity >= item.stock_count}
                            className="px-2 h-full text-[#FF5500] hover:text-white hover:bg-[#FF5500] text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-[#A8A29E] block uppercase font-mono">
                            Subtotal
                          </span>
                          <span className="text-sm font-bold font-mono text-[#F5F2EB] tabular-nums">
                            ₹{(item.price * item.quantity).toFixed(0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Checkout Details Form */}
                <form id="checkout-form" onSubmit={handleCheckout} className="pt-3 border-t border-[#2E2924] space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-[#F5F2EB] uppercase tracking-wider">
                      Pickup & Student Details
                    </h3>
                    <span className="text-[11px] text-[#FF5500] font-medium">
                      Hostel Pickup
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#1F1C18] border border-[#2E2924] text-xs text-[#A8A29E]">
                    <strong className="text-[#F5F2EB]">Pickup details:</strong> B block 8th floor and C block 4th floor.
                  </div>

                  {/* Customer Name */}
                  <div>
                    <label className="block text-[11px] font-semibold text-[#A8A29E] mb-1">
                      Your Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 w-4 h-4 text-[#A8A29E]" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Rohan Sharma"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#1F1C18] border border-[#2E2924] text-sm text-[#F5F2EB] placeholder-[#A8A29E]/50 focus:outline-none focus:border-[#FF5500] transition-colors"
                      />
                    </div>
                  </div>

                  {/* Room Number */}
                  <div>
                    <label className="block text-[11px] font-semibold text-[#A8A29E] mb-1">
                      Hostel Block & Room Number *
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-[#A8A29E]" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Block B - Room 304"
                        value={roomNumber}
                        onChange={(e) => setRoomNumber(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#1F1C18] border border-[#2E2924] text-sm text-[#F5F2EB] placeholder-[#A8A29E]/50 focus:outline-none focus:border-[#FF5500] transition-colors"
                      />
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-[11px] font-semibold text-[#A8A29E] mb-1">
                      Phone Number *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 w-4 h-4 text-[#A8A29E]" />
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 9876543210"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#1F1C18] border border-[#2E2924] text-sm text-[#F5F2EB] placeholder-[#A8A29E]/50 focus:outline-none focus:border-[#FF5500] transition-colors"
                      />
                    </div>
                  </div>

                  {/* Prepaid UPI Payment Section */}
                  <div className="p-3.5 rounded-2xl bg-[#1F1C18] border border-[#2E2924] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-[#FF5500]/15 border border-[#FF5500]/30 flex items-center justify-center text-[#FF5500]">
                          <QrCode className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-[#F5F2EB]">Prepaid UPI Payment</h4>
                          <p className="text-[10px] text-[#A8A29E]">GPay • PhonePe • Paytm • Any UPI App</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-[#FF5500] bg-[#FF5500]/10 px-2 py-0.5 rounded-full border border-[#FF5500]/30 tabular-nums">
                        ₹{totalAmount.toFixed(0)}
                      </span>
                    </div>

                    {/* Static QR Code Image */}
                    <div className="flex flex-col items-center justify-center py-1">
                      <div className="p-3 bg-white rounded-2xl shadow-xl border border-zinc-700/60 max-w-[200px] w-full aspect-square flex items-center justify-center transition-transform hover:scale-[1.02] overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/img_5915.jpg"
                          alt="UPI Payment QR Code"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>

                    {/* Required Note */}
                    <p className="text-center text-xs font-medium text-[#F5F2EB]/90 bg-[#292520] p-2 rounded-xl border border-[#2E2924]">
                      Scan to pay. All orders are strictly prepaid via UPI.
                    </p>
                  </div>

                  {formError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400">
                      {formError}
                    </div>
                  )}
                </form>
              </>
            )}
          </div>

          {/* Drawer Footer: Total & Submit */}
          {items.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-[#2E2924] bg-[#1F1C18] space-y-3">
              <div className="space-y-1.5 text-xs text-[#A8A29E]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono text-[#F5F2EB] tabular-nums font-bold">₹{totalAmount.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Hostel Promo</span>
                  <span className="text-[#FF5500] font-semibold font-mono">FREE Pickup</span>
                </div>
                <div className="flex justify-between text-base font-bold text-[#F5F2EB] pt-2 border-t border-[#2E2924]">
                  <span>Total Payable</span>
                  <span className="text-[#FF5500] font-mono tabular-nums">₹{totalAmount.toFixed(0)}</span>
                </div>
              </div>

              <button
                type="submit"
                form="checkout-form"
                disabled={isSubmitting || !storeIsOpen}
                className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${
                  !storeIsOpen
                    ? 'bg-[#292520] text-[#A8A29E] cursor-not-allowed border border-[#2E2924]'
                    : 'bg-[#FF5500] hover:bg-[#ff641a] text-white shadow-[#FF5500]/20 active:scale-[0.99] cursor-pointer'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Placing Midnight Order...</span>
                  </>
                ) : !storeIsOpen ? (
                  <span>Store Closed (Reopens 10 PM)</span>
                ) : (
                  <>
                    <span className="font-mono tabular-nums">Place Order (₹{totalAmount.toFixed(0)})</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#A8A29E]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#FF5500]" />
                <span>Strictly Prepaid UPI Order</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
