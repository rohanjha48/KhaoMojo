'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

const CART_STORAGE_KEY = 'khaomojo_cart_items_v1';

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Load saved cart from localStorage on mount
  useEffect(() => {
    setIsMounted(true);
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to parse cart items:', e);
    }
  }, []);

  // Save cart changes to localStorage
  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to save cart items:', e);
    }
  }, [items, isMounted]);

  /**
   * Add a product to the cart
   */
  const addToCart = (product, options = {}) => {
    const { printFileUrl, printFileName, quantity = 1 } = options;

    setItems((prevItems) => {
      // If it's a print service with a file, we create a distinct entry per uploaded file
      if (product.category === 'print_service' && printFileUrl) {
        const uniqueCartId = `${product.id}_${Date.now()}`;
        return [
          ...prevItems,
          {
            cartItemId: uniqueCartId,
            ...product,
            quantity: Math.min(quantity, product.stock_count || 999),
            printFileUrl,
            printFileName: printFileName || 'Document.pdf',
          },
        ];
      }

      // Standard snack or grocery item
      const existingIndex = prevItems.findIndex(
        (item) => item.id === product.id && !item.printFileUrl
      );

      if (existingIndex > -1) {
        const existing = prevItems[existingIndex];
        const newQty = Math.min(
          existing.quantity + quantity,
          product.stock_count || 999
        );
        const updated = [...prevItems];
        updated[existingIndex] = { ...existing, quantity: newQty };
        return updated;
      }

      // New item
      return [
        ...prevItems,
        {
          cartItemId: `${product.id}_default`,
          ...product,
          quantity: Math.min(quantity, product.stock_count || 999),
        },
      ];
    });

    // Auto-open cart sidebar for smooth UX feedback
    setIsCartOpen(true);
  };

  /**
   * Remove item from cart
   */
  const removeFromCart = (cartItemId) => {
    setItems((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
  };

  /**
   * Update quantity of an item
   */
  const updateQuantity = (cartItemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }

    setItems((prev) =>
      prev.map((item) => {
        if (item.cartItemId === cartItemId) {
          const maxAllowed = item.stock_count !== undefined ? item.stock_count : 999;
          return {
            ...item,
            quantity: Math.min(newQuantity, maxAllowed),
          };
        }
        return item;
      })
    );
  };

  /**
   * Clear all items
   */
  const clearCart = () => {
    setItems([]);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        isCartOpen,
        setIsCartOpen,
        totalItems,
        totalAmount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
