// Structured business-impact figure for an Issue — see
// .agents/skills/db-migration-runner/SKILL.md's Issue.impactAmount note for
// why this is deliberately narrow (invoice-derived only, for now) rather
// than a general-purpose estimator. Pure function, no DB access, so it's
// testable the same way lib/health-score.ts and lib/prioritization.ts are —
// the caller (create-issue-from-insight.ts) does the querying.
export type ImpactEstimate = { amount: number; currency: string } | null;

/**
 * Sums real Invoice.amount values into one impact figure. Returns null
 * (never a fabricated number) when there's nothing to sum, or when the
 * invoices span more than one currency — this app has no automatic FX
 * conversion (see db-migration-runner's Order.currency note), so summing
 * mismatched currencies would silently produce a meaningless total rather
 * than an honest "can't quantify this" result.
 */
export function estimateImpactFromInvoices(
  invoices: { amount: number; currency: string | null }[],
): ImpactEstimate {
  if (invoices.length === 0) return null;

  const currencies = new Set(
    invoices.map((invoice) => invoice.currency ?? 'USD'),
  );
  if (currencies.size > 1) return null;

  const amount = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  if (amount <= 0) return null;

  return { amount, currency: [...currencies][0] };
}
