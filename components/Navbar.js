'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, ShoppingBag } from 'lucide-react';
import { useCart } from './CartContext';

export default function Navbar({ storeIsOpen = true }) {
  const { totalItems, totalAmount, setIsCartOpen } = useCart();

  return (
    <header className="sticky top-0 z-30 w-full bg-[#141210]/95 backdrop-blur-md border-b border-[#2E2924] py-2.5">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 flex items-center justify-between gap-3">
        {/* Left: Brand */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="h-8 w-8 rounded-lg bg-[#FF5500] flex items-center justify-center text-white font-black text-xs tracking-tighter shadow-sm group-hover:scale-105 transition-transform">
            KM
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-base sm:text-lg font-bold tracking-tight text-[#F5F2EB]">
                Khao<span className="text-[#FF5500]">Mojo</span>
              </span>
              <span className="bg-[#FF5500]/15 text-[#FF5500] text-[9px] font-bold px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">
                Hostel
              </span>
            </div>
            <p className="text-[10px] text-[#A8A29E] tracking-tight hidden sm:block mt-0.5">
              10 PM – 4 AM
            </p>
          </div>
        </Link>

        {/* Right: Live Status Pill & Actions */}
        <div className="flex items-center gap-2">
          {/* Compact Live Status Pill */}
          <div className="bg-[#1F1C18] border border-[#2E2924] px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5 select-none">
            {storeIsOpen ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-[#F5F2EB] font-medium">Open Now</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                <span className="text-rose-400 font-semibold text-[11px]">Store Closed</span>
              </>
            )}
          </div>

          {/* Desktop Cart button */}
          {totalItems > 0 && (
            <button
              onClick={() => setIsCartOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-[#FF5500] hover:bg-[#ff6a1a] text-white font-bold text-xs shadow-sm transition-all cursor-pointer font-mono"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span className="tabular-nums">{totalItems} • ₹{totalAmount.toFixed(0)}</span>
            </button>
          )}

          {/* Admin Link */}
          <Link
            href="/admin"
            className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-[#1F1C18] hover:bg-[#292520] border border-[#2E2924] text-[#A8A29E] hover:text-[#F5F2EB] text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Admin Dashboard"
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Admin</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
