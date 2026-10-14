'use client';

import React, { useState, useEffect } from 'react';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import flameAnimation from '@/public/lottie/flame.json';

// Shared module cache to only import lottie-react once across all flame instances
let lottieModulePromise = null;
function getLottieComponent() {
  if (!lottieModulePromise) {
    lottieModulePromise = import('lottie-react').then((mod) => mod.LottieSvg || mod.Lottie || mod.default);
  }
  return lottieModulePromise;
}

export function LottieFlame({ 
  className, 
  size = 18, 
  isGray = false,
  isMaxTier = false,
  title
}) {
  const [LottieComp, setLottieComp] = useState(null);

  useEffect(() => {
    let isSubscribed = true;
    getLottieComponent().then((Comp) => {
      if (isSubscribed && Comp) {
        setLottieComp(() => Comp);
      }
    });
    return () => {
      isSubscribed = false;
    };
  }, []);

  if (isGray) {
    return (
      <Flame
        title={title}
        style={{ width: size, height: size }}
        className={cn(
          "text-slate-500/40 fill-slate-700/20 stroke-slate-500/50 shrink-0",
          className
        )}
      />
    );
  }

  // Fallback while loading lottie or during SSR (CLS = 0)
  if (!LottieComp) {
    return (
      <span 
        title={title}
        style={{ width: size, height: size }}
        className={cn("inline-flex items-center justify-center shrink-0", className)}
      >
        <Flame
          style={{ width: size, height: size }}
          className={cn(
            "text-amber-400 fill-amber-500 animate-pulse shrink-0",
            isMaxTier && "text-cyan-400 fill-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.85)]"
          )}
        />
      </span>
    );
  }

  return (
    <span
      title={title}
      style={{ width: size, height: size }}
      className={cn(
        "inline-flex items-center justify-center shrink-0 relative overflow-visible select-none",
        isMaxTier 
          ? "filter drop-shadow-[0_0_8px_rgba(56,189,248,0.85)] hue-rotate-[165deg]" 
          : "filter drop-shadow-[0_0_6px_rgba(245,158,11,0.75)]",
        className
      )}
    >
      <div style={{ width: size * 1.3, height: size * 1.3 }} className="flex items-center justify-center shrink-0 pointer-events-none">
        <LottieComp
          src={flameAnimation}
          loop={true}
          autoplay={true}
          renderer="svg"
          rendererSettings={{
            preserveAspectRatio: 'xMidYMid meet',
            progressiveLoad: true,
          }}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </span>
  );
}

export default LottieFlame;
