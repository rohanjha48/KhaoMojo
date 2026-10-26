'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import ProductCard from '../components/ProductCard';
import PrintUploadModal from '../components/PrintUploadModal';
import CartDrawer from '../components/CartDrawer';
import OrderSuccessModal from '../components/OrderSuccessModal';
import ClosedNotice from '../components/ClosedNotice';
import FloatingCartBar from '../components/FloatingCartBar';
import { fetchProducts, fetchStoreSettings, subscribeToRealtime } from '../utils/dataService';
import { Search, X, Sparkles, MapPin, Clock } from 'lucide-react';

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

export default function StorefrontPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [activePrintProduct, setActivePrintProduct] = useState(null);
  const [lastPlacedOrder, setLastPlacedOrder] = useState(null);

  // Store open status strictly read from store_settings table
  const [storeIsOpen, setStoreIsOpen] = useState(true);

  // Load store open status from store_settings table & subscribe to realtime changes
  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      try {
        const settings = await fetchStoreSettings();
        if (isMounted && settings) {
          setStoreIsOpen(Boolean(settings.is_open));
        }
      } catch (err) {
        console.error('Failed to load store settings:', err);
      }
    }

    loadSettings();

    // Subscribe to realtime product and store_settings updates
    const unsubscribe = subscribeToRealtime({
      onProductChange: (payload) => {
        if (payload.new) {
          setProducts((prev) =>
            prev.map((p) => (p.id === payload.new.id ? { ...p, ...payload.new } : p))
          );
        } else if (Array.isArray(payload)) {
          setProducts(payload);
        } else {
          fetchProducts().then((refreshed) => {
            if (isMounted) setProducts(refreshed);
          });
        }
      },
      onOrderChange: () => {
        fetchProducts().then((refreshed) => {
          if (isMounted) setProducts(refreshed);
        });
      },
      onStoreSettingsChange: (payload) => {
        if (payload?.new && typeof payload.new.is_open === 'boolean') {
          if (isMounted) setStoreIsOpen(payload.new.is_open);
        } else {
          fetchStoreSettings().then((refreshed) => {
            if (isMounted && refreshed) setStoreIsOpen(Boolean(refreshed.is_open));
          });
        }
      },
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Load products
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        const data = await fetchProducts();
        if (isMounted) {
          setProducts(data);
        }
      } catch (err) {
        console.error('Failed to load products:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter products by search query
  const searchFilteredProducts = products.filter((product) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const name = (product.name || '').toLowerCase();
    const desc = (product.description || '').toLowerCase();
    const section = (product.section_name || '').toLowerCase();
    return name.includes(query) || desc.includes(query) || section.includes(query);
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
      <Navbar storeIsOpen={storeIsOpen} />

      {/* 2. Main Container: max-w-5xl mx-auto px-3 sm:px-6 pb-28 pt-3 */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-6 pb-28 pt-3 space-y-3">
        {/* If Store is Closed, render compact live Closed Notice */}
        {!storeIsOpen && <ClosedNotice />}

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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs shrink-0 transition-colors cursor-pointer select-none ${
                  isSelected
                    ? 'bg-[#F5F2EB] text-[#141210] font-semibold shadow-sm'
                    : 'bg-[#1F1C18] text-[#A8A29E] hover:text-[#F5F2EB] border border-[#2E2924]'
                }`}
              >
                <span>{sec.shortName || sec.name}</span>
                <span
                  className={`font-mono text-[10px] tabular-nums ${
                    isSelected ? 'text-[#141210] opacity-80' : 'text-[#A8A29E]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 4. Dense Mobile Grid & Product Display */}
        <div className="space-y-6 pt-1">
          {loading ? (
            <div className="space-y-6">
              {[1, 2].map((s) => (
                <div key={s} className="space-y-3">
                  <div className="h-6 w-36 bg-[#1F1C18] rounded-md animate-pulse" />
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-4">
                    {[1, 2, 3, 4].map((n) => (
                      <div
                        key={n}
                        className="bg-[#1F1C18] border border-[#2E2924] rounded-2xl p-2.5 flex flex-col justify-between animate-pulse h-64"
                      >
                        <div className="aspect-square w-full rounded-xl bg-[#292520]" />
                        <div className="space-y-1.5 mt-2">
                          <div className="h-3.5 w-3/4 bg-[#292520] rounded" />
                          <div className="h-3 w-1/2 bg-[#292520] rounded" />
                        </div>
                        <div className="h-8 w-full bg-[#292520] rounded-lg mt-3" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : groupedSections.length === 0 ? (
            <div className="p-8 sm:p-12 rounded-2xl bg-[#1F1C18] border border-[#2E2924] text-center space-y-3">
              <h3 className="text-sm font-bold text-[#F5F2EB]">No items found</h3>
              <p className="text-xs text-[#A8A29E]">
                {searchQuery
                  ? `No products matched "${searchQuery}".`
                  : 'No items available in this category.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedSection('all');
                  setSearchQuery('');
                }}
                className="mt-2 px-3 py-1.5 rounded-lg bg-[#292520] hover:bg-[#38332C] text-xs font-semibold text-[#F5F2EB] border border-[#2E2924] transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
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
                      isClosed={!storeIsOpen}
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
        storeIsOpen={storeIsOpen}
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
