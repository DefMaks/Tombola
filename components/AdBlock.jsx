'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DEFAULT_ZONE_BANNERS = {
  home: 'https://ucarecdn.com/3ce456eb-dde0-4acd-a56d-8dcc2cad8786/meetDefmaks.png',
  in_read: 'https://ucarecdn.com/6396e774-b7f5-4dbe-97de-85ffd257b3d7/-/preview/1000x384/',
  inner: 'https://ucarecdn.com/cb9cd42d-0937-44fc-a9b2-2df625a1a61a/-/preview/1000x488/',
  single: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&q=80',
  page: 'https://ucarecdn.com/cb9cd42d-0937-44fc-a9b2-2df625a1a61a/-/preview/1000x488/',
  void: 'https://ucarecdn.com/cb9cd42d-0937-44fc-a9b2-2df625a1a61a/-/preview/1000x488/',
};

/**
 * Purely Graphical Multi-Source Carousel AdBlock component:
 * - Accepts `sources` / `src` (e.g., `["SPB", "NDB"]` or `'["SPB", "NDB"]'`)
 * - Auto-slides if multiple active ads exist across requested sources.
 * - Pauses on hover.
 */
export default function AdBlock({ zone = 'home', sources, src, source, ad, className = '' }) {
  // Normalize sources parameter
  let sourcesParam = 'SPB,NDB';
  const rawProp = src || sources || source;
  if (Array.isArray(rawProp)) {
    sourcesParam = rawProp.join(',');
  } else if (typeof rawProp === 'string') {
    if (rawProp.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(rawProp);
        if (Array.isArray(parsed)) sourcesParam = parsed.join(',');
      } catch (e) {
        sourcesParam = rawProp;
      }
    } else {
      sourcesParam = rawProp;
    }
  }

  const queryUrl = `/api/ads/${zone}?sources=${encodeURIComponent(sourcesParam)}`;

  const { data: fetchedAdsData } = useQuery({
    queryKey: ['ads', zone, sourcesParam],
    queryFn: () => fetch(queryUrl).then(r => r.json()),
    enabled: !ad,
    refetchInterval: 60_000,
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [imgError, setImgError] = useState({});

  const defaultBanner = DEFAULT_ZONE_BANNERS[zone] || DEFAULT_ZONE_BANNERS.home;
  const defaultAd = {
    id: 'default',
    title: 'Publicité DefMaks',
    external_link: 'https://defmaks.com',
    image_url: defaultBanner,
    source: 'SPB',
    zone: zone,
  };

  // Determine array of ads
  let adsList = [];
  if (ad) {
    adsList = Array.isArray(ad) ? ad : [ad];
  } else if (Array.isArray(fetchedAdsData) && fetchedAdsData.length > 0) {
    adsList = fetchedAdsData;
  } else {
    adsList = [defaultAd];
  }

  const total = adsList.length;

  // Auto-slide effect
  useEffect(() => {
    if (total <= 1 || isHovered) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % total);
    }, 5000);
    return () => clearInterval(interval);
  }, [total, isHovered]);

  const currentAd = adsList[currentIndex] || adsList[0] || defaultAd;
  const adSource = currentAd.source || 'SPB';
  const adZone = currentAd.zone || zone;
  const hasImgErr = imgError[currentAd.id || currentIndex];
  const imageUrl = (!hasImgErr && currentAd.image_url) ? currentAd.image_url : defaultBanner;

  const nextSlide = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % total);
  };

  const prevSlide = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  };

  const Wrap = ({ children }) => {
    if (currentAd.external_link) {
      return (
        <a href={currentAd.external_link} target="_blank" rel="noopener noreferrer" className="block group">
          {children}
        </a>
      );
    }
    if (currentAd.inner_link) {
      return (
        <Link href={currentAd.inner_link} className="block group">
          {children}
        </Link>
      );
    }
    return <div className="block group">{children}</div>;
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`px-4 pt-4 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-ad-source={adSource}
      data-ad-zone={adZone}
    >
      <Wrap>
        <div className="relative overflow-hidden rounded-2xl bg-card border border-border/80 shadow-md transition-all duration-300 group-hover:shadow-lg group-hover:border-amber-500/50">
          {/* Ad Image Container */}
          <div className="relative min-h-[120px] max-h-[260px] overflow-hidden flex items-center justify-center">
            {total > 1 ? (
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentAd.id || currentIndex}
                  src={imageUrl}
                  alt={currentAd.title || 'Publicité DefMaks'}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: 0.4 }}
                  onError={() => setImgError(prev => ({ ...prev, [currentAd.id || currentIndex]: true }))}
                  className="w-full h-auto max-h-[260px] object-cover rounded-2xl transition-transform duration-300 group-hover:scale-[1.01]"
                />
              </AnimatePresence>
            ) : (
              <img
                src={imageUrl}
                alt={currentAd.title || 'Publicité DefMaks'}
                onError={() => setImgError(prev => ({ ...prev, [currentAd.id || currentIndex]: true }))}
                className="w-full h-auto max-h-[260px] object-cover rounded-2xl transition-transform duration-300 group-hover:scale-[1.01]"
              />
            )}
          </div>

          {/* Discrete Badge Overlay */}
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 pointer-events-none z-10">
            <span className="bg-slate-950/80 backdrop-blur-md text-amber-400 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border border-amber-400/40 shadow-sm">
              Sponsorisé
            </span>
          </div>

          {/* Carousel Arrows (if > 1 ad) */}
          {total > 1 && (
            <>
              <button
                onClick={prevSlide}
                type="button"
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-950/60 text-white/90 hover:bg-slate-950 hover:text-white transition-all opacity-0 group-hover:opacity-100 z-20 backdrop-blur-sm"
                aria-label="Publicité précédente"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={nextSlide}
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-950/60 text-white/90 hover:bg-slate-950 hover:text-white transition-all opacity-0 group-hover:opacity-100 z-20 backdrop-blur-sm"
                aria-label="Publicité suivante"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              {/* Pagination Dots */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20 px-2 py-1 rounded-full bg-slate-950/50 backdrop-blur-sm">
                {adsList.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCurrentIndex(idx);
                    }}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === currentIndex ? 'w-4 bg-amber-400' : 'w-1.5 bg-white/50 hover:bg-white'
                    }`}
                    aria-label={`Aller à la pub ${idx + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </Wrap>
    </motion.section>
  );
}
