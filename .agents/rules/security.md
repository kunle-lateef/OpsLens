# Security Rules

OpsLens handles other people's operational business data — orders, invoices, customer complaints, delivery records, often commercially sensitive — and asks a business leader to trust an AI's read on it enough to act. A security mistake here is not just a bug, it is a breach of that trust. Every agent working on this codebase must follow these rules without exception.

## Secrets and Configuration

Never commit secrets to the repository. API keys, database URLs, session/auth secrets, and storage credentials live in environment variables, loaded through a validated config module.

The required environment variables are:

```
DATABASE_URL                  (Neon Postgres, via the Vercel Marketplace integration)
ANTHROPIC_API_KEY
AUTH_SECRET                   (Auth.js session/JWT signing secret)
NEXT_PUBLIC_APP_URL
BLOB_READ_WRITE_TOKEN         (Vercel Blob, for uploaded CSV files — confirm with the developer if a different S3-compatible provider is used instead; if so, add STORAGE_ACCESS_KEY / STORAGE_SECRET_KEY / STORAGE_BUCKET / STORAGE_ENDPOINT here and to lib/env.ts's schema instead of assuming Vercel Blob's variable name)

# Optional — see Rate Limiting, below
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

There is no `REDIS_URL` for the ingestion and intelligence pipeline — it runs on Vercel Workflows, not a Redis-backed queue (see `architecture.md`'s The Stack section for why). The two `UPSTASH_*` variables above are unrelated to that — they're the production rate limiter's backing store (below), a separate, deliberate exception.

Environment variables are validated at boot with Zod in `lib/env.ts`. If a required variable is missing, the app refuses to start rather than running in a half-configured state.

Only variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Never put a secret behind that prefix, even if you think it looks harmless. `ANTHROPIC_API_KEY` in particular must never reach client code — all Claude API calls happen from `lib/ai/client.ts`, invoked only from server actions, route handlers, or a Vercel Workflow.

## Authentication

Authentication is provider-managed (Auth.js) — see `architecture.md`. Never store plaintext passwords or roll a custom credential system. Never log passwords or session tokens, even during debugging.

Sessions are cookie-based. Cookies must have:
- `httpOnly: true`
- `secure: true` in production
- `sameSite: 'lax'`
- A reasonable expiration

Session tokens are managed by the auth provider, which is chosen specifically to avoid the class of bugs that come from hand-rolled session/token generation.

Logout invalidates the session on the server side, not just the cookie. A stolen cookie is useless if the server no longer recognizes its token.

## Input Validation

Every piece of data that enters the application from outside must be validated with Zod before it touches the database or any business logic. This applies to:
- Form submissions and server action inputs
- Route handler request bodies
- URL parameters and query strings
- Uploaded CSV rows, before they're normalized into `OperationalEvent`/`Metric` records
- **Raw AI output from the Claude API**, before it is persisted as an `Insight`, `Evidence`, `Issue`, or `Recommendation`

Validation is not optional and is not the frontend's job. The frontend can validate for user experience, but the server validates for safety — and for AI output, "the server" specifically means the schema in `lib/ai/schemas.ts` corresponding to that pipeline stage.

## SQL Injection

All database access goes through Prisma. Prisma uses parameterized queries by default, which prevents SQL injection as long as you do not bypass it. Never use `prisma.$queryRawUnsafe` or string-concatenate SQL. Raw SQL is not part of the normal application flow — it's only allowed in migration files, see `architecture.md`'s Database Access rules — so a route handler or server action needing raw SQL is a sign to stop and ask the developer, not to reach for it directly. If a genuine, developer-approved case for raw SQL outside a migration ever arises, it still must go through `prisma.$queryRaw` with a tagged template, which parameterizes correctly, never `$queryRawUnsafe` or string interpolation.

## Cross-Site Scripting (XSS)

React escapes strings by default when rendering, which handles most cases. The main risks are:
- `dangerouslySetInnerHTML`: do not use it unless content has been sanitized server-side with a library like DOMPurify. This matters specifically for AI-generated root-cause explanations and recommendation text, both of which are free-text content rendered back to users.
- AI-derived or user-submitted URLs: never put an unvalidated URL in an `href` or `src`. Validate that it starts with `https://` and, where relevant, that it points to an allowed domain. This includes any URL a `Recommendation` or `DesignerNote`-equivalent field might contain.
- Markdown rendering: if AI Assistant answers or recommendations are ever rendered as Markdown rather than plain text, use a sanitizing renderer.

## Cross-Site Request Forgery (CSRF)

