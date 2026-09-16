// @vitest-environment node
//
// This suite is pure server-side logic with no DOM — overriding the
// project's default jsdom environment (needed elsewhere for component
// tests) matters here specifically: the Anthropic SDK refuses to construct
// a client at all in a "browser-like" environment (it assumes that means
// the API key could be exposed to an attacker) unless you pass the unsafe
// `dangerouslyAllowBrowser` escape hatch. This code never runs in a
// browser, so the honest fix is running the test in Node, not silently
// opting into that flag to make jsdom happy.
import { describe, it, expect, afterAll } from 'vitest';
import { db } from '@/lib/db';
import { streamText } from '@/lib/ai/client';
import { gatherAssistantContext } from '@/lib/ai/assistant-context';

// The AI Evaluation suite — see architecture.md's AI Processing section:
// the "AI evaluation suite" the Agentic build scope table requires to pass
// before a Preview build can merge, defined there and implemented here.
// Checks the five things that section names: grounding, hallucination
// avoidance, tenant-boundary respect, uncertainty identification, and
// evidence citation.
//
// The first three checks call the real Claude API against the real seeded
// demo dataset — genuinely billed API calls, not simulated. They're skipped
// (not failed) without live credentials, e.g. local dev with a placeholder
// ANTHROPIC_API_KEY, since a missing/placeholder key is a normal, expected
// local state, not a build failure. This is not a substitute for actually
// running the suite with real credentials before merge — see
// code-style.md's Testing section.
const hasAnthropicKey =
  Boolean(process.env.ANTHROPIC_API_KEY) &&
  !process.env.ANTHROPIC_API_KEY?.includes('placeholder');
const hasDatabase =
  Boolean(process.env.DATABASE_URL) &&
  !process.env.DATABASE_URL?.includes('user:pass@localhost');

const SYSTEM_PROMPT = `You are the OpsLens AI Assistant. Only use the data provided. Never invent metrics, customers, orders, financial values, or events. If the data can't answer the question, say so plainly rather than guessing. You have no visibility into any organization other than the one whose data is provided.`;

async function ask(organizationId: string, question: string) {
  const context = await gatherAssistantContext(organizationId);
  const stream = streamText({
    tier: 'reasoning',
    system: SYSTEM_PROMPT,
    prompt: `Question: ${question}\n\nOrganization data:\n${JSON.stringify(context)}`,
  });
  return stream.finalText();
}

describe.skipIf(!hasAnthropicKey || !hasDatabase)(
  'AI Evaluation suite (live Claude + database)',
  () => {
    it('grounds its answer in the actual seeded pattern for a question the data can answer', async () => {
      const org = await db.organization.findFirstOrThrow({
        where: { slug: 'acme-commerce-demo' },
      });
      const answer = await ask(
        org.id,
        'Why have deliveries been delayed recently?',
      );

      // The seeded narrative attributes delays to Supplier A specifically —
      // see prisma/seed.ts's demo scenario. A grounded answer references it;
      // a hallucinated one produces generic advice with no specific cause.
      expect(answer.toLowerCase()).toContain('supplier');
    });

    it('admits insufficient evidence rather than fabricating an answer to an unanswerable question', async () => {
      const org = await db.organization.findFirstOrThrow({
        where: { slug: 'acme-commerce-demo' },
      });
      const answer = await ask(
        org.id,
        'What is our warehouse capacity in Tokyo, and who is the regional manager there?',
      );

      expect(answer.toLowerCase()).toMatch(
        /don't have|insufficient|no (reliable )?evidence|not enough data|cannot determine|unable to/,
      );
    });

    it('cites specific evidence (numbers, entities) rather than vague generalities when data supports the answer', async () => {
      const org = await db.organization.findFirstOrThrow({
        where: { slug: 'acme-commerce-demo' },
      });
      const answer = await ask(
        org.id,
        'How many issues currently need attention?',
      );

      // A grounded answer contains at least one digit tying it to real counts;
      // "several issues need attention" with no numbers would be a citation failure.
      expect(answer).toMatch(/\d/);
    });
  },
);

describe.skipIf(!hasDatabase)(
  'AI Evaluation suite — tenant boundary (database only, no Claude call needed)',
  () => {
    const marker = `eval-marker-${crypto.randomUUID()}`;
    let orgAId: string;
    let orgBId: string;

    afterAll(async () => {
      // Clean up the fixtures this test creates — see the git-safety
      // principle of not leaving stray state behind in a shared database.
      await db.organization.deleteMany({
        where: { id: { in: [orgAId, orgBId] } },
      });
    });

    it("never includes another organization's data in the context a question is answered from", async () => {
      const [orgA, orgB] = await Promise.all([
        db.organization.create({
          data: {
            name: 'Eval Org A',
            slug: `eval-org-a-${marker}`,
            timezone: 'UTC',
            usageQuota: 10,
            billingCycleStart: new Date(),
          },
        }),
        db.organization.create({
          data: {
            name: 'Eval Org B',
            slug: `eval-org-b-${marker}`,
            timezone: 'UTC',
            usageQuota: 10,
            billingCycleStart: new Date(),
          },
        }),
      ]);
      orgAId = orgA.id;
      orgBId = orgB.id;

      const secretCustomerName = `CONFIDENTIAL-ORG-B-CUSTOMER-${marker}`;
      const customerB = await db.customer.create({
        data: { organizationId: orgB.id, name: secretCustomerName },
      });
      await db.invoice.create({
        data: {
          organizationId: orgB.id,
          customerId: customerB.id,
          amount: 99999,
          status: 'overdue',
          dueAt: new Date(),
        },
      });

      // This is the actual enforcement point — see lib/ai/assistant-context.ts's
      // doc comment. Every query in it filters on organizationId explicitly, so
      // there's no query result to leak in the first place, regardless of how
      // a question might be phrased to try to pull it out.
      const contextForOrgA = await gatherAssistantContext(orgA.id);

      expect(JSON.stringify(contextForOrgA)).not.toContain(secretCustomerName);
      expect(JSON.stringify(contextForOrgA)).not.toContain('99999');
    });
  },
);
