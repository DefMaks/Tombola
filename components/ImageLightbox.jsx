'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ImageLightbox({
  images = [],
  initialIndex = 0,
  isOpen = false,
  onClose,
  title = '',
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  // Sync index when initialIndex changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setIsZoomed(false);
    }
  }, [isOpen, initialIndex]);

  // Lock body scroll when open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  const hasMultiple = images.length > 1;

  const goToNext = useCallback(() => {
    if (!hasMultiple) return;
    setIsZoomed(false);
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [hasMultiple, images.length]);

  const goToPrev = useCallback(() => {
    if (!hasMultiple) return;
    setIsZoomed(false);
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [hasMultiple, images.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'ArrowLeft') {
        goToPrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, goToNext, goToPrev, onClose]);

  // Touch swipe support
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    // Horizontal swipe if dx > 50 and more significant than vertical
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex] || images[0];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex flex-col justify-between bg-black/95 backdrop-blur-md select-none touch-pan-y"
      >
        {/* Top Header Bar */}
        <div className="relative z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          <div className="flex items-center gap-2.5 min-w-0 pr-4">
            <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full shrink-0">
              {currentIndex + 1} / {images.length}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-white/90 truncate">
              {currentImage.caption || title || 'Prix'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsZoomed((prev) => !prev)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title={isZoomed ? 'Dézoomer' : 'Zoomer'}
              aria-label="Zoomer"
            >
              {isZoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Fermer (Échap)"
              aria-label="Fermer la lightbox"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Central Viewport */}
        <div
          className="relative flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden cursor-pointer"
          onClick={(e) => {
            // Close if clicking outside the image
            if (e.target === e.currentTarget) {
              onClose?.();
            }
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Previous button */}
          {hasMultiple && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToPrev();
              }}
              className="absolute left-2 sm:left-4 z-20 p-2.5 sm:p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 backdrop-blur-sm transition-all transform active:scale-90 cursor-pointer shadow-xl"
              aria-label="Photo précédente"
            >
              <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          )}

          {/* Main Image with animation */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentImage.url}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="relative max-h-full max-w-full flex items-center justify-center cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={currentImage.url}
                alt={currentImage.caption || title}
                className={cn(
                  "max-h-[72vh] max-w-[92vw] sm:max-w-[85vw] object-contain rounded-xl shadow-2xl transition-transform duration-300 select-none",
                  isZoomed ? "scale-150 cursor-zoom-out" : "cursor-zoom-in"
                )}
                onClick={() => setIsZoomed((prev) => !prev)}
                draggable={false}
              />
            </motion.div>
          </AnimatePresence>

          {/* Next button */}
          {hasMultiple && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              className="absolute right-2 sm:right-4 z-20 p-2.5 sm:p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 backdrop-blur-sm transition-all transform active:scale-90 cursor-pointer shadow-xl"
              aria-label="Photo suivante"
            >
              <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          )}
        </div>

        {/* Bottom Thumbnail Strip */}
        <div className="relative z-10 px-4 py-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
          {currentImage.caption && (
            <p className="text-center text-xs text-white/70 mb-2 truncate max-w-md mx-auto">
              {currentImage.caption}
            </p>
          )}

          {hasMultiple && (
            <div className="flex items-center justify-center gap-2 overflow-x-auto py-1 scrollbar-none max-w-lg mx-auto">
              {images.map((img, idx) => (
                <button
                  key={img.id || idx}
                  type="button"
                  onClick={() => {
                    setIsZoomed(false);
                    setCurrentIndex(idx);
                  }}
                  className={cn(
                    "relative h-12 w-12 sm:h-14 sm:w-14 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer",
                    currentIndex === idx
                      ? "border-amber-400 ring-2 ring-amber-400/40 scale-105 opacity-100"
                      : "border-transparent opacity-50 hover:opacity-80"
                  )}
                  aria-label={`Aller à la photo ${idx + 1}`}
                >
                  <img
                    src={img.url}
                    alt={img.caption || `Miniature ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