Server actions in Next.js include built-in CSRF protection. Route handlers that perform state-changing operations must verify the origin of the request by checking the `Origin` or `Referer` header against the app's domain.

Every route that touches organization data requires a valid session — the only unauthenticated surfaces in the app are the static marketing site and the sign-in/sign-up flows (see `architecture.md`'s Authentication section). The marketing site performs no state-changing operations, so it's out of scope for CSRF entirely. Sign-up does create real data (an `Organization`, a `User`), but it's a server action, so it's already covered by the built-in CSRF protection the first sentence above describes; sign-in itself goes through Auth.js's own Credentials flow, which has its own CSRF handling. There is no share-link-style carve-out to reason about beyond that. The AI Assistant's streamed route handler (`app/api/assistant/route.ts`) still requires a valid session and organization membership check like any other route; streaming the response doesn't change its trust boundary.

## Multi-Tenant Isolation

This is the core trust boundary in OpsLens — there is no public, unauthenticated view of any kind, so every access-control question in this app reduces to "does this row belong to the requesting user's organization."

- Every organization-owned record (`Order`, `Delivery`, `Invoice`, `OperationalEvent`, `Insight`, `Issue`, `Recommendation`, everything) carries an `organizationId` and every query filters on it explicitly.
- Tenant authorization is enforced at the server/service/database-access layer — never relying solely on frontend filtering or on a nested route param implying ownership. A crafted URL (`/issues/[issueId]`) must not be trusted to prove the issue belongs to the requesting user's organization; check it explicitly, the same way `.agents/skills/api-route-scaffolder/SKILL.md`'s ownership-check step requires.
- The AI Assistant must never answer using another organization's data, regardless of how a question is phrased. See AI Assistant Guardrails, below.
- A user's role (`Owner | Admin | Manager | Analyst | Viewer`) is checked in addition to organization membership, not instead of it — being in the right organization is necessary, not sufficient, for a write action.
  - **Enforced minimum today: `Viewer` cannot perform any write action** (`hasMinimumRole` from `lib/authz.ts`, checked in every mutating server action — `createDataImport`, `confirmMappings`, `updateIssueStatus`, `decideOnRecommendation`, `generateReport`). This is the one boundary the role names make unambiguous without guessing at a product decision. Found unenforced (the check existed in `lib/authz.ts` and was unit-tested, but no real action called it) during the Phase 7 security pass and fixed at each call site.
  - Finer-grained tiers — e.g. whether accepting a `Recommendation` should require `Manager` rather than `Analyst` — are not yet decided. `Role.permissions` (JSON, see `db-migration-runner/SKILL.md`) exists specifically so that can be added later without a schema change; confirm the exact tier with the developer before tightening beyond the Viewer boundary.
  - Prefer `hasMinimumRole(session.user.roleName, minimumRole)` (a plain predicate, returns `false`) at each action's existing `return err(...)` convention over `requireRole` (throws) — every server action in this codebase returns an `ActionResult`, not an unhandled exception, and there is no error-boundary layer that converts a thrown `ForbiddenError` into one.

## AI Output & Structured Data Trust

**This is the most important section in this file. Read it twice.** OpsLens's entire value proposition depends on never letting an AI-generated conclusion masquerade as settled fact. A trust-model bug here is not cosmetic — it is the product failing at the one thing it exists to do.

**AI output is never persisted unvalidated.** Every structured result from a Claude API call — for every stage of the intelligence pipeline — is validated against its Zod schema in `lib/ai/schemas.ts` before it is written to the database. A schema-validation failure is rejected, logged, and optionally retried. It is never silently stored, and it is never displayed to a user as if it were valid.

**Evidence and confidence are enforced at the data layer, not just the UI layer.** Every AI-generated `Insight` directly carries linked `Evidence` records and a confidence value — a qualitative label (`High | Medium | Low | InsufficientEvidence`) where a meaningful number can't be established, never a fabricated numeric value just because the interface expects one — required at creation, never nullable. An `Issue` doesn't store its own separate `Evidence`/confidence; it inherits or recomputes confidence from the `Insight`(s) it's built from via `insightId` (see `.agents/skills/db-migration-runner/SKILL.md`'s Special Rules), so an `Issue` with no evidence-bearing `Insight` behind it is exactly as much a bug as an `Insight` with no `Evidence` row. There is no code path that creates either without that evidence chain intact — if a code review finds one, that's a bug, not an edge case.

