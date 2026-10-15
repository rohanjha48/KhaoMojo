'use client';

import React, { useState, useEffect } from 'react';
import { Moon, Clock, Info } from 'lucide-react';
import { getStoreScheduleInfo } from '../utils/operatingHours';

export default function ClosedNotice() {
  const [schedule, setSchedule] = useState({ countdown: 'Tonight' });

  useEffect(() => {
    const update = () => {
      setSchedule(getStoreScheduleInfo());
    };
    update();
    const interval = setInterval(update, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-[#1F1C18] border border-[#2E2924] rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-left shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
          <Moon className="w-4 h-4 text-rose-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold text-[#F5F2EB] tracking-tight">
              Store Currently Closed
            </span>
            <span className="bg-rose-500/15 text-rose-400 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">
              Opens 10:00 PM
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-[#A8A29E] mt-0.5">
            Operational 10 PM – 4 AM • Browse menu & explore items below
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:self-center self-start pl-10 sm:pl-0">
        <div className="bg-[#292520] border border-[#2E2924] px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5 font-mono">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[#A8A29E] text-[11px]">Opens In:</span>
          <span className="text-amber-400 font-bold tabular-nums text-xs">
            {schedule.countdown || 'Tonight'}
          </span>
        </div>
      </div>
    </div>
  );
}
