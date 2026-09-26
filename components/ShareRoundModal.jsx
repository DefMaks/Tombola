'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { Share2, Copy, Check, Sparkles, MoreHorizontal } from 'lucide-react';
import { Telegram, Whatsapp } from 'iconoir-react';
import { toast } from 'sonner';

export function formatSharesCount(count) {
  const num = Number(count) || 0;
  if (num < 1000) {
    return `${num}`;
  }
  if (num < 100000) {
    const formatted = (num / 1000).toFixed(1).replace('.0', '');
    return `${formatted}k`;
  }
  return '+99k';
}

export default function ShareRoundModal({ isOpen, onOpenChange, raffle, sharesCount, onShareSuccess }) {
  const [copied, setCopied] = useState(false);
  const isMobile = useIsMobile();

  if (!raffle) return null;

  const currentUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/raffles/${raffle.slug}`
    : `https://punchy.cd/raffles/${raffle.slug}`;

  const shareText = `🔥 Regarde ce lot exceptionnel sur Punchy : *${raffle.title}* !\n\n🎯 Tente ta chance pour seulement 1$.\n\n👉 Participe ici : ${currentUrl}`;
  const encodedShareText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(currentUrl);

  const registerShare = async () => {
    try {
      await fetch(`/api/raffles/${raffle.slug}/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'share' }),
      });
      onShareSuccess?.();
    } catch (e) {
      console.warn('Share track error:', e);
    }
  };

  const handleWhatsAppShare = () => {
    registerShare();
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedShareText}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    toast.success('Redirection vers WhatsApp...');
  };

  const handleTelegramShare = () => {
    registerShare();
    const telegramUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedShareText}`;
    window.open(telegramUrl, '_blank', 'noopener,noreferrer');
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${raffle.title} - Round Punchy`,
          text: `Tente ta chance pour 1$ et remporte ${raffle.title} sur Punchy !`,
          url: currentUrl,
        });
        registerShare();
        toast.success('Merci pour le partage !');
      } catch (err) {
        if (err.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      registerShare();
      toast.success('Lien copié dans le presse-papier !');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Impossible de copier le lien.');
    }
  };

  const hasNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  const content = (
    <>
      <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-muted/40 border border-border/80 my-2">
        {raffle.hero_image_url && (
          <img
            src={raffle.hero_image_url}
            alt={raffle.title}
            className="h-16 w-16 rounded-xl object-cover border border-border/60 shrink-0"
          />
        )}
        <div className="min-w-0 flex-1 text-left">
          <div className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Punch à 1$</div>
          <h4 className="font-bold text-sm text-foreground line-clamp-1">{raffle.title}</h4>
          {/**
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">Tirage équitable certifié SHA-256</p>
          */}
        </div>
      </div>

      {/* Share Channels */}
      <div className="pt-4 pb-2">
        <div className="flex justify-center gap-6">
          <button
            onClick={handleWhatsAppShare}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-14 h-14 rounded-2xl bg-punchy-apricot/30 text-punchy-accent flex items-center justify-center group-hover:bg-punchy-apricot/50 transition-colors border border-punchy-apricot/50 shadow-sm">
              <Whatsapp className="h-7 w-7 fill-current" />
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground transition-colors">WhatsApp</span>
          </button>

          <button
            onClick={handleTelegramShare}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-14 h-14 rounded-2xl bg-punchy-pale/50 text-punchy-hover flex items-center justify-center group-hover:bg-punchy-pale transition-colors border border-punchy-pale shadow-sm">
              <Telegram className="h-7 w-7 fill-current -ml-0.5" />
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground transition-colors">Telegram</span>
          </button>

          <button
            onClick={hasNativeShare ? handleNativeShare : handleCopyLink}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-14 h-14 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center group-hover:bg-muted/80 transition-colors border border-border shadow-sm">
              <MoreHorizontal className="h-7 w-7" />
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground transition-colors">Autre</span>
          </button>
        </div>
      </div>

      {/* Direct Copy Link */}
      <div className="pt-4">
        <div className="flex items-center gap-2 p-1.5 pl-3 rounded-2xl border border-border bg-background/60">
          <span className="text-xs text-muted-foreground truncate flex-1 font-mono select-all text-left">
            {currentUrl}
          </span>
          <Button
            onClick={handleCopyLink}
            size="sm"
            className="h-9 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shrink-0"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1" /> Copié
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 mr-1" /> Copier
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="pt-2 text-center">
        <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
          <Sparkles className="h-3 w-3 text-amber-400 shrink-0" />
          <span>Chaque partage aide à franchir le palier du Round plus vite !</span>
        </p>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onOpenChange}>
        <DrawerContent className="bg-card border-t border-border">
          <DrawerHeader className="text-left pb-0">
            <div className="flex items-center justify-between">
              <DrawerTitle className="text-lg font-black flex items-center gap-2 text-foreground">
                <Share2 className="h-5 w-5 text-amber-500" /> Partager ce Round
              </DrawerTitle>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                {formatSharesCount(sharesCount)} {sharesCount > 1 ? 'partages' : 'partage'}
              </span>
            </div>
          </DrawerHeader>
          <div className="p-4 pt-0">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl bg-card border border-border p-6 shadow-2xl">
        <DialogHeader className="text-left">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-black flex items-center gap-2 text-foreground">
              <Share2 className="h-5 w-5 text-amber-500" /> Partager ce Round
            </DialogTitle>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
              {formatSharesCount(sharesCount)} {sharesCount > 1 ? 'partages' : 'partage'}
            </span>
          </div>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
