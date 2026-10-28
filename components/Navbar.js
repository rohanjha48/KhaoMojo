'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Shield, ShoppingBag, User } from 'lucide-react';
import { useCart } from './CartContext';
import { useAuth } from './AuthContext';

export default function Navbar({ storeIsOpen = false, isStoreLoading = false }) {
  const { totalItems, totalAmount, setIsCartOpen } = useCart();
  const { user, openAuthModal } = useAuth();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
            {isStoreLoading ? (
              <>
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                <span className="text-[#A8A29E] font-medium text-[11px]">Checking...</span>
              </>
            ) : storeIsOpen ? (
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

          {/* Desktop Cart button: Render only after mounting to prevent SSR hydration mismatch */}
          {isMounted && totalItems > 0 && (
            <button
              onClick={() => setIsCartOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-[#FF5500] hover:bg-[#ff6a1a] text-white font-bold text-xs shadow-sm transition-all cursor-pointer font-mono"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span className="tabular-nums">{totalItems} • ₹{totalAmount.toFixed(0)}</span>
            </button>
          )}

          {/* User Profile / Auth Button */}
          {isMounted && (
            user ? (
              <Link
                href="/profile"
                className="relative p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-[#1F1C18] hover:bg-[#292520] border border-[#2E2924] text-[#F5F2EB] text-xs font-semibold flex items-center gap-1.5 transition-colors group"
                title="My Orders & Profile"
              >
                <div className="relative">
                  <div className="w-4 h-4 rounded-full bg-[#FF5500]/20 border border-[#FF5500]/50 text-[#FF5500] flex items-center justify-center text-[9px] font-bold">
                    {user.email ? user.email[0].toUpperCase() : 'U'}
                  </div>
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 ring-1 ring-[#141210]" />
                </div>
                <span className="hidden sm:inline font-medium">My Orders</span>
              </Link>
            ) : (
              <button
                onClick={openAuthModal}
                className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-[#1F1C18] hover:bg-[#292520] border border-[#2E2924] text-[#A8A29E] hover:text-[#F5F2EB] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Sign In / Register"
              >
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )
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
