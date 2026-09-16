# AGENTS.md — OpsLens

This file is the entry point for any AI agent working on the OpsLens codebase in Antigravity, OpenCode, or any other AGENTS.md-compatible tool. Read this first, then load the rule files in `.agents/rules/` and the relevant skill in `.agents/skills/` before taking any action.

## What OpsLens Is

OpsLens is an AI-powered operational intelligence platform for e-commerce and logistics businesses. A business connects its operational data — orders, deliveries, inventory, invoices, payments, and customer complaints — and OpsLens turns that fragmented data into a single, prioritized, explainable operational picture: what changed, why it likely happened, how confident the system is in that explanation, and what a sensible next step looks like, with the underlying evidence always one click away.

OpsLens is not a generic BI dashboard, not a chatbot, not a CRM or ERP, and not an autonomous agent that acts without human oversight. It is a decision-support layer that sits between raw operational data and a human making a call. Every feature decision should be measured against the core product loop: **Detect → Understand → Prioritize → Decide → Act → Learn.** If a proposed feature doesn't directly support that loop, it's out of scope unless the developer explicitly approves it.

The single non-negotiable product principle: **AI explains before it recommends, and evidence outranks confidence.** A confidence score with no underlying evidence is decorative, not intelligence. An AI-generated conclusion must never be presented as more certain than the data actually supports, and it must never be the sole basis for a consequential action — a human always accepts, rejects, modifies, or dismisses.

## Who We Are Building For

- **Operations Manager** (primary) — monitors day-to-day operations across orders, inventory, delivery, and complaints; currently cross-references five or more disconnected tools to find out what's wrong, usually after it's already caused downstream damage. Needs a fast morning orientation, a prioritized issue list, and evidence she can act on without re-deriving it herself.
- **Founder / CEO** (secondary) — wants high-level business visibility and early warning signals without digging into department-level detail. Will disengage from any score or summary that feels like a black box.
- **Customer Success Lead** (secondary) — tracks complaint trends and needs to know which operational problems are about to become customer-facing ones.
- **Warehouse / Logistics Manager** (secondary) — owns delivery delays, fulfillment issues, and supplier performance; needs early, specific warning rather than a lagging weekly summary.
- **Finance Manager** (secondary) — tracks outstanding invoices, payment delays, and cash-flow risk; needs to catch a high-risk customer before it becomes a collections problem.

Agents must keep the trust relationship with these personas in mind at all times. A user who catches OpsLens presenting an AI guess as settled fact will stop trusting the whole product, not just that one insight.

## Tech Stack

