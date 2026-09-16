# Architecture Rules

These rules describe how OpsLens is put together. Every agent building features must follow this architecture. Do not introduce new patterns without discussing them with the developer first.

## The Stack

OpsLens is a Next.js application using the App Router, written in TypeScript end-to-end, backed by PostgreSQL (provisioned via Neon through the Vercel Marketplace integration) through Prisma. AI analysis runs through the Claude API. Structured AI output and all external input are validated with Zod. The asynchronous ingestion and intelligence pipeline runs on Vercel Workflows. Styling is handled by Tailwind CSS, driven by the CSS custom properties defined in `tokens/tokens.css` (see `design-system.md`). There is no separate backend service and no separate worker process. Everything lives in the Next.js app, using server components, server actions, route handlers, and Vercel Workflows for anything that needs to run longer than a single request.

**Why these choices, briefly:**
- **Next.js App Router, one app, no separate backend** — the whole product is CRUD plus an AI pipeline over a single Postgres database; a separate API service would add a network hop and a second deploy target for no capability OpsLens needs at this stage.
- **PostgreSQL via Prisma, provisioned through Neon** — the domain is relational (`Organization` → `Order`/`Delivery`/`Invoice`/`Complaint` → `OperationalEvent` → `Metric` → `Insight` → `Issue` → `Recommendation`); foreign keys and transactions are load-bearing for the evidence-linkage trust model (see Data Flow, below), not optional structure a document store would let us skip. Neon specifically (over a self-managed Postgres instance) because its branch-per-preview-deployment feature gives every pull request an isolated database branch alongside its Vercel preview — see Environments, below.
- **Zod everywhere a trust boundary is crossed** — the product's entire value proposition is "AI output is never trusted until validated" (see `AGENTS.md`'s Non-Negotiables); Zod is the one mechanism that enforces that for both user input and AI output, and `z.infer` keeps the runtime check and the TypeScript type from drifting apart (see `code-style.md`).
- **Claude API for all AI-generated content** — every AI stage in this app (insight detection, root-cause explanation, recommendation generation, and the AI Assistant) needs structured, schema-conformant output rather than free-form prose, and Claude's tool-use/JSON-schema mode is what `lib/ai/schemas.ts`'s validation step is built against; standardizing on one provider also means one client wrapper (`lib/ai/client.ts`), one rate-limit/cost model, and one place to reason about prompt-injection and data-boundary risk (see `security.md`'s AI Assistant Guardrails) instead of several.
- **Vercel Workflows for the ingestion and intelligence pipeline** — durable execution with no hard time limit (checkpointed, resumable, can run for minutes to hours), which covers the pipeline's actual shape — CSV parsing, event normalization, and multi-stage AI analysis — without standing up a separate queue and worker service. This is a deliberate simplification versus a BullMQ/Redis-style setup: the pipeline's steps are I/O-bound (waiting on the AI provider, waiting on the database) rather than CPU-bound, which is exactly what Workflows is built for, and it keeps the whole app on one platform with one deploy target.
- **Provider-managed auth** — session/credential handling is exactly the kind of code where a subtle bug is a breach, not just a bug; see `security.md`.
- **Tailwind CSS, driven by the tokens in `tokens/tokens.css`** — the design system (see `design-system.md`) is the actual constraint here, not the utility-class approach itself: OpsLens needs every color, spacing, and type choice to trace back to a single, deliberately small token set (trust is partly a visual-consistency property — see `design-system.md`'s opening), and Tailwind's arbitrary-value syntax (`bg-[--color-brand-solid]`) lets components consume those tokens directly with nothing hand-rolled in between. A component library (MUI, Chakra, Ant) would fight that token discipline instead of expressing it — see `code-style.md`'s What Not to Do.

These are the developer's calls, not defaults to reconsider mid-task — if a task seems to need a different piece of infrastructure, that's a sign to ask, not to swap the stack.

## Directory Layout

```
app/
├── (marketing)/                public landing pages, logged-out experience
├── (auth)/                     login, signup — split from (marketing) so auth flows don't
│   ├── login/                  inherit marketing-site chrome as that group grows real content
│   └── signup/
├── (dashboard)/                authenticated workspace, grouped by layout
│   ├── overview/               Morning Brief + Operational Health Score — the default landing page
│   ├── issues/
│   │   ├── [issueId]/          issue detail: evidence, root cause, recommendations, status
│   │   └── page.tsx            issues feed
│   ├── intelligence/           cross-functional insights that don't map to a single department
│   ├── departments/            finance/ inventory/ logistics/ customer/ — each a scoped view
│   ├── timeline/
│   ├── assistant/               AI Assistant conversational view
│   ├── reports/                 weekly and historical intelligence reports
│   ├── data/                    data sources, ingestion status, mapping, quality
│   └── settings/                organization, users, roles, notifications
├── api/
│   ├── auth/                    auth provider route handlers (Auth.js callback routes)
│   ├── uploads/                 signed upload URL issuance for CSV files
│   └── assistant/                AI Assistant streamed-response route (the one direct Claude call — see AI Processing, below)
└── layout.tsx                   root layout

components/
├── ui/                          primitives (Button, Input, Card, SeverityBadge, ConfidenceTag, etc.)
├── issues/                      EvidencePanel, CausalChain, StatusStepper — Issue Detail-specific
├── overview/                    MorningBrief, HealthScoreDisplay
├── departments/                 department-scoped views
├── dashboard/                   shared dashboard chrome — nav, org switcher
└── shared/                      shared across the app (EmptyState, PageHeader)

hooks/                           shared custom hooks (use*) — a hook scoped to one component lives
                                  alongside it instead; see code-style.md's Naming rules

lib/
├── env.ts                       environment variable validation (boot-time) — see security.md's Secrets and Configuration rules
├── db.ts                        Prisma client singleton
├── auth.ts                      session and auth helpers
├── logger.ts                    structured logger — see security.md's Logging rules
├── rate-limit.ts                rate limiter (in-memory dev, Redis-backed prod, or a Vercel-native alternative — developer's call) — see security.md's Rate Limiting rules
├── cn.ts                        className merge utility — used by every component, per component-builder's SKILL.md template
├── ai/
│   ├── client.ts                 Claude API wrapper
│   └── schemas.ts                Zod schemas for each pipeline stage's structured output
├── storage.ts                   object storage wrapper for uploaded CSV files
├── workflows.ts                 Vercel Workflow definitions and trigger functions for ingestion and intelligence
├── health-score.ts              Operational Health Score formula (versioned, pure function — see Deterministic Scores, below)
├── prioritization.ts            Issue priority formula (versioned, pure function — see Deterministic Scores, below)
├── types.ts                     shared TypeScript types (ConfidenceLevel, IssueSeverity, NotificationSeverity, IssueStatus, RecommendationStatus, etc.) — see code-style.md
└── validators/                  zod schemas for input validation

prisma/
├── schema.prisma                single source of truth for the database
└── migrations/                  generated migration files

tokens/                          design-token sources + generated tokens.css — see design-system.md
public/                          static assets, logo (brand assets currently staged in /Logos until this exists — see AGENTS.md's Project Structure)
```

There is no `workers/` directory. Vercel Workflows runs inside the same Next.js deployment; there is no separate persistent process to host or deploy independently. If a task seems to need one, that's a sign the task doesn't actually fit Workflows' model — stop and ask rather than reintroducing a worker.

## Rendering Rules

The Morning Brief (`app/(dashboard)/overview/`) is the first thing a user sees, every day the product is working — it must load fast and never require a client-side fetch before showing something meaningful. Server-render it.

The rest of the dashboard can use client components where real interactivity is needed — filtering the Issues Feed, expanding an evidence panel, the AI Assistant's streaming chat — but data fetching happens on the server. Do not fetch from route handlers inside client components when a server component can pass the data down directly.

## Data Flow

There are three kinds of writes in this app, and they carry different trust levels:

1. **User-initiated writes from the dashboard** go through server actions. Creating an organization, confirming a data mapping, and every decision on a `Recommendation` (Accept, Reject, Modify, Dismiss) or `Issue` (Acknowledge, assign, resolve, dismiss) call a server action, which validates input with Zod, writes to the database through Prisma, and revalidates the relevant cache tags — including the organization's cached `healthScore` when a decision changes it.

2. **Deterministic ingestion writes**, triggered by a CSV upload, run inside a Vercel Workflow — not in a request/response cycle, since parsing and normalizing a large file can take longer than a single request should hold open. This stage is **not** an AI trust boundary: it's parsing, validated field mapping, and mechanical normalization into `OperationalEvent` and `Metric` rows. It still validates every row against its Zod schema before writing (malformed rows are rejected and surfaced, never silently dropped — see `security.md`), but the concern here is data quality, not AI hallucination.

3. **AI-initiated writes from the intelligence pipeline**, also inside a Vercel Workflow, happen after ingestion completes. Each stage (see AI Processing, below) validates its own structured output against its Zod schema before writing anything. A stage's output is never trusted as-is, and a `Recommendation` or `Issue` that already carries a human decision is never overwritten by a later run — see the rule below.

**Insight and Issue integrity when source data changes.** An `Insight` or `Issue` is generated from a specific snapshot of `Event` and `Evidence` records. Source data is not static — a re-import can correct a record, and a `DesignerDecision`-equivalent human action can be made on a finding that later turns out to be based on flawed evidence. The governing rule: **nothing is silently rewritten.**
   - If an `Event` referenced by `Evidence` is deleted (e.g., a corrected re-import removes a duplicate), the `Evidence` row is retained with a stale-reference flag, not deleted or silently repointed — the `Insight`/`Issue` built on it shows "evidence partially unavailable" and its confidence is recalculated downward.
   - A correction via re-import produces a **new** `Event`, never a mutation of an existing one. If the correction changes the underlying pattern materially, a new `Insight`/`Issue` is generated and the old one is marked superseded with a visible link to its replacement — the original is never quietly edited to match.
   - A `Recommendation` that has already been Accepted, Rejected, or Modified keeps that decision as immutable historical fact. If its supporting `Insight` is later invalidated, a new `Issue` is raised to flag the discrepancy; the original decision is not rewritten.

## State Management

There is no global state library. React state and server data are enough. If you feel the urge to add Redux, Zustand, or Jotai, stop and reconsider. The AI Assistant has real local interaction (streaming message state, in-flight follow-ups) but it is scoped to that view — `useState` plus server actions and the streamed route handler cover every case.

## Database Access

All database access goes through Prisma. Raw SQL is only allowed in migration files — if application code seems to genuinely need it, that's a sign to stop and ask the developer rather than reach for `prisma.$queryRaw`, not a routine escape hatch (see `security.md`'s SQL Injection rules for the tagged-template requirement on the rare occasion one is approved). Every query that takes user input must use Prisma's parameterized query builder, never string interpolation.

The Prisma client is imported from `lib/db.ts`, which exports a singleton. Do not instantiate `new PrismaClient()` anywhere else; creating multiple clients exhausts the connection pool in development.

Every organization-scoped query filters on `organizationId` explicitly at the query layer — never rely on a nested route param alone to prove that a row belongs to the requesting user's organization. See `security.md`'s Multi-Tenant Isolation rules; this is enforced at the database-access layer, not just checked once at the top of a route handler.

## AI Processing

The full pipeline, end to end, is: **Upload → Validate → Map → Normalize → Calculate Metrics → Detect Insights → Explain Root Cause → Generate Recommendations → Human Decision → Feedback.** The first five steps (through Metric calculation) are deterministic ingestion, not AI — see Data Flow, above. The remaining AI stages are broken out below; each is a distinct, independently retryable Claude API call within the same Vercel Workflow run.

| Stage | Purpose | Output schema (validated via Zod) | Model tier guidance |
|---|---|---|---|
| 1. Insight detection | Identify anomalies, trends, and patterns across an organization's `Metric` and `OperationalEvent` data | `Insight[]` + `Evidence[]`, each with a confidence level | Stronger reasoning model — this is the stage most prone to false confidence if under-powered, since it's synthesizing across data, not extracting single values |
| 2. Root-cause explanation | For each `Insight` that clears the confidence bar for one, construct a contributing-factor narrative | Structured causal-chain output (contributing factors + their supporting `Evidence` references) attached to the `Insight` | Stronger reasoning model — inference-heavy, and the one place hedged language ("likely," "contributing factor") matters most |
| 3. Recommendation generation | For each `Issue` (see Deterministic Scores, below, for how an `Issue` is created from one or more `Insight`s), generate a suggested next action | `Recommendation[]` with `expectedImpact`, `confidence`, and `rationale` | Lighter/faster model is often enough here — the reasoning happened in stages 1–2; this stage is mostly synthesis into an actionable suggestion |

"Model tier guidance" above is relative (lighter/faster vs. stronger reasoning), not a fixed model identifier — the actual stage-to-model mapping is configured in `lib/ai/client.ts` and is the developer's call to set and change as models improve or costs shift, not something to hardcode from this table.

Rules that follow from this table:

- A single stage's failure produces a partially-completed run rather than discarding the whole pipeline — never fail the entire ingestion-through-recommendation run because one AI stage errored.
- **Stage 1 (insight detection) runs first and blocks stages 2 and 3.** Root-cause explanations and Recommendations both reference an `Insight`/`Issue` foreign key, so neither can persist until stage 1's records exist to attach to.
- Stage 3 (recommendation generation) runs against `Issue`s, which are themselves created deterministically from one or more `Insight`s crossing the priority threshold in `lib/prioritization.ts` — not an AI stage. See Deterministic Scores, below, for why.
- Every stage's raw output is validated against its schema in `lib/ai/schemas.ts` before any `Insight`/`Evidence`/`Issue`/`Recommendation` record is persisted; a schema-validation failure on one stage does not block the others.
- **Cost control:** an unchanged `DataImport` (matched by checksum) reuses the most recent successful pipeline run's output rather than re-running insight detection from scratch. This reuse also means the request does not consume the organization's usage quota — see `security.md` and `.agents/skills/api-route-scaffolder/SKILL.md` for the quota-enforcement checkpoint this feeds into.
- If insufficient evidence exists to support a reliable `Insight`, root-cause explanation, or `Recommendation`, the stage does not produce one — it produces an explicit "insufficient evidence" result rather than a plausible-sounding guess. This is not an error condition; see Error Handling, below.

### AI Evaluation

This is the "AI evaluation suite" the Agentic build scope table (see Environments, below) requires to pass before a Preview build can merge — defined here so it isn't a dangling reference.

A fixed, version-controlled set of representative business questions and known-good expected behavior, run against the seeded demo dataset (see `.agents/skills/db-migration-runner/SKILL.md`'s data model — the seed script itself is built in the Data Foundation phase). For each stage (insight detection, root-cause explanation, recommendation generation, and the AI Assistant), the evaluation set checks:

- **Grounding** — every factual claim in the output traces to a real `Metric`/`OperationalEvent`/`Evidence` row in the seed data, never an invented figure.
- **Hallucination avoidance** — a question the seed data can't answer gets an explicit "insufficient evidence" response, not a plausible-sounding guess.
- **Tenant-boundary respect** — a question phrased to try to pull another organization's data is refused regardless of phrasing.
- **Uncertainty identification** — confidence levels in the output match what the underlying evidence actually supports, not a default "High" applied indiscriminately.
- **Evidence citation** — every `Insight`/`Recommendation`/AI Assistant answer names the specific data it used, per `security.md`'s AI Output & Structured Data Trust section.

This is a test suite, run the same way as the unit/integration suite in `code-style.md`'s Testing section — not a manual review step. It lives alongside the rest of the AI pipeline code, not in a separate tool.

## AI Assistant — the one exception to "AI calls go through a Workflow"

The AI Assistant's conversational endpoint (`app/api/assistant/route.ts`, `lib/ai/client.ts`'s `streamAssistantReply`) calls Claude directly from a route handler with a streamed response, **not** through `lib/workflows.ts`. This is a deliberate, narrow, developer-approved exception — decided because the pipeline-stage rule above exists to handle multi-minute, multi-stage background work, and a single conversational turn is neither. Streaming is the standard, expected UX for a chat interface.

What still applies unchanged: the response is validated (non-empty, within expected length) before being persisted as an `AIInteraction`, never persisted unvalidated; every retrieval call the assistant makes is scoped to the requesting user's organization regardless of what the prompt asks for (see `security.md`'s AI Assistant Guardrails); the endpoint is rate-limited per user and per organization.

