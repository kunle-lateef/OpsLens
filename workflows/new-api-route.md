# Workflow: Creating a New API Route

Follow this workflow when you need to add a new route handler or server action to OpsLens. It chains the architecture, security, and code-style rules with the route scaffolder skill so the new endpoint fits the codebase and doesn't introduce a security or trust-model hole.

## Before You Touch Any File

**Step 1. Decide: route handler or server action?**

- Called by our own dashboard UI as a form submit or UI-triggered mutation (create an organization, confirm a data mapping, accept/reject/modify/dismiss a `Recommendation`, change an `Issue`'s status) → **server action** in `app/(dashboard)/.../actions.ts`.
- Called where a request/response cycle can't hold the work, or needs to stream — signed upload URL issuance, or the AI Assistant's streamed reply → **route handler** in `app/api/.../route.ts`. Every `app/api/` route requires a valid session and organization-membership check the same as a server action does; a route handler here is a rendering/streaming distinction, not a "public" one — see `security.md`'s Multi-Tenant Isolation section.

Server actions are the default for everything a logged-in user does.

**Step 2. Decide on the data model.**

Sketch the input and the output before writing code. What fields come in? What gets validated? What table rows are read or written? What does success look like? What does failure look like?

If the route touches AI-generated data in any way (triggers a pipeline run, reads `Insight`/`Issue`/`Recommendation` results, records a decision against a `Recommendation`), the sketch must include: which schema in `lib/ai/schemas.ts` governs the data, whether a human decision could already exist on the recommendation being touched (and what happens if it does), and — if this triggers a new pipeline run — whether the organization has quota remaining. See `.agents/skills/api-route-scaffolder/SKILL.md` for the concrete pattern.

**Step 3. Load the right context.**

Open and read in order:

1. `.agents/rules/architecture.md` — where the route lives, data flow conventions, the three kinds of writes.
2. `.agents/rules/security.md` — the non-negotiables for input validation, auth, AI-output trust, and secrets.
3. `.agents/rules/code-style.md` — naming, error handling, logging patterns.
4. `.agents/skills/api-route-scaffolder/SKILL.md` — the route/action template and envelope convention.
5. If the route creates or writes `Insight`, `Evidence`, `Issue`, or `Recommendation` records: check the AI Processing section of `.agents/rules/architecture.md` and the matching schema in `lib/ai/schemas.ts`.
6. If the route changes the schema: `.agents/skills/db-migration-runner/SKILL.md`.

## Build It

**Step 4. Create the file.**

Use the appropriate template from `.agents/skills/api-route-scaffolder/SKILL.md`. Route handlers go at `app/api/<resource>/route.ts`. Server actions go in a sibling `actions.ts` of the page that triggers them, with `"use server"` at the top.

**Step 5. Write the zod schema first.**

Before any business logic, define the `inputSchema`. Every field the endpoint accepts is in the schema. Nothing outside the schema is trusted. If the client sends a field you did not declare, zod strips it.

**Step 6. Authenticate, then authorize.**

Is there a valid session? If not, reject. Then check organization membership explicitly — `record.organizationId === session.organizationId`. Do not rely on the URL shape to enforce it; a crafted URL can target any row. Then check the user's role against what the action requires — organization membership alone is not sufficient for every action.

**Step 7. Apply rate limiting.**

Unconditionally for any route or server action that triggers a new ingestion/intelligence pipeline run — per `security.md`'s Rate Limiting section, this applies even though it's a server action, not a public route. Also required for upload-URL issuance, AI Assistant questions, and login/signup/password-reset. Use the limiter in `lib/rate-limit.ts`.

**Step 8. Validate again at the boundaries.**

If the route accepts a URL parameter or query string, validate it too. Prisma parameterizes queries, but the principle is that all outside input gets validated regardless of what protects it downstream.

**Step 9. Do the work.**

Keep the body of the try block short. If it's more than ~30 lines, extract the core logic into a function in `lib/`. Route handlers and server actions are thin.

Use `db.$transaction` when two or more writes must succeed together — recording a decision on a `Recommendation` alongside updating the related `Issue`'s status is the most common case in this app.

If this action triggers a new pipeline run: check for an existing successful run on an unchanged (checksum-matched) `DataImport` first and reuse it if found; otherwise check the organization's remaining usage quota before triggering the Vercel Workflow via `lib/workflows.ts`. Never trigger first and check quota after.

**Step 10. Return the consistent envelope.**

Success: `{ ok: true, data }`.
Failure: `{ ok: false, error: { code, message } }`.

Use proper HTTP status codes for route handlers: `200` success, `400` invalid input, `401` unauthenticated, `403` unauthorized, `404` not found, `409` conflict, `429` rate limited, `500` server error. A server action has no HTTP status to set — it returns the envelope object directly, so "401"/"403" there just means `{ ok: false, error: { code: '401', ... } }` (or whatever `code` convention the app settles on), not a literal response status.

**Step 11. Log the right things.**

On success, a single structured log line: `logger.info('issue.decision.recorded', { organizationId, issueId, action })`.
On failure, log the error with context: `logger.error('pipeline.trigger.failed', { error, organizationId })`.
Never log passwords, session tokens, the Anthropic API key, or raw CSV content.

**Step 12. Revalidate caches (server actions only).**

If the action mutates data displayed elsewhere — especially anything that changes `healthScore` or an `Issue`'s priority — call `revalidateTag` or `revalidatePath` so the cache updates. Forget this and the Morning Brief serves a stale score.

## Check Your Work

**Step 13. Walk the security checklist.**

- [ ] Input validated with zod.
- [ ] AI output (if any) validated against its `lib/ai/schemas.ts` schema before persistence.
- [ ] Session checked and organization membership verified.
- [ ] Role check in place where relevant.
- [ ] Rate limit in place: unconditionally for pipeline-run triggers, and for upload-URL issuance and AI Assistant questions.
- [ ] Quota check happens before triggering the Workflow, not after.
- [ ] No raw error messages returned to the client.
- [ ] No secrets logged.
- [ ] A human decision on a `Recommendation` is never silently overwritten by this endpoint.
- [ ] Database writes that must happen together are in a `db.$transaction`.

**Step 14. Write the tests for the happy path and the unhappy paths — not just a manual check.**

Per `code-style.md`'s Testing section, this route/action needs an actual colocated `*.test.ts`, not only a click-through before merge. Cover:
- Valid input succeeds.
- Missing fields return `400`.
- No session returns `401` (as an envelope `error.code`, not an HTTP status, if this is a server action — see Step 10, above).
- A session in the wrong organization returns `403`.
- If it triggers a pipeline run: a request over quota is rejected before anything is triggered.
- If rate limiting applies: requests past the limit return `429`, not a silently accepted request.

A manual pass (hitting the route/action by hand, watching the network tab) is still worth doing once — see Step 15, below — but it's a sanity check on top of the test, not a substitute for it.

**Step 15. Check the network tab.**

Confirm the actual HTTP status code matches what you intended. Confirm the response body matches the envelope. Confirm no secret data or another organization's data is leaking in the response.

**Step 16. Commit.**

Commit message says what the route does in one line. If it's part of a larger feature, reference the feature in the body.

## When Things Go Wrong

If the route starts to do too many things (writing several entities, triggering multiple pipeline stages, updating several caches), stop. That's a sign the logic should move into a service function in `lib/` that the route thinly wraps.

If you need to change the database schema to support this route, stop and read `.agents/skills/db-migration-runner/SKILL.md` before touching `prisma/schema.prisma`. Schema changes deserve their own commit and their own migration, separate from the route that depends on them.
