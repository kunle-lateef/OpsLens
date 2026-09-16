'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  /** Stagger delay in ms, for sibling elements revealing in sequence. */
  delayMs?: number;
};

// The one place design-system.md's Motion section allows decorative
// animation: a scroll-triggered fade + slight rise, once per element, on the
// public marketing page only. Starts already visible if IntersectionObserver
// is unavailable or the visitor has prefers-reduced-motion set, so the
// content is never gated behind JS/motion support.
export function Reveal({ children, className, delayMs = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Always starts false, matching the server-rendered markup exactly — a
  // lazy initializer that reads matchMedia() would return a different value
  // on the client than on the server, which is a real hydration mismatch
  // (confirmed via a reduced-motion Playwright pass: React logged a
  // hydration error and the page failed to render past the first section).
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      typeof IntersectionObserver === 'undefined'
    ) {
      // Deferred to a callback (rAF) rather than called directly in the
      // effect body, so this stays a false positive of react-hooks'
      // set-state-in-effect rule rather than an actual cascading-render.
      const id = window.requestAnimationFrame(() => setIsVisible(true));
      return () => window.cancelAnimationFrame(id);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        'transition-[opacity,transform] duration-700 ease-[cubic-bezier(.16,.8,.3,1)]',
        isVisible ? 'opacity-100' : 'translate-y-[22px] opacity-0',
        className,
      )}
      style={{ transitionDelay: `${delayMs}ms` }}
    >
      {children}
    </div>
  );
}
