import Link from 'next/link';
import { BrandMark } from '@/components/ui/BrandMark';
import { Button } from '@/components/ui/Button';

// The one publicly reachable surface in the app — see architecture.md's
// Authentication section. No session check here; this route group holds no
// data and needs none.
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-(--color-surface-base)">
      {/* Fixed (sticky) so the nav/CTA stay reachable on a long scroll —
          `bg` is required now that content scrolls underneath it, or it'd
          be transparent. Its real rendered height (measured: 65px) is
          matched by --space-16 (4rem/64px), which the anchor-target
          sections in page.tsx use as their own scroll-mt-(--space-16), so
          the smooth-scroll added earlier doesn't tuck a section's heading
          under this header. */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-(--color-border-subtle) bg-(--color-surface-base) px-(--space-4) py-(--space-4)">
        <Link href="/" aria-label="OpsLens home">
          <BrandMark variant="horizontal" tone="color" size={28} />
        </Link>
        {/* Anchors into the single marketing page's own sections — this
            route group has no separate pages yet, so linking to real
            in-page content beats inventing routes that don't exist. */}
        <nav
          aria-label="Page sections"
          className="hidden items-center gap-(--space-6) sm:flex"
        >
          <Link
            href="/#how-it-works"
            className="text-(--color-text-secondary) [font:var(--font-label)] hover:text-(--color-text-primary)"
          >
            How it works
          </Link>
          <Link
            href="/#features"
            className="text-(--color-text-secondary) [font:var(--font-label)] hover:text-(--color-text-primary)"
          >
            Features
          </Link>
          <Link
            href="/#faq"
            className="text-(--color-text-secondary) [font:var(--font-label)] hover:text-(--color-text-primary)"
          >
            FAQ
          </Link>
        </nav>
        {/* Persistent sign-up path — the hero and closing sections are the
            only other CTAs on a now nine-section page, so anyone who
            scrolls partway and decides to convert shouldn't have to hunt
            for a way to. "Get started" (not the fuller "Create your
            workspace" used where there's more room) to fit this cramped a
            header. */}
        <div className="flex items-center gap-(--space-4)">
          <Link
            href="/login"
            className="text-(--color-text-secondary) [font:var(--font-label)] hover:text-(--color-text-primary)"
          >
            Sign in
          </Link>
          <Link href="/signup">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}
