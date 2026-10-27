'use client';

import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import ProductCard from './ProductCard';
import PrintUploadModal from './PrintUploadModal';
import CartDrawer from './CartDrawer';
import OrderSuccessModal from './OrderSuccessModal';
import ClosedNotice from './ClosedNotice';
import FloatingCartBar from './FloatingCartBar';
import { fetchProducts, fetchStoreSettings } from '../utils/dataService';
import { supabase, getSupabase } from '../utils/supabase/client';
import { Search, X, Sparkles, MapPin } from 'lucide-react';

export const SECTIONS_CONFIG = [
  {
    name: "Lay's Collection",
    shortName: "Lay's",
    tagline: 'Crispy, classic & tangy flavors of Lay’s potato chips',
    badge: '4 Flavors',
    badgeColor: 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10',
  },
  {
    name: 'Kurkure Collection',
    shortName: 'Kurkure',
    tagline: 'Tedha Hai Par Mera Hai — Masala Munch & Puffcorn',
    badge: 'Hostel Fav',
    badgeColor: 'border-orange-500/30 text-orange-400 bg-orange-500/10',
  },
  {
    name: 'Bingo Collection',
    shortName: 'Bingo',
    tagline: 'Tangy Achaari Masti triangles & fiery Peri Peri',
    badge: 'Spicy Tang',
    badgeColor: 'border-red-500/30 text-red-400 bg-red-500/10',
  },
  {
    name: 'Soya Sticks',
    shortName: 'Soya Sticks',
    tagline: 'Chatpata spiced crispy roasted protein sticks',
    badge: 'Desi Crunch',
    badgeColor: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
  },
  {
    name: 'Packed Maggi',
    shortName: 'Maggi',
    tagline: 'The undisputed 2 AM hostel survival meal',
    badge: 'Essential',
    badgeColor: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
  },
  {
    name: 'Fresh Eggs',
    shortName: 'Eggs',
    tagline: 'Farm fresh poultry eggs for midnight omelettes',
    badge: 'High Protein',
    badgeColor: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
  },
  {
    name: 'Oreo',
    shortName: 'Oreo',
    tagline: 'Dark cocoa biscuit cookies with vanilla cream',
    badge: 'Sweet Tooth',
    badgeColor: 'border-blue-500/30 text-blue-400 bg-blue-500/10',
  },
  {
    name: 'Other Biscuits',
    shortName: 'Biscuits',
    tagline: 'Chai companions: Parle-G, Bourbon & Milk Bikis',
    badge: 'Chai Dunkers',
    badgeColor: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
  },
  {
    name: 'Print Services',
    shortName: 'Print Services',
    tagline: 'Urgent assignment prints & lab reports ready for pickup',
    badge: '2 AM Fast Print',
    badgeColor: 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10',
  },
  {
    name: 'Academic & Tech Services',
    shortName: 'Tech & PPTs',
    tagline: 'Custom PPTs, lab Excel sheets & coding projects for deadlines',
    badge: 'College Aid',
    badgeColor: 'border-violet-500/30 text-violet-400 bg-violet-500/10',
  },
];

function getProductSection(product) {
  if (product.section_name) return product.section_name;
  const name = (product.name || '').toLowerCase();
  const cat = (product.category || '').toLowerCase();

  if (
    cat === 'academic_service' ||
    cat === 'academic & tech services' ||
    name.includes('ppt') ||
    name.includes('excel sheet') ||
    name.includes('coding')
  ) {
    return 'Academic & Tech Services';
  }
  if (cat.includes('lay') || name.includes("lay's") || name.includes('lays')) return "Lay's Collection";
  if (cat.includes('kurkure') || name.includes('kurkure') || name.includes('puffcorn')) return 'Kurkure Collection';
  if (cat.includes('bingo') || name.includes('bingo') || name.includes('achari') || name.includes('achaari') || name.includes('peri peri')) return 'Bingo Collection';
  if (cat.includes('soya') || name.includes('soya')) return 'Soya Sticks';
  if (cat.includes('maggi') || name.includes('maggi')) return 'Packed Maggi';
  if (cat.includes('egg') || name.includes('egg')) return 'Fresh Eggs';
  if (cat.includes('oreo') || name.includes('oreo')) return 'Oreo';
  if (
    cat === 'print_service' ||
    cat === 'print services' ||
    name.includes('print') ||
    name.includes('sheet') ||
    name.includes('binding')
  ) {
    return 'Print Services';
  }
  if (cat.includes('biscuit') || name.includes('parle') || name.includes('bourbon') || name.includes('bikis') || name.includes('tiger')) return 'Other Biscuits';
  return 'Other Biscuits';
}

