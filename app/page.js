'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import ProductCard from '../components/ProductCard';
import PrintUploadModal from '../components/PrintUploadModal';
import CartDrawer from '../components/CartDrawer';
import OrderSuccessModal from '../components/OrderSuccessModal';
import ClosedNotice from '../components/ClosedNotice';
import { fetchProducts, subscribeToRealtime } from '../utils/dataService';
import { isStoreOpen } from '../utils/operatingHours';
import { 
  Search, Flame, Printer, Cookie, ShoppingBag, 
  Sparkles, Clock, RefreshCw, Layers, CheckCircle2 
} from 'lucide-react';

export const SECTIONS_CONFIG = [
  {
    name: "Lay's Collection",
    tagline: 'Crispy, classic & tangy flavors of Lay’s potato chips',
    badge: '4 Flavors Available',
    badgeColor: 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10',
  },
  {
    name: 'Kurkure Collection',
    tagline: 'Tedha Hai Par Mera Hai — Crunchy Masala Munch & soft Puffcorn',
    badge: 'Hostel Favorite',
    badgeColor: 'border-orange-500/30 text-orange-400 bg-orange-500/10',
  },
  {
    name: 'Bingo Collection',
    tagline: 'Tangy Achaari Masti triangles & fiery Very Peri Peri crunch',
    badge: 'Spicy Tang',
    badgeColor: 'border-red-500/30 text-red-400 bg-red-500/10',
  },
  {
    name: 'Soya Sticks',
    tagline: 'Chatpata spiced crispy roasted protein sticks for late night crunch',
    badge: 'Desi Crunch',
    badgeColor: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
  },
  {
    name: 'Packed Maggi',
    tagline: 'The undisputed 2 AM hostel survival meal with authentic masala tastemaker',
    badge: 'Essential',
    badgeColor: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
  },
  {
    name: 'Fresh Eggs',
    tagline: 'Farm fresh poultry eggs for quick midnight omelettes, bhurji & boils',
    badge: 'High Protein',
    badgeColor: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
  },
  {
    name: 'Oreo',
    tagline: 'Rich dark cocoa biscuit cookies sandwiched with smooth vanilla cream',
    badge: 'Midnight Sweet',
    badgeColor: 'border-blue-500/30 text-blue-400 bg-blue-500/10',
  },
  {
    name: 'Other Biscuits',
    tagline: 'Chai companions: Parle-G, Bourbon, Milk Bikis & Tiger glucose biscuits',
    badge: 'Chai Dunkers',
    badgeColor: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
  },
  {
    name: 'Print Services',
    tagline: 'Urgent assignment prints & lab reports ready for hostel pickup',
    badge: '2 AM Fast Printout',
    badgeColor: 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10',
  },
  {
    name: 'Academic & Tech Services',
    tagline: 'Custom PPTs, lab Excel sheets & coding projects for college deadlines',
    badge: 'Tech & PPTs',
    badgeColor: 'border-violet-500/30 text-violet-400 bg-violet-500/10',
  },
];

function getProductSection(product) {
  if (product.section_name) return product.section_name;
  const name = (product.name || '').toLowerCase();
  if (
    product.category === 'academic_service' ||
    name.includes('ppt') ||
    name.includes('excel sheet') ||
    name.includes('coding')
  ) {
    return 'Academic & Tech Services';
  }
  if (name.includes("lay's") || name.includes('lays')) return "Lay's Collection";
  if (name.includes('kurkure') || name.includes('puffcorn')) return 'Kurkure Collection';
  if (name.includes('bingo') || name.includes('achari') || name.includes('achaari') || name.includes('peri peri')) return 'Bingo Collection';
  if (name.includes('soya')) return 'Soya Sticks';
  if (name.includes('maggi')) return 'Packed Maggi';
  if (name.includes('egg')) return 'Fresh Eggs';
  if (name.includes('oreo')) return 'Oreo';
  if (name.includes('parle') || name.includes('bourbon') || name.includes('bikis') || name.includes('tiger')) return 'Other Biscuits';
  if (product.category === 'print_service' || name.includes('print') || name.includes('sheet') || name.includes('binding')) {
    return 'Print Services';
  }
  return 'Other Biscuits';
}

