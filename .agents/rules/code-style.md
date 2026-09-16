# Code Style Rules

These are the code-style rules for OpsLens. They exist so the codebase reads the same way no matter who (or which agent) wrote a given file. Consistency matters more than personal preference.

## Language

TypeScript everywhere. No JavaScript files in `app/`, `components/`, `lib/`, or `prisma/`. Root-level configuration files (`next.config.mjs`, etc.) are the only place a `.js`/`.mjs` file is expected at all, and even then `tailwind.config.ts` is TypeScript rather than following that pattern.

Strict mode is on. Do not disable `strict`, `noImplicitAny`, or `strictNullChecks` to make an error go away. Fix the type instead.

## Naming

- Components are `PascalCase` in `PascalCase.tsx` files. `SeverityBadge.tsx` exports `SeverityBadge`.
- Hooks start with `use` and live in `hooks/` or alongside the component that uses them if scoped.
- Utility functions are `camelCase` in `camelCase.ts` files.
- Constants are `SCREAMING_SNAKE_CASE` when they represent fixed configuration values (e.g., `MAX_UPLOAD_SIZE_MB`), `camelCase` otherwise.
- Database models in Prisma are `PascalCase` singular: `Organization`, `Issue`, `Insight`, `Recommendation`, `OperationalEvent`. Table columns are `snake_case` in the database, mapped to `camelCase` in the Prisma client.
- Enum values match this domain vocabulary exactly — `ConfidenceLevel` is `High | Medium | Low | InsufficientEvidence`, `IssueSeverity` is `Critical | High | Medium | Low`, `NotificationSeverity` is `Critical | High | Medium | Informational` (a distinct enum from `IssueSeverity` — see `design-system.md`'s Color semantics table for why they're never merged), `IssueStatus` is `Detected | Reviewed | Acknowledged | InProgress | Resolved | Dismissed`, `RecommendationStatus` is `Pending | Accepted | Rejected | Modified | Dismissed | Completed`. Do not invent synonyms for these; the same word must mean the same thing in the schema, the API, and the UI copy.
- Boolean variables read as yes/no questions: `isAnalyzing`, `hasUnresolvedCritical`, `canExport`, not `analyzing`, `unresolvedCritical`, `export`.

## File Organization

One component per file. If a helper function is only used inside one component, define it in the same file below the component. If it gets used anywhere else, lift it to `lib/`.

Order inside a component file:
1. Imports — Node built-ins, then third-party packages (React first among them), then local imports aliased with `@/`, separated by blank lines (see Formatting, below, for the enforced rule)
2. Types and interfaces
3. Constants
4. The component itself
5. Helper functions used only by this component

## TypeScript

Prefer `type` over `interface` unless you need declaration merging. Keep types close to where they are used. When a type is shared across the app, put it in `lib/types.ts` or a domain-specific types file — e.g., `ConfidenceLevel`, `IssueSeverity`, `NotificationSeverity`, `IssueStatus`, and `RecommendationStatus` are shared enough to live in `lib/types.ts` rather than being redefined per component. `IssueSeverity` and `NotificationSeverity` in particular must stay as two distinct exported types, never collapsed into one — see the Naming section, above, for why.

Do not use `any`. If you genuinely do not know the shape of something — especially raw AI output before it's been validated — use `unknown` and narrow it with a Zod schema, not a hand-written type guard. `any` is a last resort and should have a comment explaining why.

Use Zod for anything that comes from outside the app or outside TypeScript's static guarantees: form inputs, route handler request bodies, URL parameters, environment variables, uploaded CSV rows, and — critically for this app — every piece of AI-generated structured output before it is persisted. Raw Claude API responses are `unknown` until they pass their schema in `lib/ai/schemas.ts`.

## React

Write function components, not class components. Use hooks. Destructure props in the function signature. Give every component an explicit return type only when it improves clarity; most of the time inference is fine.

Server components are the default. Add `"use client"` only when the component actually needs interactivity, browser APIs, or client state. If a component is marked `"use client"` but has no `useState`, `useEffect`, `onClick`, or browser-only code, it should not be a client component.

Keep components small. If a component file is longer than about 200 lines, look for pieces to extract. The Issue Detail view especially tends to accumulate logic (evidence display, root-cause exploration, recommendation decisions) — extract into `components/issues/` sub-components rather than growing one file.

## Formatting

Prettier handles formatting. Do not argue with it. The config lives at the project root. Two-space indentation, single quotes for strings, semicolons required, trailing commas where valid.

Imports are sorted: Node built-ins, then third-party packages (React first among them, where present), then local imports (aliased with `@/`), with a blank line between each group. The ESLint config enforces this.

## Comments

Write comments that explain *why*, not *what*. The code already says what it does. If a comment is paraphrasing the line below it, delete it.

