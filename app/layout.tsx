import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

// design-system.md: "--font-family-base is Inter, with the system sans-serif
// stack as fallback." next/font self-hosts Inter and registers the real
// "Inter" @font-face name, which tokens/tokens.css's --font-family-base
// already references by name — applying the className here is enough to
// make every --font-* shorthand token resolve to this self-hosted font.
const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'OpsLens',
  description:
    'AI-powered operational intelligence for e-commerce and logistics businesses.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <head>
        {/* Runs before paint to avoid a dark->light flash — reads the same
            'opslens-theme' key components/dashboard/ThemeToggle.tsx writes.
            suppressHydrationWarning on <html> above is required because of
            this exact script: when it sets data-theme='light' before React
            hydrates, the attribute on the real DOM node no longer matches
            what the server rendered (which has no theme in localStorage to
            read) — a real, expected mismatch confined to one attribute on
            the root element, not a bug in rendered content. Found via a
            light-theme browser check; every earlier check exercised only
            the default (dark, no data-theme) path, where the script's `if`
            is false and no mismatch occurs.

            next/script with strategy="beforeInteractive" instead of a raw
            <script> tag — React 19 + Next 16 logs "Encountered a script tag
            while rendering React component" for a plain inline <script> in
            JSX; next/script's beforeInteractive strategy is Next's own
            documented mechanism for exactly this "must run before
            hydration" case; it injects the script outside the normal React
            render path instead of as a host element React itself manages. */}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('opslens-theme')==='light'){document.documentElement.dataset.theme='light'}}catch(e){}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
