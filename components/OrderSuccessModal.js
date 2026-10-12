'use client';

import React from 'react';
import { CheckCircle2, MapPin, Phone, Clock, FileText, ArrowRight, Sparkles } from 'lucide-react';

export default function OrderSuccessModal({ order, onClose }) {
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-zinc-900 border border-zinc-800 p-6 sm:p-8 shadow-2xl overflow-hidden text-left">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-0 h-40 w-40 bg-emerald-500/10 blur-3xl pointer-events-none" />

        {/* Success Icon */}
        <div className="flex items-center gap-3 mb-5">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles className="w-2.5 h-2.5" />
              Order Placed Successfully
            </div>
            <h2 className="text-xl font-extrabold text-white mt-0.5">
              Hostel Kitchen Notified!
            </h2>
          </div>
        </div>

        {/* Order Meta Card */}
        <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-2.5 mb-5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-500 font-mono">ORDER ID:</span>
            <span className="font-mono font-bold text-zinc-300">
              #{String(order.id).slice(-8).toUpperCase()}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-500 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Room:
            </span>
            <span className="font-bold text-white">{order.room_number}</span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-500 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-zinc-400" /> Phone:
            </span>
            <span className="font-mono text-zinc-300">{order.phone_number}</span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" /> ETA:
            </span>
            <span className="font-semibold text-emerald-400">15 – 20 Minutes</span>
          </div>
        </div>

        {/* Items Summary */}
        <div className="mb-5">
          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
            Items ({order.items?.length || 0})
          </h4>
          <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
            {(order.items || []).map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs p-2 rounded-xl bg-zinc-950/40 border border-zinc-800/60"
              >
                <div className="truncate mr-2">
                  <span className="font-medium text-white">
                    {item.quantity}x {item.product_name || 'Item'}
                  </span>
                  {item.print_file_url && (
                    <div className="text-[10px] text-cyan-400 flex items-center gap-1 mt-0.5">
                      <FileText className="w-2.5 h-2.5" />
                      <span>Print Document Attached</span>
                    </div>
                  )}
                </div>
                <span className="font-mono text-zinc-300 font-bold shrink-0">
                  ₹{(item.unit_price * item.quantity).toFixed(0)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-2 border-t border-zinc-800 flex justify-between text-sm font-bold text-white">
            <span>Total Payable on Delivery:</span>
            <span className="text-emerald-400 font-mono">
              ₹{Number(order.total_amount).toFixed(0)}
            </span>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
        >
          <span>Awesome, Got It!</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
