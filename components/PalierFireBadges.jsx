'use client';

import React from 'react';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

export const PALIERS = [20, 100, 200, 500];

export function PalierFireBadges({ count = 0, variant = 'compact', className }) {
  // Count how many palier thresholds are reached
  let reachedCount = 0;
  for (const p of PALIERS) {
    if (count >= p) reachedCount++;
  }

  // Show 1 gray icon for the next upcoming palier if not all reached
  const showNextGray = reachedCount < PALIERS.length;

  const sizeClass = variant === 'detailed' ? 'h-5 w-5' : 'h-3.5 w-3.5';
  const containerClass = variant === 'detailed' 
    ? 'inline-flex items-center gap-1.5 p-2 bg-amber-500/10 border border-amber-500/25 rounded-xl shrink-0'
    : 'inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-xl shrink-0';

  return (
    <div className={cn(containerClass, className)}>
      {/* Reached colored fire icons */}
      {Array.from({ length: reachedCount }).map((_, i) => (
        <Flame
          key={`colored-${i}`}
          title={`Palier ${PALIERS[i]} participations atteint !`}
          className={cn(
            sizeClass,
            "text-amber-400 fill-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.85)] animate-pulse shrink-0"
          )}
        />
      ))}

      {/* Upcoming gray fire icon */}
      {showNextGray && (
        <Flame
          key="upcoming-gray"
          title={`Prochain palier : ${PALIERS[reachedCount]}`}
          className={cn(
            sizeClass,
            "text-slate-500/40 fill-slate-700/20 stroke-slate-500/50 shrink-0"
          )}
        />
      )}
    </div>
  );
}

export default PalierFireBadges;
