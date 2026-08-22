'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Sparkles, ChevronRight, ShieldCheck, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import CommuneSelectModal from './CommuneSelectModal';

interface CommuneNoticeBannerProps {
  userPhone?: string | null;
  commune?: string | null;
  lockedUntil?: string | null;
  onCommuneUpdated?: (newCommune: string) => void;
}

export default function CommuneNoticeBanner({
  userPhone,
  commune,
  lockedUntil,
  onCommuneUpdated,
}: CommuneNoticeBannerProps) {
  const [modalOpen, setModalOpen] = useState(false);

  // If user is not logged in, we don't display the missing commune prompt
  if (!userPhone) return null;

  // Case 1: User has not set their commune yet
  if (!commune) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-amber-600/15 border-2 border-amber-500/40 p-3.5 sm:p-4 shadow-lg shadow-amber-500/10 mb-4"
        >
          <div className="flex items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0 mt-0.5 sm:mt-0">
                <MapPin className="h-5 w-5 animate-bounce" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-sm text-foreground">
                    Débloquez les Tombolas de votre Commune !
                  </span>
                  <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-400 bg-amber-500/10">
                    Action requise
                  </Badge>
                </div>
               
              </div>
            </div>

            <Button
              onClick={() => setModalOpen(true)}
              size="sm"
              className="shrink-0 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-black text-xs rounded-xl shadow-md px-3.5 h-9"
            >
              Préciser <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </motion.div>

        <CommuneSelectModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          currentCommune={commune}
          lockedUntil={lockedUntil}
          phone={userPhone}
          onSuccess={(c) => onCommuneUpdated?.(c)}
        />
      </>
    );
  }

  // Case 2: User has a commune defined - display active territorial scope indicator
  return (
    <>
      <div className="flex items-center justify-between gap-2 p-2.5 px-3 rounded-2xl bg-card border border-border/80 text-xs mb-4 shadow-sm">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <MapPin className="h-3.5 w-3.5" />
          </div>
          <div className="truncate">
            <span className="text-muted-foreground text-[11px]">Tombolas affichées : </span>
            <span className="font-bold text-foreground">Ville de Kinshasa</span>
            <span className="text-muted-foreground"> + </span>
            <span className="font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">
              {commune}
            </span>
          </div>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="text-[11px] font-bold text-amber-400 hover:text-amber-300 underline shrink-0 cursor-pointer"
        >
          Détails
        </button>
      </div>

      <CommuneSelectModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        currentCommune={commune}
        lockedUntil={lockedUntil}
        phone={userPhone}
        onSuccess={(c) => onCommuneUpdated?.(c)}
      />
    </>
  );
}
