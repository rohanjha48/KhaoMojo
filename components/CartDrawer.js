'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, Trash2, ShoppingBag, ArrowRight, ShieldCheck, 
  MapPin, Phone, User, CheckCircle2, Loader2, Sparkles, 
  QrCode, FileText, ExternalLink 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useCart } from './CartContext';
import { useAuth } from './AuthContext';
import { getSupabase } from '../utils/supabase/client';
import { playChime } from '../utils/audio';

const NAME_REGEX = /^[A-Za-z\s]{2,40}$/;
const PHONE_REGEX = /^\+?[0-9]{7,15}$/;
const ROOM_REGEX = /^[A-Za-z0-9\s\-]{2,20}$/;
const UTR_REGEX = /^[A-Za-z0-9]{12}$/;

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
  const { user, openAuthModal } = useAuth();

  const [customerName, setCustomerName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Auto-fill customer details for returning users or signed-in users
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedName = localStorage.getItem('khaomojo_customer_name');
      const savedPhone = localStorage.getItem('khaomojo_phone_number');
      const savedRoom = localStorage.getItem('khaomojo_room_number');

      if (!customerName) {
        if (savedName) {
          setCustomerName(savedName);
        } else if (user?.user_metadata?.full_name) {
          setCustomerName(user.user_metadata.full_name);
        }
      }

      if (!phoneNumber && savedPhone) {
        setPhoneNumber(savedPhone);
      }

      if (!roomNumber && savedRoom) {
        setRoomNumber(savedRoom);
      }
    } catch {
      // ignore storage errors
    }
  }, [user, isCartOpen]);

  if (!isCartOpen) return null;

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});

    if (!storeIsOpen) {
      setFormError('The store is currently closed. Orders cannot be placed at this time.');
      return;
    }

    if (items.length === 0) {
      setFormError('Your cart is empty. Add items first!');
      return;
    }

    const form = e.currentTarget || document.getElementById('checkout-form');
    if (form && typeof form.checkValidity === 'function' && !form.checkValidity()) {
      if (typeof form.reportValidity === 'function') {
        form.reportValidity();
      }
    }

    const trimmedName = customerName.trim();
    const trimmedRoom = roomNumber.trim();
    const trimmedPhone = phoneNumber.trim();
    const trimmedUtr = utrNumber.trim();

    const errors = {};

    if (!trimmedName) {
      errors.name = 'Please enter your name.';
    } else if (!NAME_REGEX.test(trimmedName)) {
      errors.name = 'Name must be 2-40 characters and contain only letters and spaces.';
    }

    if (!trimmedRoom) {
      errors.room = 'Please enter your hostel block and room number.';
    } else if (!ROOM_REGEX.test(trimmedRoom)) {
      errors.room = 'Hostel Block & Room must be 2-20 characters (letters, numbers, spaces, and hyphens only).';
    }

    if (!trimmedPhone) {
      errors.phone = 'Please enter your phone number.';
    } else if (!PHONE_REGEX.test(trimmedPhone)) {
      errors.phone = 'Phone number must be 7-15 digits with no letters (optional leading +).';
    }

    if (!trimmedUtr) {
      errors.utr = 'Please enter the 12-digit UTR / Reference number.';
    } else if (!UTR_REGEX.test(trimmedUtr)) {
      errors.utr = 'UTR must be strictly 12 alphanumeric characters.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError(Object.values(errors)[0]);
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

      // Prepare cart items for single atomic transactional RPC
      const itemsToInsert = cart.map(item => ({
        product_id: item.id,
        product_name: item.name || item.title,
        quantity: item.quantity,
        price_at_time: item.price,
        unit_price: item.price,
        print_file_url: item.printFileUrl || null,
      }));

      // Save details for seamless future checkouts
      try {
        localStorage.setItem('khaomojo_customer_name', trimmedName);
        localStorage.setItem('khaomojo_room_number', trimmedRoom);
        localStorage.setItem('khaomojo_phone_number', trimmedPhone);
      } catch {
        // ignore localStorage errors
      }

      // Check for authenticated user ID
      let currentUserId = user?.id || null;
      if (!currentUserId) {
        const { data: authData } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
        currentUserId = authData?.user?.id || null;
      }

      // Single atomic RPC transaction (permanently prevents blank/orphan orders)
      const { data: orderData, error: orderError } = await supabase.rpc('place_order', {
        p_customer_name: trimmedName,
        p_room_number: trimmedRoom,
        p_phone_number: trimmedPhone,
        p_utr_number: trimmedUtr,
        p_total_amount: Number(totalAmount.toFixed(2)),
        p_cart_items: itemsToInsert,
        p_user_id: currentUserId,
      });

      if (orderError || !orderData) {
        console.error("Failed to place order via RPC:", orderError);
        setFormError(orderError?.message || "Failed to place order");
        return; 
      }

      // Step 2: Trigger Telegram Notification
      try {
        const notifyRes = await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomNumber: trimmedRoom,
            customerName: trimmedName,
            phoneNumber: trimmedPhone,
            utrNumber: trimmedUtr,
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

      // Step 3: Play success chime & celebratory confetti
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

      // Step 4: Clear cart, reset UTR and close drawer
      setUtrNumber('');
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

                  {/* Auth / Account Linking Status */}
                  {user ? (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between text-xs text-emerald-400">
                      <div className="flex items-center gap-2 truncate">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Linking order to <strong className="text-[#F5F2EB] font-mono">{user.email}</strong></span>
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 shrink-0">
                        Logged In
                      </span>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-[#1F1C18] border border-[#2E2924] flex items-center justify-between text-xs text-[#A8A29E]">
                      <span>Want live tracking in My Orders?</span>
                      <button
                        type="button"
                        onClick={openAuthModal}
                        className="text-[#FF5500] font-bold hover:underline cursor-pointer text-xs"
                      >
                        Sign In
                      </button>
                    </div>
                  )}

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
                        minLength={2}
                        maxLength={40}
                        pattern="^[A-Za-z\s]{2,40}$"
                        title="Only letters and spaces allowed (2-40 characters). No numbers or special characters."
                        placeholder="e.g. Rohan Sharma"
                        value={customerName}
                        onChange={(e) => {
                          setCustomerName(e.target.value);
                          if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: '' }));
                          if (formError) setFormError('');
                        }}
                        className={`w-full pl-9 pr-3 py-2 rounded-xl bg-[#1F1C18] border ${
                          fieldErrors.name ? 'border-rose-500/70 focus:border-rose-500' : 'border-[#2E2924] focus:border-[#FF5500]'
                        } text-sm text-[#F5F2EB] placeholder-[#A8A29E]/50 focus:outline-none transition-colors`}
                      />
                    </div>
                    {fieldErrors.name && (
                      <p className="text-[11px] text-rose-400 mt-1 font-medium">{fieldErrors.name}</p>
                    )}
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
                        minLength={2}
                        maxLength={20}
                        pattern="^[A-Za-z0-9\s\-]{2,20}$"
                        title="Only letters, numbers, spaces, and hyphens allowed (2-20 characters)."
                        placeholder="e.g. Block B - Room 304"
                        value={roomNumber}
                        onChange={(e) => {
                          setRoomNumber(e.target.value);
                          if (fieldErrors.room) setFieldErrors(prev => ({ ...prev, room: '' }));
                          if (formError) setFormError('');
                        }}
                        className={`w-full pl-9 pr-3 py-2 rounded-xl bg-[#1F1C18] border ${
                          fieldErrors.room ? 'border-rose-500/70 focus:border-rose-500' : 'border-[#2E2924] focus:border-[#FF5500]'
                        } text-sm text-[#F5F2EB] placeholder-[#A8A29E]/50 focus:outline-none transition-colors`}
                      />
                    </div>
                    {fieldErrors.room && (
                      <p className="text-[11px] text-rose-400 mt-1 font-medium">{fieldErrors.room}</p>
                    )}
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
                        minLength={7}
                        maxLength={16}
                        pattern="^\+?[0-9]{7,15}$"
                        title="Must only contain numbers (7-15 digits), optionally starting with '+'. No letters allowed."
                        placeholder="e.g. 9876543210"
                        value={phoneNumber}
                        onChange={(e) => {
                          setPhoneNumber(e.target.value);
                          if (fieldErrors.phone) setFieldErrors(prev => ({ ...prev, phone: '' }));
                          if (formError) setFormError('');
                        }}
                        className={`w-full pl-9 pr-3 py-2 rounded-xl bg-[#1F1C18] border ${
                          fieldErrors.phone ? 'border-rose-500/70 focus:border-rose-500' : 'border-[#2E2924] focus:border-[#FF5500]'
                        } text-sm text-[#F5F2EB] placeholder-[#A8A29E]/50 focus:outline-none transition-colors`}
                      />
                    </div>
                    {fieldErrors.phone && (
                      <p className="text-[11px] text-rose-400 mt-1 font-medium">{fieldErrors.phone}</p>
                    )}
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

                    {/* Mandatory 12-digit UTR / Reference No Input */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-semibold text-[#A8A29E]">
                          Enter 12-digit UTR / Reference No *
                        </label>
                        <span className="text-[10px] text-[#FF5500] font-mono">12 alphanumeric</span>
                      </div>
                      <div className="relative">
                        <FileText className="absolute left-3 top-2.5 w-4 h-4 text-[#A8A29E]" />
                        <input
                          type="text"
                          required
                          minLength={12}
                          maxLength={12}
                          pattern="^[A-Za-z0-9]{12}$"
                          title="Must be strictly 12 alphanumeric characters (letters and numbers only)."
                          placeholder="e.g. 429812345678"
                          value={utrNumber}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 12);
                            setUtrNumber(val);
                            if (fieldErrors.utr) setFieldErrors((prev) => ({ ...prev, utr: '' }));
                            if (formError) setFormError('');
                          }}
                          className={`w-full pl-9 pr-3 py-2 rounded-xl bg-[#141210] border ${
                            fieldErrors.utr ? 'border-rose-500/70 focus:border-rose-500' : 'border-[#2E2924] focus:border-[#FF5500]'
                          } text-sm font-mono tracking-wider text-[#F5F2EB] placeholder-[#A8A29E]/50 focus:outline-none transition-colors uppercase`}
                        />
                      </div>
                      {fieldErrors.utr ? (
                        <p className="text-[11px] text-rose-400 mt-1 font-medium">{fieldErrors.utr}</p>
                      ) : (
                        <p className="text-[10px] text-[#A8A29E] mt-1">
                          After scanning, copy the 12-digit UPI Ref / UTR number from your payment receipt.
                        </p>
                      )}
                    </div>
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
