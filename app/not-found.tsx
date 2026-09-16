import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

// Branded per design-system.md's calm/trustworthy direction rather than
// Next's default not-found page — see architecture.md's Error Handling
// section: users never see raw technical detail, even for a routing miss.
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-(--color-surface-base) px-(--space-4)">
      <Card className="max-w-md text-center">
        <h1 className="mb-(--space-2) [font:var(--font-h1)]">Page not found</h1>
        <p className="mb-(--space-6) text-(--color-text-secondary) [font:var(--font-body)]">
          The page you&apos;re looking for doesn&apos;t exist, or has moved.
        </p>
        <Link href="/">
          <Button>Back to OpsLens</Button>
        </Link>
      </Card>
    </main>
  );
}