## Deterministic Scores

**Operational Health Score** (`lib/health-score.ts`) and **Issue priority score** (`lib/prioritization.ts`) are both computed as pure functions over already-persisted application data — never a model call. This is what "deterministic and explainable" means architecturally: given the same inputs, each always produces the same output, and that output can be explained by pointing at the specific rows that fed it, not by re-asking the AI.

- The Health Score's five components (Delivery, Inventory, Customer, Financial, Incident Health) and their weighting are configurable in the architecture, not hardcoded inline wherever the score is displayed. Exactly how each component is weighted, and exactly how `Business Impact × Urgency × Confidence × Customer Impact × Operational Impact` is normalized into the priority score's Critical/High/Medium/Low labels, is **not decided here** — see `AGENTS.md`'s "When in Doubt" and do not guess at either formula's internals from the description above; this file constrains *how* each formula must be shaped (a pure, versioned function over persisted data), not what its exact inputs and weights are.
- Every `Organization` stores the `healthScoreAlgorithmVersion` that produced its cached score, and every `Issue` stores the `priorityAlgorithmVersion` that produced its cached priority. If either formula in `lib/` changes, bump the corresponding version rather than silently changing what an existing score means — a score computed under v1 and one computed under v2 are not directly comparable, and the version field is what makes that fact visible instead of hidden.
- Both scores are recalculated and cached (not computed on every read) whenever a write changes an input that feeds them — see Data Flow, above, and the cache-revalidation step in `.agents/skills/api-route-scaffolder/SKILL.md`.
- If a Health Score component lacks sufficient underlying data, the formula returns an explicit "insufficient data" state for that component rather than silently averaging around the gap — the UI must be able to render that state, not just a number.

