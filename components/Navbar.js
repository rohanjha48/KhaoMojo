'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingBag, Moon, Shield, Clock, Zap, Database } from 'lucide-react';
import { useCart } from './CartContext';
import { getStoreScheduleInfo } from '../utils/operatingHours';
import { isSupabaseConfigured } from '../utils/supabase/client';

export default function Navbar({ forcedOverride, setForcedOverride }) {
  const { totalItems, totalAmount, setIsCartOpen } = useCart();
  const [schedule, setSchedule] = useState({ isOpen: true, bannerText: '' });
  const [isSupabaseLive, setIsSupabaseLive] = useState(false);

  useEffect(() => {
    setIsSupabaseLive(isSupabaseConfigured());
    const update = () => {
      setSchedule(getStoreScheduleInfo());
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, []);

  const currentlyOpen = forcedOverride !== null ? forcedOverride : schedule.isOpen;

  const toggleOverride = () => {
    if (forcedOverride === null) {
      // Toggle to opposite of actual schedule
      const nextVal = !schedule.isOpen;
      setForcedOverride(nextVal);
      localStorage.setItem('khaomojo_force_open', String(nextVal));
    } else if (forcedOverride === true) {
      setForcedOverride(false);
      localStorage.setItem('khaomojo_force_open', 'false');
    } else {
      // Reset to automatic
      setForcedOverride(null);
      localStorage.removeItem('khaomojo_force_open');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl transition-all">
      {/* Top micro announcement bar */}
      <div className="w-full bg-gradient-to-r from-emerald-950/60 via-zinc-900 to-amber-950/40 border-b border-zinc-800/50 py-1.5 px-4 text-xs text-zinc-300 flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-semibold text-emerald-400">10:00 PM – 4:00 AM</span>
          <span className="hidden sm:inline text-amber-300">• Pickup details: B Block room no 810 and C block room no 422.</span>
        </div>

        <div className="flex items-center gap-3 text-xs shrink-0">
          {/* Supabase status badge */}
          <span
            title={isSupabaseLive ? 'Connected to live Supabase Postgres' : 'Running on In-Memory/Local Storage simulation. Add credentials to .env.local for live Supabase.'}
            className={`hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border ${
              isSupabaseLive
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                : 'bg-zinc-800/80 text-zinc-300 border-zinc-700'
            }`}
          >
            <Database className="w-2.5 h-2.5" />
            {isSupabaseLive ? 'Supabase Live' : 'Demo DB Mode'}
          </span>

          {/* Test Mode Simulator button */}
          <button
            onClick={toggleOverride}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-zinc-700 bg-zinc-800/70 hover:bg-zinc-700 text-zinc-300 hover:text-white transition text-[11px]"
            title="Toggle store schedule for demo or testing purposes"
          >
            <Zap className="w-3 h-3 text-amber-400" />
            <span>
              {forcedOverride === null
                ? 'Time: Auto'
                : forcedOverride
                ? 'Forced: Open'
                : 'Forced: Closed'}
            </span>
          </button>
        </div>
      </div>

      {/* Main navigation row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-600 to-indigo-600 p-0.5 shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-all duration-300">
            <div className="h-full w-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
              <Moon className="w-5 h-5 text-emerald-400 group-hover:rotate-12 transition-transform duration-300" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-black tracking-tight text-white font-sans">
                Khao<span className="text-emerald-400">Mojo</span>
              </span>
              <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider">
                Hostel
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 -mt-0.5 font-medium hidden sm:block">
              Late-Night Cravings & 2 AM Printouts
            </p>
          </div>
        </Link>

        {/* Operating status pill */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs">
          <Clock className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-zinc-400">Service Hours:</span>
          {currentlyOpen ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
              Open (10 PM – 4 AM)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-rose-400 font-semibold">
              <span className="h-2 w-2 rounded-full bg-rose-500"></span>
              Closed for the Day
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Admin link */}
          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 transition"
          >
            <Shield className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Admin</span>
          </Link>

          {/* Cart Button */}
          <button
            onClick={() => setIsCartOpen(true)}
            disabled={!currentlyOpen}
            className={`relative flex items-center gap-2.5 px-3.5 py-2 rounded-xl font-semibold text-sm transition-all duration-200 shadow-md ${
              currentlyOpen
                ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98]'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-current" />
            <span className="hidden xs:inline">Cart</span>
            {totalItems > 0 && (
              <span className="flex items-center justify-center bg-zinc-950 text-emerald-400 text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] shadow">
                {totalItems}
              </span>
            )}
            {totalAmount > 0 && (
              <span className="hidden sm:inline border-l border-zinc-950/20 pl-2 font-mono font-bold">
                ₹{totalAmount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
