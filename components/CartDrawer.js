'use client';

import React, { useState } from 'react';
import { 
  X, Trash2, ShoppingBag, ArrowRight, ShieldCheck, 
  MapPin, Phone, User, CheckCircle2, Loader2, Sparkles, 
  Banknote, QrCode, FileText, ExternalLink 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useCart } from './CartContext';
import { createOrder } from '../utils/dataService';
import { playChime } from '../utils/audio';

export default function CartDrawer({ onOrderSuccess }) {
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
  const [paymentMethod, setPaymentMethod] = useState('UPI on Delivery'); // or 'Cash on Delivery'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  if (!isCartOpen) return null;

  const handleQuickRoom = (prefix) => {
    setRoomNumber((prev) => {
      if (prev.startsWith(prefix)) return prev;
      return `${prefix} Room `;
    });
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    setFormError('');

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
      setFormError('Please enter a valid phone number for delivery contact.');
      return;
    }

    try {
      setIsSubmitting(true);

      const orderPayload = {
        customerName: customerName.trim(),
        roomNumber: roomNumber.trim(),
        phoneNumber: phoneNumber.trim(),
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          printFileUrl: item.printFileUrl || null,
          printFileName: item.printFileName || null,
        })),
        totalAmount: Number(totalAmount.toFixed(2)),
      };

      const placedOrder = await createOrder(orderPayload);

      // Play success chime & launch celebratory confetti
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

      // Clear cart
      clearCart();
      setIsCartOpen(false);

      if (onOrderSuccess) {
        onOrderSuccess(placedOrder);
      }
    } catch (err) {
      console.error('Checkout failed:', err);
      setFormError('Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        onClick={() => setIsCartOpen(false)} 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div className="w-screen max-w-md bg-zinc-950 border-l border-zinc-800 shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/50">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Your Cart</h2>
                <p className="text-xs text-zinc-400">
                  {totalItems} {totalItems === 1 ? 'item' : 'items'} • Fast Room Delivery
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsCartOpen(false)}
              className="p-2 rounded-xl text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Content: Items List or Empty */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="h-16 w-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-white">Your cart is empty</h3>
                <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
                  Your midnight cravings are waiting! Add Maggi, Kurkure, eggs or upload assignments to print.
                </p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="mt-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-emerald-400 border border-zinc-800 transition"
                >
                  Browse Store
                </button>
              </div>
            ) : (
              <>
                {/* Free delivery hostel perk banner */}
                <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-emerald-950/20 border border-emerald-500/20 flex items-center gap-2.5 text-xs text-emerald-300">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    <strong>Hostel Night Shift:</strong> Estimated delivery 15-20 mins right to your room door!
                  </span>
                </div>

                {/* Items */}
                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.cartItemId}
                      className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col gap-2.5 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          {/* Item Thumbnail */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.image_url || '/placeholder.png'}
                            alt={item.name}
                            className="h-12 w-12 rounded-xl object-cover bg-zinc-950 shrink-0 border border-zinc-800"
                          />
                          <div className="min-w-0">
                            <h4 className="text-sm font-semibold text-white truncate">
                              {item.name}
                            </h4>
                            <p className="text-xs font-mono text-emerald-400 font-bold">
                              ₹{Number(item.price).toFixed(0)}{' '}
                              <span className="text-[10px] text-zinc-500 font-normal">each</span>
                            </p>
                          </div>
                        </div>

                        {/* Remove Button */}
                        <button
                          onClick={() => removeFromCart(item.cartItemId)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Print Document Attachment Badge */}
                      {item.printFileUrl && (
                        <div className="p-2 rounded-xl bg-cyan-950/40 border border-cyan-800/50 flex items-center justify-between text-xs text-cyan-300">
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
                      <div className="flex items-center justify-between pt-1 border-t border-zinc-800/40 text-xs">
                        <div className="flex items-center border border-zinc-700 bg-zinc-950 rounded-lg overflow-hidden">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                            className="px-2.5 py-1 text-zinc-400 hover:text-white hover:bg-zinc-800 text-xs font-bold"
                          >
                            -
                          </button>
                          <span className="px-3 py-1 font-mono font-bold text-white text-xs">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                            disabled={item.stock_count !== undefined && item.quantity >= item.stock_count}
                            className="px-2.5 py-1 text-zinc-400 hover:text-white hover:bg-zinc-800 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-zinc-500 block uppercase font-mono">
                            Subtotal
                          </span>
                          <span className="text-sm font-bold font-mono text-white">
                            ₹{(item.price * item.quantity).toFixed(0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Checkout Details Form */}
                <form id="checkout-form" onSubmit={handleCheckout} className="pt-4 border-t border-zinc-800 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      Delivery Details
                    </h3>
                    <span className="text-[11px] text-emerald-400 font-medium">
                      Hostel Direct
                    </span>
                  </div>

                  {/* Customer Name */}
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Your Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Rohan Sharma"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
                      />
                    </div>
                  </div>

                  {/* Room Number */}
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Hostel Block & Room Number *
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Block B - Room 304"
                        value={roomNumber}
                        onChange={(e) => setRoomNumber(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
                      />
                    </div>

                    {/* Quick hostel block pills */}
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {['Block A', 'Block B', 'Block C', 'BH-1', 'GH-1'].map((block) => (
                        <button
                          key={block}
                          type="button"
                          onClick={() => handleQuickRoom(block)}
                          className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition"
                        >
                          +{block}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Phone Number (for call on arrival) *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 9876543210"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
                      />
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5">
                      Payment on Delivery
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('UPI on Delivery')}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition text-xs font-semibold ${
                          paymentMethod === 'UPI on Delivery'
                            ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                            : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <QrCode className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <div>UPI QR Scan</div>
                          <div className="text-[10px] font-normal text-zinc-400">GPay, PhonePe, Paytm</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('Cash on Delivery')}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition text-xs font-semibold ${
                          paymentMethod === 'Cash on Delivery'
                            ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                            : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <Banknote className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <div>Cash on Delivery</div>
                          <div className="text-[10px] font-normal text-zinc-400">Exact change handy</div>
                        </div>
                      </button>
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
            <div className="p-5 border-t border-zinc-800 bg-zinc-900/80 space-y-3">
              <div className="space-y-1.5 text-xs text-zinc-400">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono text-zinc-200">₹{totalAmount.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Late Night Delivery Fee</span>
                  <span className="text-emerald-400 font-semibold font-mono">FREE (Hostel Promo)</span>
                </div>
                <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-zinc-800">
                  <span>Total Payable</span>
                  <span className="text-emerald-400 font-mono">₹{totalAmount.toFixed(0)}</span>
                </div>
              </div>

              <button
                type="submit"
                form="checkout-form"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Placing Midnight Order...</span>
                  </>
                ) : (
                  <>
                    <span>Place Order (₹{totalAmount.toFixed(0)})</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-zinc-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pay only when delivery guy reaches your room</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
