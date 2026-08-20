'use client';

import { motion, AnimatePresence } from 'framer-motion';

export default function AppLoadingScreen({ isVisible = true, message = 'Chargement des tombolas...' }) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="app-loading-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.45, ease: 'easeInOut' } }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-2xl"
        >
          {/* Ambient Radial Glow */}
          <div className="absolute w-72 h-72 rounded-full bg-amber-500/15 blur-3xl -z-10 animate-pulse pointer-events-none" />

          <div className="flex flex-col items-center justify-center text-center p-6 max-w-xs">
            {/* Animated Logo Container */}
            <div className="relative mb-6">
              {/* Outer pulsing ring */}
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.7, 0.3] }}
                transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                className="absolute -inset-3 rounded-3xl bg-gradient-to-tr from-amber-500/30 to-orange-500/20 blur-md"
              />

              {/* Logo Box */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                className="relative h-24 w-24 rounded-3xl bg-slate-900/90 border border-amber-500/40 p-4 shadow-2xl shadow-amber-500/20 flex items-center justify-center overflow-hidden"
              >
                {/* Internal Shimmer */}
                <motion.div
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: 'linear' }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
                />

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/P-punchy-emblem.png"
                  alt="Punchy"
                  className="h-16 w-16 object-contain drop-shadow-[0_4px_12px_rgba(245,158,11,0.5)]"
                />
              </motion.div>
            </div>

            {/* Typography */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="space-y-2"
            >
              <h2 className="text-xl font-black tracking-tight text-foreground">
                PUNCHY
              </h2>
              <p className="text-xs font-semibold text-muted-foreground flex items-center justify-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                {message}
              </p>
            </motion.div>

            {/* Animated Progress Bar */}
            <div className="w-36 h-1 rounded-full bg-muted overflow-hidden mt-5">
              <motion.div
                animate={{ x: ['-100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                className="w-full h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
