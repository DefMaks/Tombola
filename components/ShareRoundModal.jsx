'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Share2, Copy, Check, MessageCircle, ExternalLink, Sparkles, Send } from 'lucide-react';
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

  if (!raffle) return null;

  const currentUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/raffles/${raffle.slug}`
    : `https://punchy.cd/raffles/${raffle.slug}`;

  const shareText = `🔥 Regarde ce lot exceptionnel sur Punchy : *${raffle.title}* !\n\n🎯 Tente ta chance pour seulement 1$ avec tirage équitable garanti SHA-256 à Kinshasa.\n\n👉 Participe ici : ${currentUrl}`;
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

  const handleFacebookShare = () => {
    registerShare();
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    window.open(fbUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
  };

  const handleTwitterShare = () => {
    registerShare();
    const tweetText = encodeURIComponent(`🔥 Gagne ${raffle.title} pour seulement 1$ sur Punchy ! Tirage équitable SHA-256 à Kinshasa 🇨🇩`);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${tweetText}&url=${encodedUrl}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
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

        {/* Round Preview Card */}
        <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-muted/40 border border-border/80 my-2">
          {raffle.hero_image_url && (
            <img
              src={raffle.hero_image_url}
              alt={raffle.title}
              className="h-16 w-16 rounded-xl object-cover border border-border/60 shrink-0"
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Punch à 1$</div>
            <h4 className="font-bold text-sm text-foreground line-clamp-1">{raffle.title}</h4>
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">Tirage équitable certifié SHA-256</p>
          </div>
        </div>

        {/* Share Channels */}
        <div className="space-y-2.5 pt-2">
          {/* WhatsApp Hero Button */}
          <Button
            onClick={handleWhatsAppShare}
            className="w-full h-13 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2.5"
          >
            <MessageCircle className="h-5 w-5 fill-white text-emerald-600" />
            <span>Partager sur WhatsApp</span>
          </Button>

          {/* Native Mobile Share Drawer */}
          {hasNativeShare && (
            <Button
              onClick={handleNativeShare}
              variant="outline"
              className="w-full h-12 rounded-2xl border-amber-500/40 text-amber-400 hover:bg-amber-500/10 font-bold text-sm flex items-center justify-center gap-2"
            >
              <Send className="h-4 w-4" />
              <span>Plus d&apos;applications (SMS, Telegram...)</span>
            </Button>
          )}

          {/* Secondary Social Channels */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              onClick={handleFacebookShare}
              variant="outline"
              className="h-11 rounded-xl border-border bg-card hover:bg-muted/40 text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="h-3.5 w-3.5 text-blue-500" />
              <span>Facebook</span>
            </Button>

            <Button
              onClick={handleTwitterShare}
              variant="outline"
              className="h-11 rounded-xl border-border bg-card hover:bg-muted/40 text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="h-3.5 w-3.5 text-sky-400" />
              <span>X (Twitter)</span>
            </Button>
          </div>

          {/* Direct Copy Link */}
          <div className="pt-2">
            <div className="flex items-center gap-2 p-1.5 pl-3 rounded-2xl border border-border bg-background/60">
              <span className="text-xs text-muted-foreground truncate flex-1 font-mono select-all">
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
        </div>

        <div className="pt-2 text-center">
          <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-400 shrink-0" />
            <span>Chaque partage aide à franchir le palier du Round plus vite !</span>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