## Authentication

Authentication is provider-managed (Auth.js) — never hand-rolled. Sessions are cookie-based under the hood. Cookies are `httpOnly`, `secure` in production, and `sameSite: lax`. The session helper in `lib/auth.ts` wraps the provider and exposes `getSession()` for server components and server actions. Client components that need auth state receive it as a prop from their parent server component.

There is no unauthenticated boundary to any organization's data or business logic — unlike products with a public share-link, every read and write in OpsLens requires a valid session and an organization-membership check. The publicly reachable surfaces are the static marketing site (`app/(marketing)/`) and the sign-in/sign-up flows (`app/(auth)/`, see Directory Layout, above) — neither holds organization data or needs a session; they're not an exception to this rule so much as outside its scope entirely. Middleware enforces this as deny-by-default rather than an allow-list of protected routes: every path is treated as requiring a session except the exact public paths it names explicitly, so a newly added route is protected automatically instead of shipping open until someone remembers to add it to a list — see `middleware.ts`. If a task seems to need a new unauthenticated route beyond marketing and auth, stop and ask; it is very likely not in scope.

## Error Handling

Server actions and route handlers return structured responses. Success is `{ ok: true, data }` and failure is `{ ok: false, error: { code, message } }`. The client never receives raw exception messages, stack traces, or Prisma error objects. Log the full error on the server, return a sanitized message to the user.