export default function StorefrontPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Operating hours override for tester convenience (null = use actual time)
  const [forcedOverride, setForcedOverride] = useState(null);
  
  // Modals state
  const [activePrintProduct, setActivePrintProduct] = useState(null);
  const [lastPlacedOrder, setLastPlacedOrder] = useState(null);

  // Check store hours inside useEffect for client runtime evaluation
  const [storeIsOpen, setStoreIsOpen] = useState(true);

  useEffect(() => {
    setStoreIsOpen(isStoreOpen(forcedOverride));
    const timer = setInterval(() => {
      setStoreIsOpen(isStoreOpen(forcedOverride));
    }, 30000);
    return () => clearInterval(timer);
  }, [forcedOverride]);

  // Load products & set up realtime updates
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

    // Subscribe to realtime product updates (e.g. stock deduction when orders placed)
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
    });

    return () => {
      isMounted = false;
      unsubscribe();
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
    // If a specific section is selected, only show that section
    if (selectedSection !== 'all' && sec.name !== selectedSection) {
      return false;
    }
    // Only show sections that have products matching search query
    return sec.products.length > 0;
  });

  const totalFilteredCount = groupedSections.reduce(
    (sum, sec) => sum + sec.products.length,
    0
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-zinc-950">
      {/* Top Navbar */}
      <Navbar forcedOverride={forcedOverride} setForcedOverride={setForcedOverride} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* If Store is Closed, render Closed Notice prominently */}
        {!storeIsOpen && (
          <ClosedNotice onForceOpen={() => setForcedOverride(true)} />
        )}

        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800 p-6 sm:p-10 shadow-2xl">
          {/* Neon ambient blobs */}
          <div className="absolute top-0 right-10 h-64 w-64 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-10 h-64 w-64 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none" />

          <div className="relative max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-4">
              <Clock className="w-3.5 h-3.5 animate-spin-slow" />
              <span>Hostel Late-Night Service • 10:00 PM – 4:00 AM</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Midnight Hunger & <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                Last-Minute Assignment Prints.
              </span>
            </h1>

            <p className="mt-3 text-zinc-400 text-sm sm:text-base leading-relaxed max-w-xl">
              Order Lay’s, Kurkure, packed Maggi, Oreo, biscuits, and get your PDF assignments printed and delivered straight to your hostel room in 15 minutes.
            </p>

            {/* Search Bar */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3 max-w-lg">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search Lay's, Kurkure, Maggi, Oreo, Printout..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-zinc-950/80 border border-zinc-700/80 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-400 transition"
                />
              </div>

              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-white rounded-xl bg-zinc-800 transition"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Section Quick Jump Filter Bar */}
        <section className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedSection('all')}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all shrink-0 border ${
              selectedSection === 'all'
                ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-md shadow-emerald-500/20 scale-[1.02]'
                : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>All Collections</span>
          </button>

          {SECTIONS_CONFIG.map((sec) => {
            const isSelected = selectedSection === sec.name;
            const count = products.filter((p) => getProductSection(p) === sec.name).length;

            return (
              <button
                key={sec.name}
                onClick={() => setSelectedSection(sec.name)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all shrink-0 border ${
                  isSelected
                    ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-md shadow-emerald-500/20 scale-[1.02]'
                    : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
                }`}
              >
                <span>{sec.name}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    isSelected
                      ? 'bg-zinc-950 text-emerald-400'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </section>

        {/* Section-Based Product Display */}
        <div className="space-y-12">
          {loading ? (
            <div className="space-y-8">
              {[1, 2].map((s) => (
                <div key={s} className="space-y-4">
                  <div className="h-8 w-48 bg-zinc-900 rounded-lg animate-pulse" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                    {[1, 2, 3, 4].map((n) => (
                      <div
                        key={n}
                        className="h-72 rounded-2xl bg-zinc-900/50 border border-zinc-800 animate-pulse p-4 flex flex-col justify-between"
                      >
                        <div className="h-40 w-full bg-zinc-800/50 rounded-xl" />
                        <div className="space-y-2">
                          <div className="h-4 w-3/4 bg-zinc-800/60 rounded" />
                          <div className="h-3 w-1/2 bg-zinc-800/40 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : groupedSections.length === 0 ? (
            <div className="p-12 rounded-3xl bg-zinc-900/40 border border-zinc-800 text-center space-y-3">
              <ShoppingBag className="w-10 h-10 text-zinc-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No items found</h3>
              <p className="text-xs text-zinc-400">
                {searchQuery
                  ? `No products matched "${searchQuery}".`
                  : 'No products available in this section.'}
              </p>
              <button
                onClick={() => {
                  setSelectedSection('all');
                  setSearchQuery('');
                }}
                className="mt-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            groupedSections.map((section) => (
              <section
                key={section.name}
                id={section.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}
                className="space-y-4 scroll-mt-24"
              >
                {/* Distinct Section Header as requested */}
                {section.name === 'Academic & Tech Services' ? (
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-4 mt-8">Academic & Tech Services</h2>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/80 pb-3 gap-2 -mt-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${section.badgeColor}`}
                        >
                          {section.badge}
                        </span>
                        <p className="text-xs text-zinc-400">
                          {section.tagline}
                        </p>
                      </div>
                      <span className="text-xs font-mono text-zinc-500 self-start sm:self-auto">
                        {section.products.length} {section.products.length === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-zinc-800/80 pb-3 gap-2">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h2 className="text-2xl font-bold text-white tracking-tight">
                          {section.name}
                        </h2>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${section.badgeColor}`}
                        >
                          {section.badge}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">
                        {section.tagline}
                      </p>
                    </div>

                    <span className="text-xs font-mono text-zinc-500 self-start sm:self-auto">
                      {section.products.length} {section.products.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                )}

                {/* Section Specific Product Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
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

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950 py-8 px-4 text-center text-xs text-zinc-500 space-y-2 mt-12">
        <p className="font-semibold text-zinc-400">
          KhaoMojo • Late-Night Hostel Pickup & Printing Service
        </p>
        <p>
          Operational 10:00 PM – 4:00 AM
        </p>
        <p className="text-amber-400 font-semibold text-xs sm:text-sm">
          Pickup details: B Block room no 810 and C block room no 422.
        </p>
      </footer>

      {/* Slide-out Cart Sidebar */}
      <CartDrawer
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
