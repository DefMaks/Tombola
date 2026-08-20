'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BottomNav() {
  const path = usePathname();
  const items = [
    { href: '/', label: 'Accueil', icon: Home },
    { href: '/profile', label: 'Profil', icon: User },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-xl border-t border-border">
      <div 
        className="max-w-lg mx-auto flex items-center justify-around w-full px-4"
        style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? path === '/' : path.startsWith(href);
          return (
            <Link key={href} href={href} prefetch={true} className={cn(
              'flex flex-col items-center justify-center gap-1 py-2.5 px-1 text-center transition-colors min-w-0',
              active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}>
              <Icon className={cn('h-5 w-5 shrink-0', active && 'stroke-[2.5]')} />
              <span className="text-[11px] font-medium leading-none truncate w-full">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