Good comment: `// A human decision on a Recommendation always wins over a later pipeline run's conflicting output — see architecture.md's Data Flow section.`

Bad comment: `// Loop over the issues.`

JSDoc blocks are worth writing for public utility functions in `lib/`, especially anything related to the AI pipeline, the Health Score or priority-score formulas, or auth. For internal components, the types usually tell the story.

## Error Handling

Use try/catch around anything that can throw: database calls, network calls (including Claude API calls), JSON parsing, CSV parsing. Catch the error, log it with enough context to debug, and return the structured error response defined in `architecture.md`.

Never swallow errors silently. A bare `catch (e) {}` with no log and no rethrow is a bug waiting to happen — in the intelligence pipeline specifically, a swallowed error is how a partially-completed run gets silently misreported as fully completed, which is a data-integrity problem, not just a UX one.

Never expose raw error messages to the end user. They may contain stack traces, file paths, or database details that should not leak.

## Testing

Vitest is the test runner, paired with React Testing Library for anything that renders a component — fast, ESM-native, no separate config ceremony beyond what the Next.js app already needs. This is a developer decision like the ones in `architecture.md`'s Tech Stack section; treat it as settled, not something to swap mid-task.

Test files are colocated with the code they test as `*.test.ts` / `*.test.tsx` (e.g., `health-score.ts` → `health-score.test.ts` in the same folder), not gathered into a separate `__tests__/` tree — this matches how the rest of the codebase colocates related code (see File Organization, above).

`architecture.md`'s Agentic build scope table requires the full automated test suite to pass on every Preview build before merge — that gate is only meaningful if the following are actually covered, at minimum:

- **Every pure function in `lib/` that something else depends on for correctness** — `health-score.ts` and `prioritization.ts` especially. The versioning rule in `architecture.md`'s Deterministic Scores section only means something if the formula's actual behavior is pinned by a test, not just described in prose.
- **Every Zod schema in `lib/ai/schemas.ts` and `lib/validators/`** — at minimum, one test that a known-good payload passes and one that a known-bad payload is rejected. These schemas are the literal trust boundary the product depends on — see `AGENTS.md`'s Non-Negotiables.
- **Every server action and route handler's happy path and its failure paths** (`400`/`401`/`403`/`429`) — this is the same checklist `.agents/skills/api-route-scaffolder/SKILL.md` already walks manually; write it as an actual test, not only a manual check before merge.
- **Components**: test behavior (what a user can do, what renders under which prop or state), not implementation details. Skip trivial presentational components with no logic to break.

Mock the Claude API client and Prisma at the boundary (`lib/ai/client.ts`, `lib/db.ts`) for unit tests. Integration tests run against the Preview environment's branched Neon database (see `architecture.md`'s Environments section) — that's what it exists for.

## Async Code

Prefer `async`/`await` over `.then()` chains. It reads better and makes error handling cleaner.

Do not fire off a promise without awaiting it unless you mean to. If you are intentionally running something in the background (e.g., triggering a Vercel Workflow and returning immediately), add a comment saying so.

## Imports

Use the `@/` alias for local imports. `import { SeverityBadge } from '@/components/ui/SeverityBadge'`, not `import { SeverityBadge } from '../../../components/ui/SeverityBadge'`.

Do not import from `app/` into `components/` or `lib/`. Dependencies flow one way: `lib` is the foundation, `components` sits on top of `lib`, and `app` sits on top of both.

## Styling

Tailwind classes only. No inline styles, no CSS modules, no styled-components. Use the CSS custom properties already defined in `tokens/tokens.css` (`bg-[--color-brand-accent]`, `text-[--color-text-secondary]`, `text-[--color-critical]`, etc.) rather than arbitrary values — see `design-system.md` for the full token reference. If a pattern repeats, extract it into a component, not a CSS class.

Class order follows the standard Tailwind convention: layout, then box model, then typography, then visual. The Prettier plugin for Tailwind enforces this.

## What Not to Do

- Do not add Lodash. Modern JavaScript handles most of what people used Lodash for.
- Do not add Moment. Use `date-fns` if you need date handling.
- Do not add a component library (MUI, Chakra, Ant). We build our own with Tailwind and follow `design-system.md`.
- Do not leave `console.log` calls in committed code. Use the logger in `lib/logger.ts`.
- Do not add a dependency that falls below `security.md`'s bar (fewer than a few thousand weekly downloads, or no recent commits) without discussing it with the developer first. Even a dependency that clears that bar is a long-term cost — say why it's needed in the commit/PR body so the cost stays visible, even though it doesn't require stopping to ask first.
- Do not hand-write a type for something that already has a Zod schema — infer it with `z.infer<typeof schema>` instead, so the type and the validator can never drift apart.
