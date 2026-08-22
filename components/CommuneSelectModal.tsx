'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ShieldCheck, AlertCircle, Clock, CheckCircle2, Loader2, Sparkles, Building2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { KINSHASA_COMMUNES } from '@/lib/constants/communes';

interface CommuneSelectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCommune?: string | null;
  lockedUntil?: string | null;
  phone?: string | null;
  onSuccess?: (newCommune: string) => void;
}

export default function CommuneSelectModal({
  open,
  onOpenChange,
  currentCommune,
  lockedUntil,
  phone,
  onSuccess,
}: CommuneSelectModalProps) {
  const [selectedCommune, setSelectedCommune] = useState<string>(currentCommune || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentCommune) {
      setSelectedCommune(currentCommune);
    }
  }, [currentCommune, open]);

  const isLocked = (() => {
    if (!lockedUntil || !currentCommune) return false;
    return new Date(lockedUntil).getTime() > Date.now();
  })();

  const remainingDays = (() => {
    if (!lockedUntil) return 0;
    const diff = new Date(lockedUntil).getTime() - Date.now();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

  const lockDateFormatted = lockedUntil
    ? new Date(lockedUntil).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  const handleSave = async () => {
    if (!selectedCommune) {
      toast.error('Veuillez choisir votre commune de résidence.');
      return;
    }

    if (!phone) {
      toast.error('Veuillez vous connecter pour enregistrer votre commune.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/my/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          commune: selectedCommune,
          city: 'Kinshasa',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de l’enregistrement de la commune.');
      }

      toast.success(`Votre commune (${selectedCommune}) a été enregistrée avec succès !`);
      onSuccess?.(selectedCommune);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Impossible de mettre à jour la commune.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl bg-card border border-amber-500/30 p-6 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-left space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <MapPin className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
                Commune de Résidence
                <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-[10px] bg-amber-500/10">
                  Kinshasa 🇨🇩
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Tombolas territoriales & Tombolas de la ville
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Motif & Explication Pédagogique */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-slate-900/60 to-orange-500/10 border border-amber-500/25 space-y-2 text-xs leading-relaxed">
            <div className="font-bold text-amber-400 flex items-center gap-1.5 text-sm">
              <Sparkles className="h-4 w-4" /> Pourquoi préciser votre commune ?
            </div>
            <p className="text-muted-foreground">
              Punchy organise des <strong className="text-foreground">Tombolas Communales</strong> exclusives, avec un nombre de participants réduit et <strong className="text-amber-400">des chances de gain décuplées</strong> pour les habitants locaux.
            </p>
            <div className="flex items-start gap-2 pt-1">
              <Building2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <span className="text-muted-foreground">
                En indiquant votre commune, vous accédez à <strong className="text-foreground">toutes les tombolas de la Ville de Kinshasa</strong> + les <strong className="text-emerald-400">tombolas réservées à votre commune</strong>.
              </span>
            </div>
          </div>

          {/* Règle Anti-opportunisme 90 jours */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-border/80 flex items-start gap-3 text-xs">
            <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-foreground">Règle de verrouillage (90 jours)</div>
              <p className="text-muted-foreground text-[11px]">
                Pour garantir l&apos;équité des tirages locaux et éviter l&apos;opportunisme, votre commune est verrouillée pour <strong className="text-amber-400">3 mois</strong> dès sa sélection.
              </p>
            </div>
          </div>

          {/* Lock status banner if locked */}
          {isLocked && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Commune actuellement verrouillée</span>
                Votre commune est fixée sur <strong className="text-white">{currentCommune}</strong> jusqu&apos;au {lockDateFormatted} (encore {remainingDays} jour(s) de verrouillage).
              </div>
            </div>
          )}

          {/* Selector */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold uppercase text-amber-400 tracking-wider flex items-center justify-between">
              <span>Sélectionner votre commune</span>
              {currentCommune && (
                <span className="text-[10px] text-muted-foreground font-normal lowercase">
                  actuelle : <b className="text-foreground">{currentCommune}</b>
                </span>
              )}
            </label>

            <div className="relative">
              <select
                disabled={isLocked}
                value={selectedCommune}
                onChange={(e) => setSelectedCommune(e.target.value)}
                className="w-full h-12 rounded-2xl bg-background border border-amber-500/30 px-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50 appearance-none font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="" disabled className="bg-slate-900 text-muted-foreground">
                  -- Choisissez votre commune parmi les 24 de Kinshasa --
                </option>
                {KINSHASA_COMMUNES.map((c) => (
                  <option key={c} value={c} className="bg-slate-900 text-white">
                    {c}
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-xs text-muted-foreground font-mono">
                ▼
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Button
              onClick={handleSave}
              disabled={loading || isLocked || !selectedCommune || selectedCommune === currentCommune}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Enregistrement...
                </>
              ) : isLocked ? (
                <>
                  <Clock className="h-4 w-4 mr-2" /> Commune verrouillée ({remainingDays}j restants)
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Valider ma commune (Verrouillage 90j)
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