export default function StorefrontView() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [activePrintProduct, setActivePrintProduct] = useState(null);
  const [lastPlacedOrder, setLastPlacedOrder] = useState(null);

  // Store open status strictly managed via React useState
  const [isStoreOpen, setIsStoreOpen] = useState(true); // Default to true temporarily so it doesn't flash closed on load
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const client = supabase || getSupabase();

    const checkStoreStatus = async () => {
      if (!client) {
        setIsChecking(false);
        return;
      }

      try {
        const { data, error } = await client
          .from('store_settings')
          .select('is_open')
          .eq('id', 1)
          .single();
        
        if (data && typeof data.is_open === 'boolean') {
          setIsStoreOpen(data.is_open);
        } else if (error) {
          // Fallback if table row isn't explicitly id: 1
          const { data: fallbackData } = await client
            .from('store_settings')
            .select('is_open')
            .limit(1)
            .maybeSingle();

          if (fallbackData && typeof fallbackData.is_open === 'boolean') {
            setIsStoreOpen(fallbackData.is_open);
          }
        }
      } catch (err) {
        console.error('Error checking store status:', err);
      } finally {
        setIsChecking(false);
      }
    };

    // Check immediately
    checkStoreStatus();
    
    // Poll every 3 seconds to bypass all Next.js caches
    const interval = setInterval(checkStoreStatus, 3000);

    // Supabase Realtime subscription for instant updates
    let subscription = null;
    if (client) {
      subscription = client
        .channel('store_settings_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'store_settings' },
          (payload) => {
            if (payload?.new && typeof payload.new.is_open === 'boolean') {
              setIsStoreOpen(payload.new.is_open);
            }
          }
        )
        .subscribe();
    }

    // Local tab-to-tab sync via BroadcastChannel
    let bc = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel('khaomojo_events');
        bc.onmessage = (event) => {
          if (
            event.data?.type === 'STORE_SETTINGS_CHANGED' &&
            typeof event.data.payload?.is_open === 'boolean'
          ) {
            setIsStoreOpen(event.data.payload.is_open);
          }
        };
      } catch {}
    }

    return () => {
      clearInterval(interval);
      if (client && subscription) {
        client.removeChannel(subscription);
      }
      if (bc) {
        bc.close();
      }
    };
  }, []);

  // Load products & subscribe to product updates
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        const data = await fetchProducts();
        if (isMounted) {
          setProducts(data || []);
        }
      } catch (err) {
        console.error('Failed to load products:', err);
        if (isMounted) {
          setProducts([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    // Realtime subscription for products table
    const supabase = getSupabase();
    let productChannel = null;
    if (supabase) {
      productChannel = supabase
        .channel('public_products_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'products' },
          (payload) => {
            console.log('[Realtime products update]:', payload);
            if (!isMounted) return;
            if (payload.eventType === 'UPDATE' && payload.new) {
              setProducts((prev) =>
                prev.map((p) => (p.id === payload.new.id ? { ...p, ...payload.new } : p))
              );
            } else if (payload.eventType === 'INSERT' && payload.new) {
              setProducts((prev) => [...prev, payload.new]);
            } else if (payload.eventType === 'DELETE' && payload.old) {
              setProducts((prev) => prev.filter((p) => p.id !== payload.old.id));
            } else {
              loadData();
            }
          }
        )
        .subscribe();
    }

    return () => {
      isMounted = false;
      if (supabase && productChannel) {
        supabase.removeChannel(productChannel);
      }
    };
  }, []);

  // Search filtering logic
  const searchFilteredProducts = products.filter((product) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = (product.name || '').toLowerCase().includes(q);
    const descMatch = (product.description || '').toLowerCase().includes(q);
    const catMatch = (product.category || '').toLowerCase().includes(q);
    const sectionMatch = getProductSection(product).toLowerCase().includes(q);
    return nameMatch || descMatch || catMatch || sectionMatch;
  });

  // Group products into sections according to SECTIONS_CONFIG
  const groupedSections = SECTIONS_CONFIG.map((sec) => {
    const sectionProducts = searchFilteredProducts.filter(
      (p) => getProductSection(p) === sec.name
    );
    return {
      ...sec,
      products: sectionProducts,
    };
  }).filter((sec) => {
    if (selectedSection !== 'all' && sec.name !== selectedSection) {
      return false;
    }
    return sec.products.length > 0;
  });

  return (
    <div className="min-h-screen bg-[#141210] text-[#F5F2EB] flex flex-col font-sans selection:bg-[#FF5500] selection:text-white">
      {/* 1. Compact Top Bar */}
      <Navbar storeIsOpen={isStoreOpen} isStoreLoading={isChecking} />

      {/* 2. Main Container: max-w-5xl mx-auto px-3 sm:px-6 pb-28 pt-3 */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-6 pb-28 pt-3 space-y-3">
        {/* If Store is Closed, render compact live Closed Notice */}
        {!isStoreOpen && <ClosedNotice />}

        {/* Compact Utility Strip: Pickup Info + Instant Search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
          {/* Hostel Pickup Info */}
          <div className="flex items-center gap-2 text-xs text-[#A8A29E] bg-[#1F1C18] border border-[#2E2924] rounded-xl px-3 py-1.5 shrink-0">
            <MapPin className="w-3.5 h-3.5 text-[#FF5500] shrink-0" />
            <span>
              Pickup details: B block 8th floor and C block 4th floor.
            </span>
          </div>

          {/* Quick Commerce Search Input */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#A8A29E]" />
            <input
              type="text"
              placeholder="Search snacks, Maggi, prints..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-[#1F1C18] border border-[#2E2924] text-xs sm:text-sm text-[#F5F2EB] placeholder-[#A8A29E]/60 focus:outline-none focus:border-[#FF5500] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 p-0.5 text-[#A8A29E] hover:text-[#F5F2EB] rounded"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 3. Sticky Category Bar: Horizontal scrolling pills */}
        <div className="sticky top-[52px] z-20 -mx-3 sm:-mx-6 px-3 sm:px-6 py-2 bg-[#141210]/95 backdrop-blur-md border-b border-[#2E2924]/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {/* "All" Pill */}
          <button
            type="button"
            onClick={() => setSelectedSection('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs shrink-0 transition-colors cursor-pointer select-none ${
              selectedSection === 'all'
                ? 'bg-[#F5F2EB] text-[#141210] font-semibold shadow-sm'
                : 'bg-[#1F1C18] text-[#A8A29E] hover:text-[#F5F2EB] border border-[#2E2924]'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>All Snacks</span>
            <span className="font-mono text-[10px] tabular-nums opacity-80">
              {products.length}
            </span>
          </button>

          {/* Category Pills */}
          {SECTIONS_CONFIG.map((sec) => {
            const isSelected = selectedSection === sec.name;
            const count = products.filter((p) => getProductSection(p) === sec.name).length;
            if (count === 0 && !loading) return null;

            return (
              <button
                key={sec.name}
                type="button"
                onClick={() => setSelectedSection(sec.name)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs shrink-0 whitespace-nowrap transition-colors cursor-pointer select-none ${
                  isSelected
                    ? 'bg-[#FF5500] text-white font-semibold shadow-sm'
                    : 'bg-[#1F1C18] text-[#A8A29E] hover:text-[#F5F2EB] border border-[#2E2924]'
                }`}
              >
                <span>{sec.shortName}</span>
                <span className="font-mono text-[10px] tabular-nums opacity-80">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 4. Products Listing */}
        <div className="pt-2 space-y-6">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-4">
              {[...Array(8)].map((_, idx) => (
                <div
                  key={idx}
                  className="bg-[#1F1C18] border border-[#2E2924] rounded-2xl h-56 p-3 animate-pulse flex flex-col justify-between"
                >
                  <div className="w-full h-28 bg-[#292520] rounded-xl" />
                  <div className="space-y-2">
                    <div className="w-3/4 h-3 bg-[#292520] rounded" />
                    <div className="w-1/2 h-3 bg-[#292520] rounded" />
                  </div>
                  <div className="w-full h-8 bg-[#292520] rounded-lg" />
                </div>
              ))}
            </div>
          ) : groupedSections.length === 0 ? (
            /* Empty State */
            <div className="text-center py-16 px-4 bg-[#1F1C18] border border-[#2E2924] rounded-2xl max-w-md mx-auto my-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#292520] border border-[#2E2924] flex items-center justify-center mx-auto text-[#FF5500]">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#F5F2EB]">No snacks found</h3>
              <p className="text-xs text-[#A8A29E] max-w-xs mx-auto">
                {searchQuery
                  ? `No items match "${searchQuery}". Try searching for something else.`
                  : 'Currently no products available in this section.'}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-3 py-1.5 rounded-xl bg-[#292520] hover:bg-[#342F2A] border border-[#2E2924] text-xs font-semibold text-[#F5F2EB] transition-colors"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            groupedSections.map((section) => (
              <section
                key={section.name}
                id={section.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}
                className="space-y-2.5 scroll-mt-24"
              >
                {/* Section Header: Bold & tracking-tight */}
                <div className="flex items-center justify-between border-b border-[#2E2924] pb-1.5">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#F5F2EB]">
                      {section.name}
                    </h2>
                    <span
                      className={`hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${section.badgeColor}`}
                    >
                      {section.badge}
                    </span>
                  </div>

                  <span className="text-xs font-mono tabular-nums text-[#A8A29E]">
                    {section.products.length} {section.products.length === 1 ? 'item' : 'items'}
                  </span>
                </div>

                {/* Dense Mobile Grid: grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-4 */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-4">
                  {section.products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      isClosed={!isStoreOpen}
                      onOpenPrintModal={(prod) => setActivePrintProduct(prod)}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </main>

      {/* 5. Floating Bottom Cart Bar */}
      <FloatingCartBar />

      {/* Slide-out Cart Sidebar */}
      <CartDrawer
        storeIsOpen={isStoreOpen}
        onOrderSuccess={(order) => {
          setLastPlacedOrder(order);
        }}
      />

      {/* Print Document Upload Modal */}
      <PrintUploadModal
        product={activePrintProduct}
        isOpen={Boolean(activePrintProduct)}
        onClose={() => setActivePrintProduct(null)}
      />

      {/* Order Placement Success Modal */}
      <OrderSuccessModal
        order={lastPlacedOrder}
        onClose={() => setLastPlacedOrder(null)}
      />
    </div>
  );
}