**A human decision is never silently overwritten.** If a `Recommendation` already has a recorded decision (Accepted, Rejected, or Modified), and a subsequent pipeline run produces a conflicting result for the same underlying issue, the new result must not auto-apply. Raise a new, linked `Issue` instead and require human re-review — see `architecture.md`'s Data Flow section for the exact rule. Any code path that updates a finding's value without checking for an existing human decision first is a security-relevant bug in this app, on the same level as an auth bypass — it undermines the specific guarantee the product makes.

**Ownership checks are explicit, not implied by URL shape.** Every dashboard action on an `Issue`, `Recommendation`, or any record beneath an `Organization` must check `organizationId === session.organizationId` (and the appropriate role) explicitly. Do not rely on a nested route param alone to enforce that a user can only reach their own organization's data.

## AI Assistant Guardrails

- Every retrieval call the AI Assistant makes is scoped to the requesting user's organization, regardless of what the question asks for — the assistant cannot be prompted into cross-tenant data access by rephrasing a question.
- A per-user and per-organization rate limit applies to AI Assistant questions, visible to the user, not a silent throttle.
- A question outside OpsLens's operational scope (general knowledge, unrelated topics) gets a direct, honest redirect rather than an improvised answer.
- An overly broad query ("show me everything") gets a clarifying prompt rather than an expensive, low-value full-data dump.
- Every assistant exchange is logged as an `AIInteraction` for audit and for the feedback loop, without storing unnecessary sensitive content beyond what's needed to reproduce the exchange.

## File Uploads

CSV files are uploaded by users. They are untrusted input, same as any user-submitted file.

- Accept only `.csv` (and, if the product later expands, spreadsheet formats), validated by actual file content, not the client-provided MIME type or file extension alone.
- Enforce a maximum file size and a maximum row count before attempting to parse the whole file into memory.
- Store files in the configured object storage with a random filename. Never use the client's filename directly.
- Serve any file the user can re-download from the storage provider's domain, never from the same origin as the app.

**Dedicated malware scanning is a developer decision to make explicitly, not a default assumption.** CSV is a plain-text format, which meaningfully reduces (but does not eliminate — CSV formula injection into spreadsheet software is a real, known risk) the malware surface a binary upload would carry. If file type support ever expands beyond CSV, revisit this with the developer before assuming the same posture applies.

## Rate Limiting

Apply rate limits to:
- Login and signup (to slow down credential stuffing)
- Password reset requests — both requesting a link (`app/(auth)/forgot-password/actions.ts`) and submitting a new password with a token (`app/(auth)/reset-password/actions.ts`)
- CSV import / pipeline-trigger creation (both to protect against abuse and because it's the plan model's quota-enforcement checkpoint — see `.agents/skills/api-route-scaffolder/SKILL.md`)
- AI Assistant questions (per user and per organization — see AI Assistant Guardrails, above)

Use an in-memory limiter for development and Upstash Redis (via the Vercel Marketplace integration, using `@upstash/ratelimit` + `@upstash/redis`) for production — developer-confirmed during the Phase 7 quality pass, since Vercel has no separate "native" counter store for this and Upstash is the standard answer in that ecosystem either way. This is a deliberate, narrow exception to the app otherwise having no Redis dependency (see `architecture.md`); it does not change how the ingestion/intelligence pipeline works, which still runs on Vercel Workflows.

The limiter lives in `lib/rate-limit.ts` and is **async** — every call site must `await` it, since the production path is a real network call. When `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` are unset (local development, and any environment that hasn't provisioned the integration), it transparently falls back to the in-memory limiter — same call signature, no code change needed at call sites.

## Logging

Log enough context to debug an incident, never enough to leak user data.

- Log request method, path, status, duration, and a request ID.
- Log user ID (not email, not name) when relevant.
- Log error stacks on the server.
- Never log: passwords, session tokens, the Anthropic API key, storage credentials, full raw CSV content, or the complete text of an AI Assistant conversation beyond what's needed to debug a specific incident.

## Dependencies

Every dependency is a potential vulnerability. Keep the list small. Run `npm audit` regularly. When a vulnerability is reported, update the package within a week unless the vulnerability does not affect our use case.

Do not install packages with fewer than a few thousand weekly downloads or no recent commits unless the developer approves.

## Incident Response

If a secret is exposed (committed by accident, leaked in a log, shared in a screenshot), rotate it immediately. The order is:
1. Rotate the secret at the provider (Anthropic, Neon, storage, auth provider).
2. Update the environment variable in production.
3. Deploy.
4. Revoke the old secret.
5. Tell the developer what happened and when, in writing.

If the exposed secret was `ANTHROPIC_API_KEY`, also check for anomalous usage/spend in the Anthropic console before and immediately after rotation.

Do not try to hide a leak. Fast, honest response limits damage.
