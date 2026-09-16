# API Route Scaffolder Skill

Load this skill for any task that adds a new server action or route handler to OpsLens. It chains `architecture.md` and `security.md` into a concrete template so the new endpoint fits the codebase and doesn't introduce a trust-model or security hole.

## What This Skill Does

It gives you the route/action template, the envelope convention, and the specific patterns OpsLens needs beyond a generic CRUD app: quota enforcement before triggering a new ingestion/intelligence pipeline run, schema validation for anything touching AI output, and the organization/role checks every dashboard action needs.

## Deciding: Server Action or Route Handler?

- Called by our own dashboard UI as a form submit or UI-triggered mutation (create an organization, confirm a data mapping, accept/reject/modify/dismiss a `Recommendation`, change an `Issue`'s status) → **server action** in `app/(dashboard)/.../actions.ts`.
- Called without a request/response cycle able to hold — issuing a signed upload URL for a CSV, or the streamed AI Assistant reply → **route handler** in `app/api/.../route.ts`. In this app, that's essentially just `app/api/uploads/route.ts` and `app/api/assistant/route.ts` — both still require a valid session, so neither is a public, unauthenticated boundary the way a share-link or payment webhook would create.

Server actions are the default for everything a logged-in user does. Both route handlers still require a valid session and organization-membership check — see `security.md`'s Multi-Tenant Isolation section; "route handler" in this app is a rendering/streaming distinction, not a public-vs-private one.

## The Envelope Convention

Every server action and route handler returns:

```ts
{ ok: true, data: T } | { ok: false, error: { code: string; message: string } }
```

Use proper HTTP status codes for route handlers: `200` success, `400` invalid input, `401` unauthenticated, `403` unauthorized, `404` not found, `409` conflict, `429` rate limited, `500` server error. A server action has no HTTP status to set — it returns the envelope object directly, so "401"/"403" there means `error.code`, not a literal response status.

## Build It

**Step 1. Write the zod schema first.**

Before any business logic, define the `inputSchema`. Every field the endpoint accepts is in the schema. Nothing outside the schema is trusted. If the client sends a field you did not declare, zod strips it.

If this endpoint touches AI output (e.g., a route that triggers or reads pipeline results), the *output* also has a schema — see `lib/ai/schemas.ts` for the per-pipeline-stage schemas. A route/action that persists AI output without running it through the matching schema is a bug, not a shortcut.

**Step 2. Authenticate, then authorize.**

Is there a valid session (`getSession()` from `lib/auth.ts`)? If not, return `401`/redirect to login. Then check organization membership explicitly — `record.organizationId === session.organizationId` — never assume a nested route param already proves it. Then check the user's role against what the action requires (see `security.md`'s Multi-Tenant Isolation section) — organization membership is necessary but not sufficient for a write.

**Step 3. Apply rate limiting.**

Unconditionally for any route or server action that triggers a new ingestion/intelligence pipeline run — per `security.md`'s Rate Limiting section, this applies even though it's a server action, not a public route. Also required for upload-URL issuance and AI Assistant questions, and for login/signup/password-reset. Use the limiter in `lib/rate-limit.ts` — don't defer this to "later" or treat it as optional polish; it's one of the checklist items below.

**Step 4. Validate again at the boundaries.**

If the route accepts a URL parameter or query string, validate it too.

**Step 5. Do the work.**

Keep the body of the try block short. If it's more than ~30 lines, extract the core logic into a function in `lib/`. Route handlers and server actions are thin.

Use `db.$transaction` when two or more writes must succeed together. The two recurring examples in this app:
- Recording a decision on a `Recommendation` and updating the related `Issue`'s status together.
- A pipeline stage writing its output records (e.g., several `Insight`/`Evidence` rows) and updating the `DataImport`'s own status together.

**Step 6. Enforce quota before triggering a new pipeline run.**

