'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { Share2, Copy, Check, Sparkles } from 'lucide-react';
import { Telegram, Whatsapp, MoreHoriz } from 'iconoir-react';
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

function ShareContent({ raffle, shareUrl, shareText, copied, handleCopyLink, handlePlatformShare, handleNativeShare }) {
  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Visual Header */}
      <div className="flex flex-col items-center text-center gap-3">
        <div className="h-16 w-16 bg-punchy-amber rounded-full flex items-center justify-center mb-2 shadow-sm">
          <Sparkles className="h-8 w-8 text-punchy-accent" />
        </div>
        <div>
          <h3 className="font-semibold text-lg text-gray-900">Invite tes amis !</h3>
          <p className="text-sm text-gray-500 mt-1">
            Partage ce tirage avec tes proches
          </p>
        </div>
      </div>

      {/* Share Options Grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* WhatsApp */}
        <div className="flex flex-col items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-14 w-14 rounded-full border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-300"
            onClick={() => handlePlatformShare('whatsapp')}
          >
            <Whatsapp className="h-6 w-6 text-[#25D366]" />
          </Button>
          <span className="text-xs text-gray-500 font-medium">WhatsApp</span>
        </div>

        {/* Telegram */}
        <div className="flex flex-col items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-14 w-14 rounded-full border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300"
            onClick={() => handlePlatformShare('telegram')}
          >
            <Telegram className="h-6 w-6 text-[#229ED9]" />
          </Button>
          <span className="text-xs text-gray-500 font-medium">Telegram</span>
        </div>

        {/* Native Share / More */}
        <div className="flex flex-col items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-14 w-14 rounded-full border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300"
            onClick={handleNativeShare}
          >
            <MoreHoriz className="h-6 w-6 text-gray-600" />
          </Button>
          <span className="text-xs text-gray-500 font-medium">Autre</span>
        </div>
      </div>

      {/* Copy Link Section */}
      <div className="mt-2 bg-gray-50 rounded-2xl p-4 border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2.5 flex items-center gap-2 overflow-hidden">
            <Share2 className="h-4 w-4 text-gray-400 shrink-0" />
            <span className="text-sm text-gray-600 truncate">
              {shareUrl}
            </span>
          </div>
          <Button
            onClick={handleCopyLink}
            size="icon"
            className={`h-11 w-11 rounded-xl shrink-0 transition-all ${
              copied
                ? 'bg-green-500 hover:bg-green-600'
                : 'bg-punchy-accent hover:bg-punchy-hover'
            }`}
          >
            {copied ? (
              <Check className="h-5 w-5 text-white" />
            ) : (
              <Copy className="h-5 w-5 text-white" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ShareRoundModal({ isOpen, onOpenChange, raffle, sharesCount, onShareSuccess }) {
  const [copied, setCopied] = useState(false);
  const isMobile = useIsMobile();

  if (!raffle) return null;

  const getShareUrl = () => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/raffles/${raffle.slug}`;
  };

  const shareText = `Tente ta chance pour gagner ${raffle.prize_name} sur Punchy ! 🎁\n\nParticipe ici : `;
  const shareUrl = getShareUrl();

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Lien copié !", {
        description: "Le lien a été copié dans votre presse-papiers."
      });
      setTimeout(() => setCopied(false), 2000);
      onShareSuccess?.();
    } catch (err) {
      toast.error("Erreur", {
        description: "Impossible de copier le lien."
      });
    }
  };

  const handlePlatformShare = (platform) => {
    let url = '';
    const text = encodeURIComponent(shareText);
    const link = encodeURIComponent(shareUrl);

    switch (platform) {
      case 'whatsapp':
        url = `https://wa.me/?text=${text}${link}`;
        break;
      case 'telegram':
        url = `https://t.me/share/url?url=${link}&text=${text}`;
        break;
    }

    if (url) {
      window.open(url, '_blank', 'width=600,height=400');
      onShareSuccess?.();
      onOpenChange(false);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Punchy',
          text: `Tente ta chance pour gagner ${raffle.prize_name} sur Punchy ! 🎁`,
          url: shareUrl,
        });
        onShareSuccess?.();
        onOpenChange(false);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error("Erreur de partage:", err);
        }
      }
    } else {
      toast.error("Non supporté", {
        description: "Le partage natif n'est pas supporté sur cet appareil."
      });
    }
  };

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onOpenChange}>
        <DrawerContent className="px-4 pb-8 pt-2">
          <DrawerHeader className="text-left px-0 pb-0">
            <DrawerTitle className="text-xl font-semibold">Partager</DrawerTitle>
          </DrawerHeader>
          <ShareContent
            raffle={raffle}
            shareUrl={shareUrl}
            shareText={shareText}
            copied={copied}
            handleCopyLink={handleCopyLink}
            handlePlatformShare={handlePlatformShare}
            handleNativeShare={handleNativeShare}
          />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-center">Partager</DialogTitle>
        </DialogHeader>
        <ShareContent
          raffle={raffle}
          shareUrl={shareUrl}
          shareText={shareText}
          copied={copied}
          handleCopyLink={handleCopyLink}
          handlePlatformShare={handlePlatformShare}
          handleNativeShare={handleNativeShare}
        />
      </DialogContent>
    </Dialog>
  );
}