- Next.js (App Router) with React and TypeScript, end-to-end
- PostgreSQL, provisioned via Neon through the Vercel Marketplace integration, accessed through Prisma
- Zod for structured-output and input validation everywhere data crosses a trust boundary
- Claude API (Anthropic), structured output via tool-use/JSON schema, for all AI-generated insights, root-cause explanations, and recommendations
- Vercel Workflows for the asynchronous ingestion and intelligence pipeline — durable execution with no hard time limit, replacing a separate queue/worker service (see `architecture.md`'s The Stack section for why this is enough on its own)
- Provider-managed authentication (Auth.js) — never hand-rolled
- Tailwind CSS for styling, driven by the CSS custom properties already defined in `tokens/tokens.css` (see `design-system.md`)
- Hosting: Vercel (app, functions, and workflows) + Neon Postgres

See `.agents/rules/architecture.md` for the full rationale behind each of these choices.

## Project Structure

**Current state:** only the items marked *(exists now)* below are actually in the repo. There is no Next.js app yet — `app/`, `components/`, `lib/`, `prisma/`, and `public/` are the target layout described in `architecture.md`, not scaffolded directories. Don't assume they exist; that's the first gap a bootstrap task needs to fill.

```
opslens/
├── AGENTS.md                       (this file)                          (exists now)
├── .agents/                                                              (exists now)
│   ├── rules/                      (always-on rules for every task)
│   │   ├── architecture.md
│   │   ├── code-style.md
│   │   ├── design-system.md
│   │   └── security.md
│   └── skills/                     (load only when relevant to the task)
│       ├── component-builder/
│       ├── api-route-scaffolder/
│       └── db-migration-runner/
├── workflows/                      (step-by-step recipes for common tasks) (exists now)
│   ├── new-component.md
│   └── new-api-route.md
├── tokens/                         (design-token sources + generated CSS — see design-system.md) (exists now)
│   ├── color-tokens.tokens.json
│   ├── typography-tokens.tokens.json
│   ├── spacing-border-radius.json
│   ├── build-tokens.js             (regenerate with: node build-tokens.js)
│   └── tokens.css                  (the actual stylesheet — single source of truth)
├── Logos/                          (brand assets — staging location; move into public/logo/ (exists now)
│                                    once public/ is scaffolded, per design-system.md's Logo
│                                    & Brand Assets section)
├── public/                         (static assets, logo — not yet scaffolded)
├── app/                            (not yet scaffolded)
├── components/                     (not yet scaffolded)
├── lib/                            (not yet scaffolded)
└── prisma/                         (not yet scaffolded)
```

See `architecture.md` for what lives inside `app/`, `components/`, `lib/`, and `prisma/` once they exist.

## How to Use These Files

**Rules in `.agents/rules/` are always in effect.** Load all four before starting any task. They cover architecture decisions, code style, the design system, and security requirements. Do not override them without explicit permission from the developer.

**Skills in `.agents/skills/` are loaded on demand.** When building a UI component, read `.agents/skills/component-builder/SKILL.md` first. When creating a server action or route handler, read `.agents/skills/api-route-scaffolder/SKILL.md`. When changing the database schema, read `.agents/skills/db-migration-runner/SKILL.md`. Never skip the skill file and try to work from memory — the schemas, templates, and conventions they define are the source of truth, not whatever pattern feels familiar.

**Workflows in `workflows/` are recipes.** Follow them in order when the task matches. They chain the rules and skills into a concrete sequence of steps.

## Non-Negotiables

1. **AI output is never trusted until it's validated.** Every AI-generated structured result (`Insight`, `HandoffIssue`-equivalent `Issue`, `Recommendation`) is validated against its Zod schema before it touches the database or is shown to anyone. Invalid output is rejected, never silently stored.
2. **Evidence and confidence are never optional.** Every `Insight` directly carries `Evidence` records and a confidence value at creation time — qualitative (High/Medium/Low/Insufficient evidence) where a meaningful number can't be established, never a fabricated numeric confidence just because the UI expects one. An `Issue` inherits its confidence from the `Insight`(s) behind it rather than storing its own (see `security.md`'s AI Output & Structured Data Trust section) — so an `Issue` with no evidence-bearing `Insight` behind it is exactly as much a bug as an `Insight` created without evidence.
3. **A human decision is never silently overwritten.** If a `Recommendation` has already been Accepted, Rejected, Modified, or Dismissed, a later analysis run that produces a conflicting result for the same underlying issue must not auto-apply. Raise a new, linked `Issue` instead — see `architecture.md`'s Data Flow section for the exact rule.
4. **The Operational Health Score and Issue priority score are deterministic and explainable.** Both are computed from an explicit, versioned formula over already-persisted data — never inferred by a model call. If a formula changes, its version increments.
5. **Every organization's data is isolated at the server layer, not just the UI layer.** No query, no AI Assistant response, and no cross-organization comparison may ever expose one organization's data to another. Never rely on a nested route param alone to prove ownership.
6. **Sensitive data lives in environment variables, never in the codebase.** API keys (Anthropic, database, storage), connection strings, and session secrets are never committed, logged, or exposed to the client.
7. **The product stays narrow.** The following are explicitly out of scope for MVP — do not build any of them without the developer's explicit sign-off, even if a task seems to lead naturally toward one:
   - Native ERP/CRM integrations or connectors beyond CSV upload
   - WhatsApp or Slack automation
   - Autonomous agents that take real-world action without explicit human approval
   - Advanced predictive modeling or a fully realized scenario simulator (a foundation-only version is in scope)
   - Multi-industry templates beyond e-commerce and logistics
   - Enterprise SSO or fine-grained custom permissions
   - Live billing, payment processing, or paid-tier enforcement — usage metering and soft tier gating are in scope; charging money is not
   - Any feature that functions as employee surveillance rather than an operational-capacity signal

   **Feature build order** (Must-Have items are hard dependencies; nothing later is usable without them):

   | Priority | Features | Why |
   |---|---|---|
   | Must Have — foundation | Authentication & Workspace → CSV Ingestion → Data Mapping → Data Quality Scoring → Operational Event Normalization | Nothing else is usable without an authenticated org, an import pipeline, and normalized events to reason over. |
   | Must Have — intelligence | Operational Health Score → Issues Feed → Issue Detail → AI Recommendations → AI Assistant → Basic Notifications → Audit History | The trust model is not optional polish — an issue without evidence and a recorded human decision is just an unstructured AI dump. These ship *with*, not after, detection. |
   | Should Have | Root Cause Exploration (visual chain) → Timeline Intelligence → Department Views → Weekly AI Report → Feedback on AI insights → mobile-responsive experience → Scenario Simulator (foundation only) → Light mode → usage caps / tier labels | Real product value, but the core loop is coherent without them at first launch. |
   | Explicitly deferred | See the out-of-scope list above. | Do not build opportunistically just because a task seems to lead there. |

## When in Doubt

Ask the developer. Do not guess at the Operational Health Score formula, the Issue priority formula, AI schema contracts, auth flows, or anything involving how a human decision and a later AI analysis run interact. Small guesses in those areas erode the one thing OpsLens is actually selling: trust.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
