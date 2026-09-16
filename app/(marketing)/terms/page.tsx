import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Terms of Service — OpsLens' };

// Placeholder content — see the content audit's "needs a decision before it
// needs copy" note. States only what's already true about how the product
// behaves (human decisions, no auto-applied actions) rather than inventing
// liability terms, jurisdiction, or other legal commitments — actual legal
// review is still required before this is a real Terms of Service.
export default function TermsPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-(--space-4) px-(--space-4) py-(--space-16)">
      <div className="rounded-(--radius-md) border border-(--color-brand-accent) bg-(--color-brand-tint-subtle) p-(--space-4) text-(--color-text-secondary) [font:var(--font-caption)]">
        This is a draft placeholder, not a reviewed legal document. It
        hasn&apos;t been reviewed by counsel and shouldn&apos;t be treated as
        a binding agreement yet.
      </div>
      <h1 className="[font:var(--font-h1)]">Terms of Service</h1>
      <h2 className="[font:var(--font-h2)]">What OpsLens does</h2>
      <p className="text-(--color-text-secondary) [font:var(--font-body)]">
        OpsLens analyzes the operational data you provide and surfaces
        issues, root-cause explanations, and recommendations. Every
        recommendation requires a decision from you — OpsLens never accepts,
        modifies, or dismisses a recommendation on its own, and never takes
        an action on your business without you.
      </p>
      <h2 className="[font:var(--font-h2)]">Your account</h2>
      <p className="text-(--color-text-secondary) [font:var(--font-body)]">
        You&apos;re responsible for the accuracy of the data you upload and
        for keeping your account credentials secure.
      </p>
      <h2 className="[font:var(--font-h2)]">Availability</h2>
      <p className="text-(--color-text-secondary) [font:var(--font-body)]">
        OpsLens is under active development. Features described as
        &ldquo;foundation&rdquo; or &ldquo;preview&rdquo; in the product may
        change as the product matures.
      </p>
      <h2 className="[font:var(--font-h2)]">Questions</h2>
      <p className="text-(--color-text-secondary) [font:var(--font-body)]">
        If you have questions about these terms, contact your account
        administrator.
      </p>
    </div>
  );
}
