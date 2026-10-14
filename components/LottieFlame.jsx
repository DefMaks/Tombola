'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import flameAnimation from '@/public/lottie/flame.json';

// Error boundary to guarantee that a decorative badge NEVER crashes the page
class FlameErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[LottieFlame] Handled Lottie error, falling back to SVG:', err?.message);
    }
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Shared module cache to only import lottie-react once
let lottieModulePromise = null;
function getLottieComponent() {
  if (!lottieModulePromise) {
    lottieModulePromise = import('lottie-react')
      .then((mod) => mod.LottieSvg || mod.Lottie || mod.default)
      .catch(() => null);
  }
  return lottieModulePromise;
}

function LottieFlameInner({ 
  className, 
  size = 18, 
  isGray = false,
  isMaxTier = false,
  title
}) {
  const [LottieComp, setLottieComp] = useState(null);

  // Deep-clone animation object per instance to prevent Safari/WebKit mutation collisions
  const animationData = useMemo(() => {
    try {
      return JSON.parse(JSON.stringify(flameAnimation));
    } catch {
      return flameAnimation;
    }
  }, []);

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
  const fallback = (
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

  if (!LottieComp) {
    return fallback;
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
          src={animationData}
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

export function LottieFlame(props) {
  const fallback = (
    <span 
      title={props.title}
      style={{ width: props.size || 18, height: props.size || 18 }}
      className={cn("inline-flex items-center justify-center shrink-0", props.className)}
    >
      <Flame
        style={{ width: props.size || 18, height: props.size || 18 }}
        className={cn(
          "text-amber-400 fill-amber-500 animate-pulse shrink-0",
          props.isMaxTier && "text-cyan-400 fill-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.85)]"
        )}
      />
    </span>
  );

  return (
    <FlameErrorBoundary fallback={fallback}>
      <LottieFlameInner {...props} />
    </FlameErrorBoundary>
  );
}

export default LottieFlame;
