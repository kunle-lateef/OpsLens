import type { NextConfig } from 'next';
import { withWorkflow } from 'workflow/next';

const nextConfig: NextConfig = {
  // Next.js's own dev-only route indicator defaults to bottom-left, the
  // same corner the sidebar's account panel now occupies (see
  // components/dashboard/OrgSwitcher.tsx) — moved so the two don't overlap
  // in local development. Dev-only; irrelevant to any deployed build.
  devIndicators: { position: 'bottom-right' },
};

// See architecture.md's Tech Stack section — Vercel Workflows is the
// ingestion/intelligence pipeline's durable-execution mechanism, replacing
// a separate queue/worker service. Compiles any file containing a
// 'use workflow' or 'use step' directive, regardless of location — see
// lib/workflows.ts.
export default withWorkflow(nextConfig);
