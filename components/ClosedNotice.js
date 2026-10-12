'use client';

import React, { useState, useEffect } from 'react';
import { Moon, Clock, Sparkles, BellRing, ArrowRight } from 'lucide-react';
import { getStoreScheduleInfo } from '../utils/operatingHours';

export default function ClosedNotice({ onForceOpen }) {
  const [schedule, setSchedule] = useState({ countdown: 'a few hours' });

  useEffect(() => {
    const update = () => {
      setSchedule(getStoreScheduleInfo());
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto my-8 px-4">
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 via-zinc-950/90 to-zinc-950 p-8 sm:p-12 text-center shadow-2xl backdrop-blur-xl">
        {/* Ambient glow backgrounds */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 h-48 w-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        {/* Night moon badge */}
        <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-zinc-900/80 border border-zinc-700/80 shadow-inner mb-6">
          <Moon className="w-10 h-10 text-amber-300 animate-pulse" />
        </div>

        {/* Status Pill */}
        <div className="flex justify-center mb-4">
          <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 border border-rose-500/30 text-rose-400">
            <span className="h-2 w-2 rounded-full bg-rose-500"></span>
            Currently Closed for the Day
          </span>
        </div>

        {/* Main headline */}
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-sans mb-3">
          Hostel Kitchen & Printers Sleep by Day
        </h2>

        <p className="text-zinc-400 max-w-xl mx-auto text-base sm:text-lg mb-8 leading-relaxed">
          KhaoMojo operates exclusively between <strong className="text-white font-semibold">10:00 PM and 4:00 AM</strong> for late-night hostel cravings, midnight tea-maggi runs, and urgent early-morning assignment prints.
        </p>

        {/* Operating hours schedule card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto mb-8 text-left">
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-1">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Next Night Shift</span>
            </div>
            <div className="text-lg font-bold text-white">10:00 PM Tonight</div>
            <div className="text-xs text-emerald-400 mt-1">Free room delivery resumes</div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-1">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Opens In</span>
            </div>
            <div className="text-lg font-bold text-amber-300 font-mono">
              {schedule.countdown || 'Tonight'}
            </div>
            <div className="text-xs text-zinc-400 mt-1">Cart will automatically activate</div>
          </div>
        </div>

        {/* Cart Disabled Notice */}
        <div className="p-3.5 max-w-md mx-auto rounded-xl bg-zinc-900/90 border border-zinc-800/80 text-xs text-zinc-400 mb-6 flex items-center justify-center gap-2">
          <BellRing className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Ordering and checkout are disabled until opening time.</span>
        </div>

        {/* Testing / Previewer Override Button */}
        {onForceOpen && (
          <div className="pt-4 border-t border-zinc-800/80">
            <p className="text-xs text-zinc-500 mb-3">
              Testing or evaluating the app during daytime hours?
            </p>
            <button
              onClick={onForceOpen}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700 text-xs font-semibold transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>⚡ Override Hours: Force Open Store for Testing</span>
              <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
