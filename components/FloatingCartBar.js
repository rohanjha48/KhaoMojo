'use client';

import React, { useState, useEffect } from 'react';
import { useCart } from './CartContext';

export default function FloatingCartBar() {
  const { totalItems, totalAmount, setIsCartOpen } = useCart();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || totalItems <= 0) return null;

  return (
    <div
      onClick={() => setIsCartOpen(true)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsCartOpen(true);
        }
      }}
      className="fixed bottom-4 inset-x-3 max-w-lg mx-auto z-50 bg-[#FF5500] text-white rounded-2xl px-4 py-3 shadow-xl shadow-black/70 flex items-center justify-between cursor-pointer select-none active:scale-[0.98] transition-transform hover:bg-[#ff641a]"
      aria-label={`View cart with ${totalItems} items totaling ₹${totalAmount.toFixed(0)}`}
    >
      {/* Left side: Item count + Total price */}
      <div className="font-mono font-bold tabular-nums text-sm sm:text-base tracking-tight flex items-center gap-1.5">
        <span>
          {totalItems} {totalItems === 1 ? 'ITEM' : 'ITEMS'}
        </span>
        <span className="opacity-80">•</span>
        <span>₹{totalAmount.toFixed(0)}</span>
      </div>

      {/* Right side: View Cart button / text */}
      <div className="font-bold text-sm tracking-tight flex items-center gap-1">
        <span>View Cart</span>
        <span className="text-base leading-none">→</span>
      </div>
    </div>
  );
}
