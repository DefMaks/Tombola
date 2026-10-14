'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import LottieFlame from '@/components/LottieFlame';

export const PALIERS = [20, 100, 200, 500];

export function PalierFireBadges({ count = 0, variant = 'compact', className }) {
  // Count how many palier thresholds are reached
  let reachedCount = 0;
  for (const p of PALIERS) {
    if (count >= p) reachedCount++;
  }

  // Show 1 gray icon for the next upcoming palier if not all reached
  const showNextGray = reachedCount < PALIERS.length;
  const isAllMax = reachedCount === PALIERS.length;

  const pixelSize = variant === 'detailed' ? 22 : 16;
  const containerClass = variant === 'detailed' 
    ? cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl shrink-0 transition-all shadow-sm',
        isAllMax 
          ? 'bg-amber-500/20 border border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.25)]' 
          : 'bg-amber-500/10 border border-amber-500/25'
      )
    : cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-xl shrink-0 transition-all',
        isAllMax 
          ? 'bg-amber-500/20 border border-amber-400/40 shadow-[0_0_8px_rgba(245,158,11,0.2)]' 
          : 'bg-amber-500/10 border border-amber-500/20'
      );

  return (
    <div 
      className={cn(containerClass, className)}
      title={
        reachedCount > 0 
          ? `${reachedCount}/${PALIERS.length} paliers atteints (${count} participations)` 
          : `Premier palier à ${PALIERS[0]} participations`
      }
    >
      {/* Reached animated Lottie fire icons */}
      {Array.from({ length: reachedCount }).map((_, i) => (
        <LottieFlame
          key={`lottie-flame-${i}`}
          size={pixelSize}
          isMaxTier={i === 3} // 500+ tickets unlocks the ultimate tier
          title={`Palier ${PALIERS[i]} participations atteint !`}
        />
      ))}

      {/* Upcoming locked gray fire icon */}
      {showNextGray && (
        <LottieFlame
          key="lottie-flame-upcoming"
          size={pixelSize}
          isGray={true}
          title={`Prochain palier : ${PALIERS[reachedCount]} participations`}
        />
      )}

      {/* Optional detail label when in detailed variant */}
      {variant === 'detailed' && (
        <span className="text-xs font-black text-amber-400 ml-0.5 tracking-tight">
          {isAllMax ? 'FEU MAX !' : `${count}/${PALIERS[reachedCount]}`}
        </span>
      )}
    </div>
  );
}

export default PalierFireBadges;