This applies to application errors, not to AI epistemic uncertainty — those are two different things. An AI stage that can't establish sufficient evidence isn't an "error" in this sense; it's an `Insight`, root-cause explanation, or `Recommendation` explicitly withheld, or a confidence level of "Insufficient evidence," and it's handled per the AI trust model, not the error envelope.

## Environments

- **Local / Development** — runs against a local or branched Neon database and Claude API keys scoped to a low-spend development budget. Intended to be seeded from a fictional demo dataset rather than ever connecting to a real organization's data — the seed script and dataset itself are **not yet defined anywhere in this doc set**; confirm the approach with the developer before building against an assumed one.
- **Preview (Staging)** — every pull request gets a Vercel Preview Deployment, paired automatically with an isolated Neon database branch (copy-on-write from the current schema and seed state) via the Neon-for-Vercel integration. This is the pre-release validation environment: the full automated test suite runs against it before a PR can merge, and it's where a reviewer — human or the developer — checks a change against production-like infrastructure without touching real data.
- **Production** — the deployed Vercel project, production Neon branch, and production Claude API keys.

**Agentic build scope.** OpsLens is built with substantial help from Claude Code. That doesn't change the environment boundaries above — it changes what needs to be explicit about who can reach which one:

| Scope | Mechanism | Review Checkpoint |
|---|---|---|
| Where agent-authored changes can execute | Claude Code's local working environment has credentials for Local/Development only — no production or preview-environment secrets are ever present in that environment. An agent's changes reach Preview and Production exclusively by being committed and pushed through the same PR flow as any other change. | N/A — this is a credential-scoping boundary, not a review step. |
| How agent-authored changes reach Preview | A pushed branch triggers a normal Vercel Preview Deployment + Neon branch, identical to a human-authored branch. Nothing about the agent's involvement grants a different or faster path to Preview. | The full automated test suite (unit and integration — see `code-style.md`'s Testing section for the runner, file convention, and minimum coverage expectations) plus the AI Evaluation suite (see AI Processing, above) must both pass on the Preview build before merge is possible. |
| How agent-authored changes reach Production | Merge to `main` triggers the standard Production deploy. | A human reviews and approves the pull request before merge — this applies uniformly to agent-authored and human-authored changes; agent authorship is not, by itself, a reason for either a lighter or a heavier review than usual. |
| What an agent is authorized to do, beyond where it runs | Database schema changes go through `.agents/skills/db-migration-runner/SKILL.md`'s process (versioned, reviewed migrations) — an agent never hand-edits a database directly, in any environment. Secrets and environment variables are read via `lib/env.ts`'s validated config, never printed, logged, or written to a file the agent creates. | Same PR review as any schema or config change. |

