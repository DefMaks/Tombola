'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'error-callback'?: (error: any) => void;
          'expired-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'compact' | 'flexible';
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

interface TurnstileWidgetProps {
  onSuccess: (token: string) => void;
  onError?: (error?: any) => void;
  onExpire?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
}

export default function TurnstileWidget({
  onSuccess,
  onError,
  onExpire,
  theme = 'dark',
  className = '',
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAAFV5K-uDL0Wd28JU';

  // Keep callback refs stable across re-renders to prevent widget destruction on keystrokes
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const onExpireRef = useRef(onExpire);
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    let isMounted = true;
    let pollInterval: NodeJS.Timeout | null = null;

    function renderWidget() {
      if (!window.turnstile || !containerRef.current || !isMounted) return;
      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (_) {}
      }

      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => {
            if (isMounted) onSuccessRef.current?.(token);
          },
          'error-callback': (err: any) => {
            if (isMounted && onErrorRef.current) onErrorRef.current(err);
          },
          'expired-callback': () => {
            if (isMounted && onExpireRef.current) onExpireRef.current();
          },
          theme,
          size: 'normal',
        });
      } catch (e) {
        console.warn('[Turnstile render error]', e);
      }
    }

    if (window.turnstile) {
      renderWidget();
    } else {
      const existingScript = document.getElementById('cf-turnstile-script') as HTMLScriptElement | null;
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'cf-turnstile-script';
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          if (isMounted) renderWidget();
        };
        document.head.appendChild(script);
      } else {
        // Poll for window.turnstile in case script already finished loading
        pollInterval = setInterval(() => {
          if (window.turnstile) {
            if (pollInterval) clearInterval(pollInterval);
            if (isMounted) renderWidget();
          }
        }, 150);
      }
    }

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (_) {}
      }
    };
  }, [siteKey, theme]);

  if (!siteKey) {
    return null;
  }

  return (
    <div className={`flex justify-center my-2 min-h-[65px] ${className}`}>
      <div ref={containerRef} />
    </div>
  );
}