OpsLens's pricing is usage-based, tied to import/analysis volume — not seat count — because that's the product's actual cost driver. This is reflected directly in the schema: `Organization.usageQuota` and `Organization.usageCount` track a per-cycle import/analysis budget, not anything per-seat (see `.agents/skills/db-migration-runner/SKILL.md`'s `Organization` model). Any action or route that triggers a new ingestion/intelligence pipeline run must implement this before triggering anything:

- Check for an existing successful pipeline run on an unchanged (checksum-matched) `DataImport` first, and reuse its output if found — this doesn't consume quota, since it costs the system nothing.
- Otherwise, check the organization's current-cycle usage against its plan's quota **before** the Vercel Workflow is triggered. A request over quota is rejected immediately with a clear error — never silently triggered and left to fail later.
- The quota resets on a rolling monthly cycle. Free tier: a fixed number of included imports/analyses per month and a cap on active data sources. Paid tier: a larger monthly bundle, blocked at the cap for MVP rather than auto-billed overage — real payment processing and metered overage billing are explicitly post-MVP scope (see `AGENTS.md`'s Non-Negotiables). Neither tier ever degrades analysis *quality* — quotas limit volume only, never accuracy, confidence, or completeness.
- Current usage should be readable by the dashboard (e.g., "3 of 5 imports used this month") — quota is never a hidden constraint the user only discovers by hitting it.
- The fields are already defined on `Organization` in `.agents/skills/db-migration-runner/SKILL.md`: `usageQuota` (the cap for the current cycle), `usageCount` (consumption so far — checksum-matched reuse does not increment it), and `billingCycleStart` (the anchor date for the rolling monthly window). Use these directly rather than inventing new field names or a separate table.

**Step 7. Return the consistent envelope.**

**Step 8. Log the right things.**

On success, a single structured log line, e.g. `logger.info('issue.decision.recorded', { organizationId, issueId, action })`.
On failure, log the error with context: `logger.error('pipeline.trigger.failed', { error, organizationId })`.
Never log passwords, session tokens, the Anthropic API key, or full CSV content.

**Step 9. Revalidate caches (server actions only).**

If the action mutates data that's displayed elsewhere — especially anything that changes the `healthScore` or an `Issue`'s priority — call `revalidateTag` or `revalidatePath` so the cache updates. Forget this and the Morning Brief will show a stale score.

## Check Your Work

**Security checklist:**

- [ ] Input validated with zod.
- [ ] AI output (if any) validated against its `lib/ai/schemas.ts` schema before persistence.
- [ ] Session checked and organization membership verified.
- [ ] Role check in place where the action requires more than membership.
- [ ] Rate limit in place: unconditionally for pipeline-run triggers, and for upload-URL issuance and AI Assistant questions.
- [ ] Quota check happens before triggering the Workflow, not after.
- [ ] No raw error messages returned to the client.
- [ ] No secrets logged.
- [ ] A human decision on a `Recommendation` is never overwritten by this endpoint.
- [ ] Database writes that must happen together are in a `db.$transaction`.

**Write the tests for the happy path and the unhappy paths — see `code-style.md`'s Testing section.** A colocated `*.test.ts`, not just a manual click-through: valid input succeeds; missing fields return `400`; no session returns `401` (an envelope `error.code`, not an HTTP status, for a server action — see the Envelope Convention, above); a session in the wrong organization returns `403`; quota exceeded returns the correct rejection, not a silently triggered run; requests past the rate limit return `429`, not a silently accepted request. A manual pass afterward is a sanity check on top of the test, not a substitute for it.

## When Things Go Wrong

If a server action starts doing too many things (writing several entities, triggering multiple pipeline stages, revalidating many tags), stop — that's a sign the logic should move into a service function in `lib/` that the action thinly wraps.

If you need to change the database schema to support this route, stop and read `.agents/skills/db-migration-runner/SKILL.md` before touching `prisma/schema.prisma`.