Database schema changes are applied through versioned, reversible migrations — never a manual production edit — given the tenant-isolation and audit-integrity guarantees the schema is responsible for (see `security.md`).

## Product Analytics

Instrument the events below as each feature that produces them is built — this is the settled list; don't invent a different name for the same action in a later phase. The analytics tool itself (e.g., PostHog, Vercel Analytics) is a developer decision made once during Foundation and wired through a single `lib/analytics.ts` helper, the same way `lib/logger.ts` centralizes logging — features call the helper, they never talk to the analytics provider's SDK directly.

```text
user_signed_up
workspace_created
dataset_uploaded
mapping_completed
dataset_imported
morning_brief_viewed
issue_opened
issue_acknowledged
recommendation_viewed
recommendation_accepted
recommendation_rejected
ai_question_submitted
ai_answer_viewed
ai_feedback_submitted
report_generated
```

This list exists to answer specific product questions (are users finding value, are AI recommendations useful, which workflows create the most value) — it is not a mandate to track everything indiscriminately. Do not add an event here just because a new feature ships; add one only when it answers one of those questions. Never include another organization's data, a customer's PII beyond what `organizationId`/`userId` already identify, or raw AI response content in an event payload — see `security.md`'s Logging rules for the same boundary applied to analytics instead of logs.

## What Not to Do

- Do not add GraphQL. Server actions and REST route handlers are enough.
- Do not add a separate Node or Express backend. Everything stays in Next.js.
- Do not reach for microservices. This is one app, using Vercel Workflows for anything that needs to run longer than a request.
- Do not build a custom auth system from scratch. Auth.js is already the decision — see `AGENTS.md`'s Tech Stack section.
- Do not store uploaded CSV files on the filesystem. Use the configured object storage in `lib/storage.ts`. The filesystem is ephemeral on Vercel.
- Do not call the Claude API directly from a route handler or server action for anything beyond a single conversational turn. The ingestion and intelligence pipeline goes through `lib/workflows.ts`, not an inline `await` — the one narrow, documented exception is the AI Assistant's streamed reply, see AI Processing, above.
- Do not let a pipeline stage write directly to the database without going through its Zod schema in `lib/ai/schemas.ts` first.
- Do not add a queue/worker service (BullMQ, Redis, or otherwise) to handle background work. Vercel Workflows already covers this — see The Stack, above. If a specific job genuinely doesn't fit Workflows' model, stop and ask the developer rather than reintroducing separate infrastructure.
