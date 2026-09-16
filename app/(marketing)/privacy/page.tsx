import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Privacy Policy — OpsLens' };

// Placeholder content — see the content audit's "needs a decision before it
// needs copy" note. This states only what's already true and enforced
// elsewhere in the codebase (organization-scoped data, no data sold, no
// live integrations yet) rather than inventing legal commitments — actual
// legal review is still required before this is a real Privacy Policy.
export default function PrivacyPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-(--space-4) px-(--space-4) py-(--space-16)">
      <div className="rounded-(--radius-md) border border-(--color-brand-accent) bg-(--color-brand-tint-subtle) p-(--space-4) text-(--color-text-secondary) [font:var(--font-caption)]">
        This is a draft placeholder, not a reviewed legal document. It
        describes how OpsLens actually handles data today; it hasn&apos;t
        been reviewed by counsel.
      </div>
      <h1 className="[font:var(--font-h1)]">Privacy Policy</h1>
      <p className="text-(--color-text-secondary) [font:var(--font-body)]">
        OpsLens stores the operational data you upload — orders, deliveries,
        invoices, and complaints — to detect issues and generate
        recommendations for your organization.
      </p>
      <h2 className="[font:var(--font-h2)]">Data isolation</h2>
      <p className="text-(--color-text-secondary) [font:var(--font-body)]">
        Every record you upload belongs to your organization alone. Every
        query against your data — including questions asked through the AI
        Assistant — is scoped to your organization, regardless of how the
        question is phrased. No other workspace can see your data.
      </p>
      <h2 className="[font:var(--font-h2)]">How your data is used</h2>
      <p className="text-(--color-text-secondary) [font:var(--font-body)]">
        Your data is used only to power OpsLens for your own organization —
        computing your Operational Health Score, detecting issues, and
        answering your questions. It is not sold, and it is not used to
        train models shared across other organizations.
      </p>
      <h2 className="[font:var(--font-h2)]">Third parties</h2>
      <p className="text-(--color-text-secondary) [font:var(--font-body)]">
        OpsLens uses Anthropic&apos;s Claude models to analyze data and
        generate explanations, and Vercel for hosting and file storage. Data
        sent to these providers is used to serve your request, not to train
        their models.
      </p>
      <h2 className="[font:var(--font-h2)]">Questions</h2>
      <p className="text-(--color-text-secondary) [font:var(--font-body)]">
        If you have questions about this policy, contact your account
        administrator.
      </p>
    </div>
  );
}
