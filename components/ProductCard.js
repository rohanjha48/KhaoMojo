'use client';

import React from 'react';
import { useCart } from './CartContext';

export default function ProductCard({ product, isClosed, onOpenPrintModal }) {
  const { addToCart, updateQuantity, items } = useCart();

  const isOutOfStock = (product.stock_count || 0) <= 0;
  const isPrintService =
    (product.category === 'print_service' ||
      product.category === 'Print Services' ||
      product.section_name === 'Print Services') &&
    !product.name?.toLowerCase().includes('sheet') &&
    !product.name?.toLowerCase().includes('bundle');

  // Find existing cart item for this product (standard non-file item)
  const cartItem = items.find((item) => item.id === product.id && !item.printFileUrl);
  const qty = cartItem ? cartItem.quantity : 0;
  const isMaxInCart = product.stock_count !== undefined && qty >= product.stock_count && !isPrintService;

  const handleAdd = (e) => {
    e.stopPropagation();
    if (isClosed || isOutOfStock) return;

    if (isPrintService) {
      onOpenPrintModal(product);
    } else {
      addToCart(product, { quantity: 1, openCart: false });
    }
  };

  const handleIncrement = (e) => {
    e.stopPropagation();
    if (isClosed || isOutOfStock || isMaxInCart) return;

    if (isPrintService) {
      onOpenPrintModal(product);
    } else if (cartItem) {
      updateQuantity(cartItem.cartItemId, qty + 1);
    } else {
      addToCart(product, { quantity: 1, openCart: false });
    }
  };

  const handleDecrement = (e) => {
    e.stopPropagation();
    if (cartItem) {
      updateQuantity(cartItem.cartItemId, qty - 1);
    }
  };

  // Human readable subtitle
  const getSubtitle = () => {
    if (isPrintService) return 'Ready in 10 mins';
    if (product.section_name) return product.section_name.replace(' Collection', '');
    if (product.category === 'academic_service') return 'College Assistance';
    return 'Snack & Munchies';
  };

  return (
    <div className="bg-[#1F1C18] border border-[#2E2924] rounded-2xl p-2.5 flex flex-col justify-between transition-colors hover:border-[#3E3731]">
      {/* 1. Image Box (Top) */}
      <div className="relative aspect-square w-full rounded-xl bg-[#292520] p-2 flex items-center justify-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image_url ? encodeURI(product.image_url) : '/placeholder.png'}
          alt={product.name}
          className={`w-full h-full object-contain transition-transform duration-300 hover:scale-105 select-none ${
            isOutOfStock ? 'opacity-50 grayscale' : ''
          }`}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = '/placeholder.png';
          }}
        />

        {/* Out-of-Stock Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[1px] pointer-events-none">
            <span className="bg-[#141210]/95 text-[#F5F2EB] border border-[#2E2924] font-bold text-[10px] tracking-wider uppercase px-2 py-0.5 rounded shadow">
              SOLD OUT
            </span>
          </div>
        )}
      </div>

      {/* 2. Info Block (Middle) - Strictly Left-Aligned */}
      <div className="mt-2 flex-1 flex flex-col justify-start text-left">
        <h3
          className="text-[14px] sm:text-[15px] font-semibold leading-snug text-[#F5F2EB] line-clamp-2 min-h-[2.5rem]"
          title={product.name}
        >
          {product.name}
        </h3>
        <p className="text-[12px] text-[#A8A29E] mt-0.5 truncate font-normal">
          {getSubtitle()}
        </p>
      </div>

      {/* 3. Action Row (Bottom) - Zero Layout Shift (Fixed h-8) */}
      <div className="mt-2.5 pt-1 flex items-center justify-between gap-2 border-t border-[#2E2924]/60">
        {/* Price: Bold Monospace with tabular-nums */}
        <div className="font-mono text-[15px] sm:text-[16px] font-bold text-[#F5F2EB] tabular-nums">
          ₹{Number(product.price).toFixed(0)}
        </div>

        {/* Right Action: Fixed h-8 min-w-[76px] to prevent layout jump */}
        <div className="h-8 min-w-[76px] flex items-center justify-end">
          {isOutOfStock ? (
            <span className="bg-[#292520] text-[#A8A29E] border border-[#2E2924] text-[11px] font-semibold px-2 h-8 w-full rounded-lg flex items-center justify-center select-none">
              SOLD OUT
            </span>
          ) : isClosed ? (
            <span
              className="bg-[#292520] text-[#A8A29E] border border-[#2E2924] text-[11px] font-semibold px-2 h-8 w-full rounded-lg flex items-center justify-center select-none"
              title="Store opens 10:00 PM – 4:00 AM"
            >
              CLOSED
            </span>
          ) : qty === 0 ? (
            <button
              type="button"
              onClick={handleAdd}
              className="bg-[#292520] hover:bg-[#FF5500] text-[#FF5500] hover:text-white border border-[#FF5500]/40 font-bold text-xs px-3 h-8 w-full rounded-lg transition-colors flex items-center justify-center cursor-pointer select-none active:scale-[0.97]"
            >
              {isPrintService ? 'UPLOAD +' : 'ADD +'}
            </button>
          ) : (
            <div className="bg-[#FF5500] text-white h-8 w-full rounded-lg flex items-center justify-between px-1 font-mono text-xs font-bold shadow-sm select-none">
              <button
                type="button"
                onClick={handleDecrement}
                className="w-6 h-full flex items-center justify-center hover:bg-black/20 rounded text-sm font-bold transition-colors cursor-pointer"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="tabular-nums px-1 font-bold text-white text-xs">{qty}</span>
              <button
                type="button"
                onClick={handleIncrement}
                disabled={isMaxInCart}
                className="w-6 h-full flex items-center justify-center hover:bg-black/20 rounded text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
