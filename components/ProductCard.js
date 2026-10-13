'use client';

import React from 'react';
import { ShoppingBag, FileUp, AlertCircle, CheckCircle2, Flame, Layers } from 'lucide-react';
import { useCart } from './CartContext';

export default function ProductCard({ product, isClosed, onOpenPrintModal }) {
  const { addToCart, items } = useCart();

  const isOutOfStock = (product.stock_count || 0) <= 0;
  const isPrintService = product.category === 'print_service';

  // Check how many are currently in cart
  const currentInCart = items
    .filter((item) => item.id === product.id)
    .reduce((sum, item) => sum + item.quantity, 0);

  const isMaxInCart = currentInCart >= (product.stock_count || 0) && !isPrintService;

  const handleActionClick = () => {
    if (isClosed || isOutOfStock || isMaxInCart) return;

    if (isPrintService) {
      onOpenPrintModal(product);
    } else {
      addToCart(product, { quantity: 1 });
    }
  };

  const getCategoryBadge = () => {
    if (product.category === 'print_service') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          Print Service
        </span>
      );
    }
    if (product.section_name?.includes("Lay's")) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
          Lay's
        </span>
      );
    }
    if (product.section_name?.includes('Kurkure')) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-orange-500/10 text-orange-400 border border-orange-500/20">
          Kurkure
        </span>
      );
    }
    if (product.section_name?.includes('Maggi')) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
          Maggi
        </span>
      );
    }
    if (product.section_name?.includes('Bingo')) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-red-500/10 text-red-400 border border-red-500/20">
          Bingo
        </span>
      );
    }
    if (product.section_name?.includes('Soya')) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
          Soya Sticks
        </span>
      );
    }
    if (product.section_name?.includes('Egg')) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Fresh Eggs
        </span>
      );
    }
    if (product.section_name === 'Oreo') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
          Oreo
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        {product.section_name || 'Biscuits'}
      </span>
    );
  };

  return (
    <div className="group relative flex flex-col rounded-2xl bg-zinc-900/80 border border-zinc-800/90 overflow-hidden hover:border-zinc-700/80 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/5">
      {/* Product Image Box */}
      <div className="relative aspect-4/3 w-full bg-zinc-950 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image_url || '/placeholder.png'}
          alt={product.name}
          className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
            isOutOfStock ? 'grayscale opacity-50' : ''
          }`}
          loading="lazy"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          {getCategoryBadge()}

          {/* Stock status indicator */}
          {isOutOfStock ? (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase bg-rose-500/90 text-white shadow">
              Out of Stock
            </span>
          ) : product.stock_count <= 10 ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/90 text-zinc-950 shadow animate-pulse">
              <Flame className="w-2.5 h-2.5 fill-current" />
              Only {product.stock_count} left!
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-900/90 text-zinc-300 border border-zinc-700/80 backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
              {product.stock_count} in stock
            </span>
          )}
        </div>
      </div>

      {/* Product Details Content */}
      <div className="flex flex-1 flex-col p-4 justify-between">
        <div>
          <h3 className="font-semibold text-white text-base tracking-tight line-clamp-1 group-hover:text-emerald-400 transition-colors">
            {product.name}
          </h3>
          <p className="mt-1 text-xs text-zinc-400 line-clamp-2 leading-relaxed">
            {product.description || (isPrintService ? 'Upload assignment/document for room delivery.' : 'Fresh late-night snack for room delivery.')}
          </p>
        </div>

        {/* Footer: Price & Add Button */}
        <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
          <div>
            <span className="text-[10px] text-zinc-500 block uppercase font-mono tracking-wider">
              {isPrintService && product.name.includes('Page')
                ? 'Per Page'
                : product.name.toLowerCase().includes('egg') || product.name.includes('Piece')
                ? 'Per Piece'
                : 'Price'}
            </span>
            <span className="text-lg font-bold font-mono text-emerald-400">
              ₹{Number(product.price).toFixed(0)}
            </span>
          </div>

          <div>
            {isOutOfStock ? (
              <button
                disabled
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50 flex items-center gap-1.5"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Out of Stock</span>
              </button>
            ) : isClosed ? (
              <button
                disabled
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50 flex items-center gap-1.5"
                title="Store operational 10 PM - 4 AM"
              >
                <span>Store Closed</span>
              </button>
            ) : isPrintService ? (
              <button
                onClick={handleActionClick}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-zinc-950 transition-all shadow-md shadow-cyan-500/20 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5"
              >
                <FileUp className="w-3.5 h-3.5" />
                <span>Upload & Add</span>
              </button>
            ) : isMaxInCart ? (
              <button
                disabled
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-800 text-amber-400 cursor-not-allowed border border-zinc-700 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Max in Cart</span>
              </button>
            ) : (
              <button
                onClick={handleActionClick}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-all shadow-md shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>
                  {currentInCart > 0 ? `Add More (${currentInCart})` : 'Add to Cart'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
