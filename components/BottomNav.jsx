'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, User, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import ShareAppModal from '@/components/ShareAppModal';

export default function BottomNav() {
  const path = usePathname();
  const [showShareModal, setShowShareModal] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-xl border-t border-border">
        <div className="max-w-lg mx-auto grid grid-cols-3 w-full px-2">
          {/* Accueil */}
          <Link
            href="/"
            prefetch={true}
            className={cn(
              'flex flex-col items-center justify-center gap-1 py-2.5 px-1 text-center transition-colors min-w-0',
              path === '/' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Home className={cn('h-5 w-5 shrink-0', path === '/' && 'stroke-[2.5]')} />
            <span className="text-[11px] font-medium leading-none truncate w-full">Accueil</span>
          </Link>

          {/* Partager */}
          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            className="flex flex-col items-center justify-center gap-1 py-2.5 px-1 text-center transition-all min-w-0 text-amber-400 hover:text-amber-300 group active:scale-95"
          >
            <div className="p-0.5 rounded-lg bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
              <Share2 className="h-4.5 w-4.5 shrink-0 text-amber-400 stroke-[2.5]" />
            </div>
            <span className="text-[11px] font-bold leading-none truncate w-full text-amber-400">Partager</span>
          </button>

          {/* Profil */}
          <Link
            href="/profile"
            prefetch={true}
            className={cn(
              'flex flex-col items-center justify-center gap-1 py-2.5 px-1 text-center transition-colors min-w-0',
              path.startsWith('/profile') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <User className={cn('h-5 w-5 shrink-0', path.startsWith('/profile') && 'stroke-[2.5]')} />
            <span className="text-[11px] font-medium leading-none truncate w-full">Profil</span>
          </Link>
        </div>
      </nav>

      <ShareAppModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} />
    </>
  );
}
