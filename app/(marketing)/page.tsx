import Link from 'next/link';
import {
  LayoutDashboard,
  AlertCircle,
  AlertTriangle,
  MessageSquare,
  Building2,
  FileText,
  Clock,
  Search,
  ScrollText,
  ArrowUpDown,
  CheckCircle2,
  Gauge,
  ArrowRight,
  FileCheck,
  Shield,
  UserCheck,
  type AppIcon,
} from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import { BrandMark } from '@/components/ui/BrandMark';
import { Reveal } from '@/components/marketing/Reveal';
import { cn } from '@/lib/cn';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { ConfidenceTag } from '@/components/ui/ConfidenceTag';
import { CausalChain } from '@/components/issues/CausalChain';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/Accordion';

// Illustrative numbers for the Hero's app-shell preview — a deliberately
// simplified hand-built glimpse, not the real HealthScoreDisplay component,
// so this can drift from the actual UI only in presentation, never in the
// story it tells. Clearly labeled as an example; never presented as a
// visitor's own data. ("See it in action" further down uses a real
// screenshot instead of these numbers — see its own comment.)
const EXAMPLE_HEALTH_SCORE = 79;
const EXAMPLE_HEALTH_COMPONENTS = {
  delivery: { score: 71 },
  inventory: { score: 88 },
  customer: { score: 64 },
  financial: { score: 91 },
  incident: { score: 79 },
};

// Every answer describes the product as it actually works today — including
// admitting what it doesn't do yet (live integrations, a settled price)
// rather than implying more than what's built.
const FAQ: { question: string; answer: string }[] = [
  {
    question: 'How does my data get into OpsLens?',
    answer:
      'You upload a CSV export of your orders, deliveries, invoices, or complaints. OpsLens suggests how each column maps to the right field, and you confirm the mapping before anything is imported — nothing is guessed silently. There are no live platform integrations yet.',
  },
  {
    question: 'Is my data isolated from other organizations?',
    answer:
      'Yes. Every record belongs to your organization, and every query — including the AI Assistant — is scoped to it, regardless of how a question is phrased. No other workspace can see your data.',
  },
  {
    question: 'Can OpsLens act on my business without me?',
    answer:
      'No. Accepting, modifying, rejecting, or dismissing a recommendation is always your call. If new data later suggests something different, OpsLens raises it as a new, separate issue for you to review — it never quietly overrides a decision you’ve already made.',
  },
  {
    question: 'What does it cost?',
    answer: 'Create a free workspace to get started with your own data.',
  },
];

// The one publicly reachable page in the app — see architecture.md's
// Authentication section. Every claim below describes something that
// actually exists in the product today; no invented pricing (never decided
// anywhere in the doc set), no fabricated testimonials or customer logos.
// Icons in the feature grid deliberately match NavSidebar's icons for the
// same feature, so what a visitor is promised here is what they'll
// literally see in the product — the small mockup under each description
// extends that same discipline: every one reuses a real component
// (SeverityBadge, ConfidenceTag, CausalChain) or the real token/label
// conventions from the page it's illustrating (e.g. the Report page's
// Observed/AI-prediction distinction), never an invented visual.
//
// Illustrative numbers, deliberately distinct from the Hero's example
// (score 79) above this section, so the two don't read as a copy-paste of
// the same scenario.
const FEATURES: {
  icon: AppIcon;
  title: string;
  body: string;
  mockup: React.ReactNode;
}[] = [
  {
    icon: LayoutDashboard,
    title: 'Morning Brief',
    body: 'Health Score, what’s trending wrong, and the one thing to look at first — before you’ve had coffee.',
    mockup: (
      <div className="flex flex-col gap-(--space-2) rounded-(--radius-md) border border-(--color-border-subtle) bg-(--color-surface-base) p-(--space-3)">
        <div className="flex items-baseline gap-(--space-1)">
          <span className="tabular-nums text-(--color-text-primary) [font:var(--font-h2)]">
            71
          </span>
          <span className="text-(--color-text-tertiary) [font:var(--font-caption)]">
            / 100 · Operational Health
          </span>
        </div>
        <div className="flex gap-(--space-4)">
          <div className="flex flex-col">
            <span className="text-(--color-text-tertiary) [font:var(--font-caption)]">
              Delivery
            </span>
            <span className="tabular-nums text-(--color-high) [font:var(--font-h3)]">
              68
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-(--color-text-tertiary) [font:var(--font-caption)]">
              Inventory
            </span>
            <span className="tabular-nums text-(--color-success) [font:var(--font-h3)]">
              90
            </span>
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: AlertCircle,
    title: 'Issues & root cause',
    body: 'Not just “what broke” — the evidence and likely cause behind it, hedged honestly.',
    mockup: (
      <div className="flex flex-col gap-(--space-2) rounded-(--radius-md) border border-(--color-border-subtle) bg-(--color-surface-base) p-(--space-3)">
        <div className="flex items-center gap-(--space-2)">
          <SeverityBadge severity="High" />
          <ConfidenceTag confidence="Medium" />
        </div>
        <CausalChain
          outcome="Delivery delays trending upward"
          factors={[
            { id: 'f1', description: "Supplier A's response time slowed" },
          ]}
          className="flex flex-col gap-(--space-1)"
        />
      </div>
    ),
  },
  {
    icon: MessageSquare,
    title: 'AI Assistant',
    body: 'Ask it anything about your operations. It answers from your real data, or says when it can’t.',
    mockup: (
      <div className="flex flex-col gap-(--space-2) rounded-(--radius-md) border border-(--color-border-subtle) bg-(--color-surface-base) p-(--space-3)">
        <span className="self-end rounded-(--radius-md) bg-(--color-surface-elevated) px-(--space-3) py-(--space-1-5) text-(--color-text-primary) [font:var(--font-caption)]">
          Why are deliveries late?
        </span>
        <p className="text-(--color-text-primary) [font:var(--font-caption)]">
          Likely tied to Supplier A&apos;s recent slowdown.
        </p>
        <div className="rounded-(--radius-sm) border border-(--color-border-subtle) bg-(--color-surface-elevated) px-(--space-2) py-(--space-1-5)">
          <p className="text-(--color-brand-accent) uppercase [font:var(--font-label)]">
            Evidence
          </p>
          <p className="text-(--color-text-tertiary) [font:var(--font-caption)]">
            14 delays in 30 days, up from 6.
          </p>
        </div>
      </div>
    ),
  },
  {
    icon: Building2,
    title: 'Department views',
    body: 'Finance, Inventory, Logistics, Customer — the same issues, filtered to what each team owns.',
    mockup: (
      <div className="flex flex-col gap-(--space-2) rounded-(--radius-md) border border-(--color-border-subtle) bg-(--color-surface-base) p-(--space-3)">
        <div className="flex gap-(--space-3)">
          <span className="text-(--color-brand-accent) [font:var(--font-label)]">
            Finance
          </span>
          <span className="text-(--color-text-tertiary) [font:var(--font-label)]">
            Inventory
          </span>
          <span className="text-(--color-text-tertiary) [font:var(--font-label)]">
            Logistics
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-(--color-text-tertiary) [font:var(--font-caption)]">
            Outstanding invoices
          </span>
          <span className="tabular-nums text-(--color-text-primary) [font:var(--font-h3)]">
            4
          </span>
        </div>
      </div>
    ),
  },
  {
    icon: FileText,
    title: 'Weekly reports',
    body: 'What changed this week versus what’s a prediction — never blurred together.',
    mockup: (
      <div className="flex flex-col gap-(--space-1-5) rounded-(--radius-md) border border-(--color-border-subtle) bg-(--color-surface-base) p-(--space-3)">
        <div className="flex items-center justify-between gap-(--space-2)">
          <span className="text-(--color-text-secondary) [font:var(--font-caption)]">
            Complaints held steady this week.
          </span>
          <span className="shrink-0 text-(--color-text-tertiary) [font:var(--font-caption)]">
            Observed
          </span>
        </div>
        <div className="flex items-center justify-between gap-(--space-2)">
          <span className="text-(--color-text-secondary) [font:var(--font-caption)]">
            Risk may rise if delays continue.
          </span>
          <span className="shrink-0 text-(--color-brand-accent) [font:var(--font-caption)]">
            AI prediction
          </span>
        </div>
      </div>
    ),
  },
  {
    icon: Clock,
    title: 'Timeline',
    body: 'A cluster of related problems reads as the one problem it actually is — not a wall of log lines.',
    mockup: (
      <div className="flex flex-col rounded-(--radius-md) border border-(--color-border-subtle) bg-(--color-surface-base) p-(--space-3)">
        <div className="flex gap-(--space-2)">
          <div className="flex flex-col items-center">
            <span className="h-(--space-1-5) w-(--space-1-5) shrink-0 rounded-(--radius-full) border-2 border-(--color-brand-accent)" />
            <span className="w-px flex-1 bg-(--color-border-strong)" />
          </div>
          <div className="flex items-center gap-(--space-1-5) pb-(--space-2)">
            <SeverityBadge severity="High" />
            <span className="text-(--color-text-secondary) [font:var(--font-caption)]">
              Supplier delay reported
            </span>
          </div>
        </div>
        <div className="flex gap-(--space-2)">
          <span className="h-(--space-1-5) w-(--space-1-5) shrink-0 rounded-(--radius-full) border-2 border-(--color-brand-accent)" />
          <div className="flex items-center gap-(--space-1-5)">
            <SeverityBadge severity="High" />
            <span className="text-(--color-text-secondary) [font:var(--font-caption)]">
              Delivery delayed
            </span>
          </div>
        </div>
      </div>
    ),
  },
];

// The signal chain — replaces the old separate PROBLEM_STATEMENTS and
// HOW_IT_WORKS_STEPS arrays, which drove two visually-different sections
// that told structurally the same "here's a list" story back to back. Same
// real four problem sentences (minus the closing "by the time the dots
// connect" line, now paraphrased in the pivot copy instead of repeated
// verbatim) and the same real four-step loop, as one narrative unit.
// `title` on each cause is new — a short, non-fabricated label (not a new
// claim, just a compressed name for the same sentence) needed once causes
// render as flow-diagram nodes alongside the loop's own title+body shape.
const SIGNAL_CHAIN = {
  causes: [
    {
      title: 'Supplier delay',
      body: 'A supplier’s shipment slips a few days, and nobody notices until inventory runs out.',
    },
    {
      title: 'Late delivery',
      body: 'Deliveries start arriving late, and the first sign is an angry email, not a dashboard.',
    },
    {
      title: 'Unpaid invoices',
      body: 'Invoices go unpaid for weeks before anyone adds up how much is actually at risk.',
    },
  ],
  loop: [
    {
      title: 'Detect',
      body: 'Watches orders, deliveries, invoices, and complaints for what actually changed.',
      icon: Search,
    },
    {
      title: 'Explain',
      body: 'Every finding comes with the real evidence behind it, in plain language.',
      icon: ScrollText,
    },
    {
      title: 'Prioritize',
      body: 'Ranked by real impact — severity, urgency, confidence — not by how loud it is.',
      icon: ArrowUpDown,
    },
    {
      title: 'Decide',
      body: 'You choose what happens next. Nothing acts on your business without you.',
      icon: CheckCircle2,
    },
  ] satisfies { title: string; body: string; icon: AppIcon }[],
};

// The real guarantees previously stated as one dense paragraph under "An AI
// you can actually check" — same claims, restructured into scannable chips
// so trust reads with the same visual confidence as a feature claim. Icons
// match each guarantee's actual meaning (a document-check for evidence, a
// gauge for confidence, a shield for isolation, a person-check for
// human-decided) rather than being interchangeable filler — Gauge is the
// same icon WHO_ITS_FOR already uses for "Founder," reused deliberately.
const TRUST_GUARANTEES = [
  {
    title: 'Evidence-linked',
    body: 'Every conclusion cites the real data row it came from.',
    icon: FileCheck,
  },
  {
    title: 'Confidence, always shown',
    body: 'Including an honest "not enough evidence yet" when it applies.',
    icon: Gauge,
  },
  {
    title: 'Tenant-isolated',
    body: 'Every query, including the AI Assistant, is scoped to your org only.',
    icon: Shield,
  },
  {
    title: 'Human-decided',
    body: 'No recommendation applies itself. Your decision is never silently overwritten.',
    icon: UserCheck,
  },
] satisfies { title: string; body: string; icon: AppIcon }[];

// Each role gets its own real, specific claim instead of one shared
// paragraph — the three used to read as interchangeable job titles under
// identical copy, which is what made the section feel like an afterthought.
// Icons deliberately echo real features shown earlier on the page
// (LayoutDashboard -> Morning Brief, Building2 -> Department views) rather
// than being decorative — a callback to something the visitor already saw,
// not a new visual language. No photography: OpsLens has no real customers
// to photograph honestly, and stock photos of "an operations manager" would
// be exactly the generic look this redesign has avoided everywhere else.
const WHO_ITS_FOR: { role: string; body: string; icon: AppIcon }[] = [
  {
    role: 'Operations manager',
    body: 'Starts every day on the Morning Brief.',
    icon: LayoutDashboard,
  },
  {
    role: 'Founder running fulfillment',
    body: 'One number to check before anything else: the Health Score.',
    icon: Gauge,
  },
  {
    role: 'Supply chain lead',
    body: 'The Logistics department view — not another spreadsheet to maintain.',
    icon: Building2,
  },
];

// Shared hover feedback for every card-shaped element below the hero — see
// design-system.md's Motion section's marketing-page exception. One class
// string, not repeated inline, so the lift stays identical everywhere it
// appears; motion-reduce turns the transform off, not just slows it.
const CARD_HOVER =
  'transition-transform duration-300 motion-reduce:transition-none hover:-translate-y-1 motion-reduce:hover:translate-y-0';

// A plain helper, not a direct new Date() call inside the component body —
// React's purity lint flags the latter as an impure render-time call. See
// lib/date-range.ts's daysAgo for the same fix applied earlier.
function currentYear() {
  return new Date().getFullYear();
}

export default function MarketingHomePage() {
  return (
    <main className="flex flex-col">
      {/* Hero — developer-approved "Option A1" from the hero-layout preview
          round: centered copy, then a real-feeling app-shell preview below
          the buttons that fades into the page instead of being hard-cropped
          (see the fade div's comment below). Uses EXAMPLE_HEALTH_COMPONENTS,
          a hand-built illustrative shell — deliberately not the real
          screenshot "See it in action" uses further down, since the hero
          needs a controlled, always-best-foot-forward moment rather than
          whatever the demo data happens to show. */}
      <section className="relative overflow-hidden px-(--space-4) pt-(--space-24)">
        {/* A soft dot grid, not a literal drafting-grid — dots (not full
            lines) tinted with the brand-accent color, faded out via a
            radial mask so it reads as quiet texture behind the headline
            rather than a hard-edged pattern competing with it. No new
            colors: same --color-brand-accent used for the eyebrow border
            above. Inline style rather than Tailwind utilities since neither
            a two-layer background-image nor a mask-image has a token-based
            utility class here.

            The mask uses a fixed-pixel circle, not percentages — this
            section's real height includes the app-shell mockup below the
            fold, so a percentage-sized ellipse (looked right in an
            isolated preview) ended up scaling to that full height and
            barely faded at all by the time it reached the mockup. A fixed
            circle centered on the headline stays the same regardless of
            how tall the mockup underneath happens to be. Radius widened
            from an original 420px to 750px — on wide viewports the
            texture was fading out well before reaching the empty bands on
            either side of the headline, leaving them flat and empty
            instead of quietly textured. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(color-mix(in srgb, var(--color-brand-accent) 35%, transparent) 1px, transparent 1.5px)',
            backgroundSize: '26px 26px',
            WebkitMaskImage:
              'radial-gradient(circle 750px at 50% 180px, black 20%, transparent 75%)',
            maskImage:
              'radial-gradient(circle 750px at 50% 180px, black 20%, transparent 75%)',
          }}
        />
        <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-(--space-5) text-center">
          <span className="inline-flex items-center gap-(--space-1-5) rounded-(--radius-full) border border-(--color-brand-accent) bg-(--color-brand-tint-medium) px-(--space-3) py-(--space-1) text-(--color-brand-accent) [font:var(--font-label)]">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 animate-pulse rounded-(--radius-full) bg-(--color-success) motion-reduce:animate-none"
            />
            Now with AI Assistant &amp; Weekly Reports
          </span>
          <h1 className="max-w-3xl [font:var(--font-display)] sm:[font:var(--font-display-lg)]">
            If it&apos;s costing you money, your data already knows.
          </h1>
          <p className="max-w-2xl text-(--color-text-secondary) [font:var(--font-body)]">
            OpsLens is the morning brief for e-commerce and logistics
            operators — every issue traced to real evidence, ranked by what
            actually matters, and never acted on without you.
          </p>
          <div className="flex flex-wrap justify-center gap-(--space-3)">
            <Link href="/signup">
              <Button size="lg">Create your workspace</Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="lg">
                Sign in
              </Button>
            </Link>
          </div>
          <p className="text-(--color-text-tertiary) [font:var(--font-caption)]">
            No credit card. See your own data in minutes.
          </p>
        </div>

        {/* Illustrative app-shell preview, not a real screenshot — a
            deliberately simplified glimpse (icons stand in for real nav
            links), kept intentionally distinct from the real screenshot
            "See it in action" shows below, so the two sections don't repeat
            themselves. */}
        <div className="mx-auto mt-(--space-10) max-w-4xl px-(--space-6) sm:px-(--space-10)">
          {/* The fade is scoped to this shot-only wrapper (not the caption
              below it) — it was previously a sibling of the caption inside
              one shared wrapper, which put "bottom: 0" at the bottom of the
              caption text instead of the shot, fading the caption itself
              into near-illegibility. Found via an actual screenshot, not
              assumed. */}
          <div className="relative">
            {/* Floats the same Health Score already shown inline below onto
                the mockup's corner — a second, immediate read before a
                visitor's eyes reach the shot itself. Purely decorative
                (duplicates real content a few lines down), so hidden from
                assistive tech rather than announced twice. */}
            <div
              aria-hidden="true"
              className="absolute -top-3 -right-2 z-10 flex items-baseline gap-(--space-1-5) rounded-(--radius-md) border border-(--color-brand-accent) bg-(--color-surface-elevated) px-(--space-3) py-(--space-2) shadow-lg"
            >
              <span className="tabular-nums text-(--color-text-primary) [font:var(--font-h2)]">
                {EXAMPLE_HEALTH_SCORE}
              </span>
              <span className="leading-tight text-(--color-brand-accent) uppercase [font:var(--font-caption)]">
                Health
                <br />
                score
              </span>
            </div>
            <div className="overflow-hidden rounded-t-(--radius-lg) border border-(--color-border-subtle) text-left shadow-2xl">
              <div className="flex">
              <div className="hidden w-16 shrink-0 flex-col items-center gap-(--space-4) border-r border-(--color-border-subtle) bg-(--color-surface-base) py-(--space-4) sm:flex">
                <span className="flex h-(--space-8) w-(--space-8) items-center justify-center rounded-(--radius-full) border border-(--color-brand-accent) bg-(--color-brand-tint-medium)">
                  <LayoutDashboard
                    size={15}
                    aria-hidden="true"
                    className="text-(--color-brand-accent)"
                  />
                </span>
                <AlertCircle
                  size={15}
                  aria-hidden="true"
                  className="text-(--color-text-tertiary)"
                />
                <Building2
                  size={15}
                  aria-hidden="true"
                  className="text-(--color-text-tertiary)"
                />
                <Clock
                  size={15}
                  aria-hidden="true"
                  className="text-(--color-text-tertiary)"
                />
              </div>
              <div className="flex-1 bg-(--color-surface-elevated) p-(--space-6)">
                <p className="mb-(--space-4) [font:var(--font-h3)]">
                  Good morning, Sarah.
                </p>
                <div className="grid grid-cols-1 gap-(--space-3) sm:grid-cols-[2fr_1fr]">
                  <div className="rounded-(--radius-md) border border-(--color-border-subtle) bg-(--color-surface-base) p-(--space-4)">
                    <div className="mb-(--space-3) flex items-baseline gap-(--space-1)">
                      <span className="tabular-nums [font:var(--font-h1)]">
                        {EXAMPLE_HEALTH_SCORE}
                      </span>
                      <span className="text-(--color-text-tertiary) [font:var(--font-caption)]">
                        / 100 · Operational Health
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-(--space-4)">
                      <div className="flex flex-col">
                        <span className="text-(--color-text-tertiary) [font:var(--font-caption)]">
                          Delivery
                        </span>
                        <span className="tabular-nums text-(--color-medium) [font:var(--font-h3)]">
                          {EXAMPLE_HEALTH_COMPONENTS.delivery.score}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-(--color-text-tertiary) [font:var(--font-caption)]">
                          Inventory
                        </span>
                        <span className="tabular-nums text-(--color-success) [font:var(--font-h3)]">
                          {EXAMPLE_HEALTH_COMPONENTS.inventory.score}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-(--color-text-tertiary) [font:var(--font-caption)]">
                          Customer
                        </span>
                        <span className="tabular-nums text-(--color-medium) [font:var(--font-h3)]">
                          {EXAMPLE_HEALTH_COMPONENTS.customer.score}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-(--color-text-tertiary) [font:var(--font-caption)]">
                          Financial
                        </span>
                        <span className="tabular-nums text-(--color-success) [font:var(--font-h3)]">
                          {EXAMPLE_HEALTH_COMPONENTS.financial.score}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-(--color-text-tertiary) [font:var(--font-caption)]">
                          Incident
                        </span>
                        <span className="tabular-nums text-(--color-medium) [font:var(--font-h3)]">
                          {EXAMPLE_HEALTH_COMPONENTS.incident.score}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-(--radius-md) border border-(--color-border-subtle) bg-(--color-surface-base) p-(--space-4)">
                    <span className="text-(--color-text-tertiary) [font:var(--font-caption)]">
                      Critical
                    </span>
                    <div className="tabular-nums text-(--color-critical) [font:var(--font-h1)]">
                      1
                    </div>
                  </div>
                </div>
              </div>
              </div>
            </div>
            {/* Fades into the section's own background rather than a hard
                crop — the same color the section actually sits on, not a
                guessed value, so this can never drift out of sync with the
                real surface token. Scoped to this shot-only wrapper, so it
                ends at the shot's own bottom edge, not the caption below. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-(--color-surface-base)"
            />
          </div>
          <p className="pt-(--space-2) text-center text-(--color-text-tertiary) [font:var(--font-caption)]">
            Illustrative — not real data
          </p>
        </div>
      </section>

      {/* The signal chain — rebuilt again as two card rows (3 causes over 4
          loop steps) after the single-row flow diagram, once real content
          made clear a literal connecting line between every card couldn't
          survive the responsive reflow from a 3/4-column grid down to a
          single mobile column — see the "cards, 3 over 4" preview round.
          A labeled bridge ("the loop catches it") replaces the old
          continuous arrow line between the two groups: it does the same
          connective job without needing to draw a line across a layout
          that changes shape at every breakpoint. No arrows between
          individual cards within a row either, for the same reason — the
          shared border color per group (warning for causes, brand-accent
          for the loop) carries that grouping instead, the same convention
          Trust/Features/Who's-for already use. */}
      <section
        id="how-it-works"
        className="scroll-mt-(--space-16) border-t border-(--color-border-subtle) bg-(--color-surface-elevated) px-(--space-4) py-(--space-16)"
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-(--space-8)">
          <Reveal className="flex flex-col items-center gap-(--space-2) text-center">
            <span className="text-(--color-text-tertiary) uppercase [font:var(--font-label)]">
              From blind spot to decision
            </span>
            <h2 className="[font:var(--font-h1)]">
              Here&apos;s the pattern. Here&apos;s what catches it before it
              costs you.
            </h2>
            <p className="text-(--color-text-tertiary) [font:var(--font-caption)]">
              Runs automatically, every morning.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 gap-(--space-4) sm:grid-cols-3">
            {SIGNAL_CHAIN.causes.map((cause, i) => (
              <Reveal
                key={cause.title}
                delayMs={i * 80}
                className={cn(
                  'rounded-(--radius-lg) border border-(--color-border-strong) bg-(--color-surface-base) p-(--space-5) hover:border-(--color-high)',
                  CARD_HOVER,
                )}
              >
                <span
                  aria-hidden="true"
                  className="mb-(--space-3) flex h-(--space-9) w-(--space-9) items-center justify-center rounded-(--radius-full) border-2 border-(--color-high)"
                >
                  <AlertTriangle
                    size={16}
                    aria-hidden="true"
                    className="text-(--color-high)"
                  />
                </span>
                <p className="text-(--color-high) uppercase [font:var(--font-label)]">
                  {cause.title}
                </p>
                <p className="mt-(--space-1) text-(--color-text-secondary) [font:var(--font-body)]">
                  {cause.body}
                </p>
              </Reveal>
            ))}
          </div>

          <div className="flex items-center justify-center gap-(--space-3)">
            <span
              aria-hidden="true"
              className="h-px w-16 bg-gradient-to-r from-transparent to-(--color-border-strong) sm:w-24"
            />
            <span className="flex items-center gap-(--space-1-5) rounded-(--radius-full) border border-dashed border-(--color-border-strong) px-(--space-3) py-(--space-1-5) text-(--color-text-tertiary) [font:var(--font-caption)]">
              <ArrowRight
                size={13}
                aria-hidden="true"
                className="rotate-90 text-(--color-brand-accent)"
              />
              the loop catches it
            </span>
            <span
              aria-hidden="true"
              className="h-px w-16 bg-gradient-to-l from-transparent to-(--color-brand-accent) sm:w-24"
            />
          </div>

          <div className="grid grid-cols-1 gap-(--space-4) sm:grid-cols-2 lg:grid-cols-4">
            {SIGNAL_CHAIN.loop.map((step, i) => {
              const Icon = step.icon;
              return (
                <Reveal
                  key={step.title}
                  delayMs={i * 80}
                  className={cn(
                    'rounded-(--radius-lg) border border-(--color-brand-accent) bg-(--color-surface-base) p-(--space-5)',
                    CARD_HOVER,
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="mb-(--space-3) flex h-(--space-9) w-(--space-9) items-center justify-center rounded-(--radius-full) border-2 border-(--color-brand-accent)"
                  >
                    <Icon
                      size={16}
                      aria-hidden="true"
                      className="text-(--color-brand-accent)"
                    />
                  </span>
                  <p className="text-(--color-brand-accent) uppercase [font:var(--font-label)]">
                    {step.title}
                  </p>
                  <p className="mt-(--space-1) text-(--color-text-secondary) [font:var(--font-body)]">
                    {step.body}
                  </p>
                </Reveal>
              );
            })}
          </div>

          <p className="text-center text-(--color-text-tertiary) italic [font:var(--font-caption)]">
            A fifth step — telling you whether a decision actually worked —
            is in progress, not live yet.
          </p>
        </div>
      </section>

      {/* Trust & evidence — same real guarantees as before, restructured
          from one dense paragraph into four scannable chips so this reads
          with the same confidence as a feature claim, not footnote text.
          Elevated section background (cards flip to base for contrast, the
          same reversal Signal chain and "Who it's for" already use) breaks
          up what was otherwise three flat, identically-toned sections in a
          row (Trust / See it in action / Features) — see the reaudit round.
          Icons on each card match Features/Who it's for/Signal chain's own
          tint-circle pattern, the one card-grid section that didn't have it
          yet. */}
      <section className="border-t border-(--color-border-subtle) bg-(--color-surface-elevated) px-(--space-4) py-(--space-16)">
        <div className="mx-auto flex max-w-3xl flex-col gap-(--space-8)">
          <Reveal className="flex flex-col items-center gap-(--space-2) text-center">
            <span className="text-(--color-text-tertiary) uppercase [font:var(--font-label)]">
              Why you can trust it
            </span>
            <h2 className="[font:var(--font-h1)]">
              Nothing here asks you to take our word for it.
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 gap-(--space-4) sm:grid-cols-2">
            {TRUST_GUARANTEES.map(({ title, body, icon: Icon }, i) => (
              <Reveal
                key={title}
                delayMs={i * 80}
                className={cn(
                  'rounded-(--radius-lg) border border-(--color-border-subtle) bg-(--color-surface-base) p-(--space-5)',
                  CARD_HOVER,
                )}
              >
                <span className="mb-(--space-3) flex h-(--space-8) w-(--space-8) items-center justify-center rounded-(--radius-full) bg-(--color-brand-tint-medium)">
                  <Icon
                    size={16}
                    aria-hidden="true"
                    className="text-(--color-brand-accent)"
                  />
                </span>
                <h3 className="[font:var(--font-h3)]">{title}</h3>
                <p className="mt-(--space-1) text-(--color-text-secondary) [font:var(--font-body)]">
                  {body}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* See it in action — a real screenshot, not illustrative components.
          Wider column (max-w-5xl vs. the page's usual max-w-3xl) because a
          real /overview capture carries a full sidebar plus content that's
          unreadable at the narrower width. The demo org's one seeded issue
          (Supplier A delivery delays) is kept in its active "Detected"
          state specifically so this screenshot always shows a genuine AI
          Recommendation rather than an empty state — see prisma/seed.ts.

          Two exports, not one: the full 1440px capture is unreadable once
          shrunk to a phone-width column (everything but the Health Score
          number turns to smudge), so below sm a second image — the same
          real screenshot, cropped to just the content column and zoomed on
          Health Score + Recommendation — takes over instead. Still the real
          capture either way, so the caption never has to change between
          breakpoints. Re-export both whenever the dashboard's real output
          changes (see the mobile-legibility preview round for the
          alternatives this was chosen over). */}
      <section className="px-(--space-4) py-(--space-16)">
        <div className="mx-auto flex max-w-5xl flex-col gap-(--space-6)">
          <Reveal className="flex flex-col items-center gap-(--space-2) text-center">
            <h2 className="[font:var(--font-h1)]">See it in action</h2>
            <p className="text-(--color-text-tertiary) [font:var(--font-caption)]">
              A real screenshot from the demo workspace — not your data
            </p>
          </Reveal>
          <Reveal delayMs={80}>
            <img
              src="/marketing/overview-active-recommendation-mobile.png"
              alt="The OpsLens Overview dashboard showing a real Health Score, risk breakdown, and an active AI Recommendation for a Supplier A delivery delay"
              width={1050}
              height={520}
              className="w-full rounded-(--radius-lg) border border-(--color-border-subtle) shadow-2xl sm:hidden"
            />
            <img
              src="/marketing/overview-active-recommendation.png"
              alt="The OpsLens Overview dashboard showing a real Health Score, risk breakdown, and an active AI Recommendation for a Supplier A delivery delay"
              width={1440}
              height={720}
              className="hidden w-full rounded-(--radius-lg) border border-(--color-border-subtle) shadow-2xl sm:block"
            />
          </Reveal>
        </div>
      </section>

      {/* Feature grid — individually floating cards, matching the same
          spaced/elevated card language Trust and Who's-for already use
          elsewhere on the page. Previously a single seamless bordered grid
          with hairline dividers between cells; reversed after a design
          pass flagged it as the one section using its own distinct visual
          grammar instead of the card style established everywhere else —
          see the "What you get" layout preview round. */}
      <section
        id="features"
        className="scroll-mt-(--space-16) border-t border-(--color-border-subtle) px-(--space-4) py-(--space-16)"
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-(--space-8)">
          <Reveal className="flex flex-col items-center gap-(--space-2) text-center">
            <span className="text-(--color-text-tertiary) uppercase [font:var(--font-label)]">
              What you get
            </span>
            <h2 className="[font:var(--font-h1)]">
              Six screens. One loop underneath.
            </h2>
            <p className="text-(--color-text-tertiary) [font:var(--font-caption)]">
              Illustrative — not real data
            </p>
          </Reveal>
          <div className="grid grid-cols-1 gap-(--space-4) lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body, mockup }, i) => (
              <Reveal
                key={title}
                delayMs={(i % 3) * 80}
                className={cn(
                  'flex flex-col gap-(--space-3) rounded-(--radius-lg) border border-(--color-border-subtle) bg-(--color-surface-elevated) p-(--space-6)',
                  CARD_HOVER,
                )}
              >
                <span className="flex h-(--space-8) w-(--space-8) items-center justify-center rounded-(--radius-full) bg-(--color-brand-tint-medium)">
                  <Icon
                    size={16}
                    className="text-(--color-brand-accent)"
                    aria-hidden="true"
                  />
                </span>
                <h3 className="[font:var(--font-h3)]">{title}</h3>
                <p className="text-(--color-text-secondary) [font:var(--font-body)]">
                  {body}
                </p>
                <div className="mt-auto pt-(--space-2)">{mockup}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for — three cards, each with its own real claim, rather
          than one shared paragraph over three interchangeable pills (the
          three roles used to read identically; see WHO_ITS_FOR's comment).
          Cards read left-aligned like a real feature card, unlike the
          centered-pill treatment they replace. */}
      <section className="border-t border-(--color-border-subtle) bg-(--color-surface-elevated) px-(--space-4) py-(--space-16)">
        <div className="mx-auto flex max-w-4xl flex-col gap-(--space-8)">
          <Reveal className="flex flex-col items-center gap-(--space-3) text-center">
            <span className="text-(--color-text-tertiary) uppercase [font:var(--font-label)]">
              Who it&apos;s for
            </span>
            <h2 className="[font:var(--font-h1)]">
              Built for operators, not analysts
            </h2>
            <p className="max-w-lg text-(--color-text-secondary) [font:var(--font-body)]">
              If you&apos;re running — or watching over — an e-commerce or
              logistics operation, OpsLens is built to be the first thing you
              check, not another dashboard you have to interpret yourself.
            </p>
          </Reveal>
          <div className="grid grid-cols-1 gap-(--space-4) sm:grid-cols-3">
            {WHO_ITS_FOR.map(({ role, body, icon: Icon }, i) => (
              <Reveal
                key={role}
                delayMs={i * 80}
                className={cn(
                  'rounded-(--radius-lg) border border-(--color-border-subtle) bg-(--color-surface-base) p-(--space-5)',
                  CARD_HOVER,
                )}
              >
                <span className="mb-(--space-3) flex h-(--space-8) w-(--space-8) items-center justify-center rounded-(--radius-full) bg-(--color-brand-tint-medium)">
                  <Icon
                    size={16}
                    aria-hidden="true"
                    className="text-(--color-brand-accent)"
                  />
                </span>
                <p className="[font:var(--font-body-emphasis)]">{role}</p>
                <p className="mt-(--space-1) text-(--color-text-secondary) [font:var(--font-body)]">
                  {body}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ — base, not elevated, so it doesn't blend into "Who it's for"
          right before it (both elevated would leave only the border to
          separate two otherwise-identical sections). Collapsible now
          (Radix Accordion, re-skinned) rather than always fully expanded —
          same four real questions and answers, no copy change. */}
      <section
        id="faq"
        className="scroll-mt-(--space-16) border-t border-(--color-border-subtle) px-(--space-4) py-(--space-16)"
      >
        <div className="mx-auto flex max-w-2xl flex-col gap-(--space-6)">
          <Reveal className="flex flex-col items-center gap-(--space-2) text-center">
            <span className="text-(--color-text-tertiary) uppercase [font:var(--font-label)]">
              Common questions
            </span>
            <h2 className="[font:var(--font-h1)]">Straight answers</h2>
          </Reveal>
          {/* Each question is its own standalone card rather than one
              continuously-divided list — the open item fills with
              --color-brand-solid and flips to white text, the same
              text-on-brand-fill treatment already used on the closing CTA
              section below. Developer-approved reference layout. */}
          <Reveal delayMs={80}>
            <Accordion
              type="single"
              collapsible
              className="flex flex-col gap-(--space-3)"
            >
              {FAQ.map(({ question, answer }) => (
                <AccordionItem
                  key={question}
                  value={question}
                  className="rounded-(--radius-lg) border border-(--color-border-subtle) bg-(--color-surface-elevated) px-(--space-5) data-[state=open]:border-(--color-brand-solid) data-[state=open]:bg-(--color-brand-solid)"
                >
                  <AccordionTrigger
                    className="[[data-state=open]_&]:text-white"
                    iconClassName="[[data-state=open]_&]:border-white/60 [[data-state=open]_&]:text-white"
                  >
                    {question}
                  </AccordionTrigger>
                  <AccordionContent className="text-(--color-text-secondary) [font:var(--font-body)] [[data-state=open]_&]:text-white/85">
                    {answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </section>

      {/* Closing CTA — the one approved use of --gradient-cta (see
          design-system.md's Button section): the single highest-intent
          action on the page. Buttons invert to white-on-transparent here
          only, via className override rather than a new Button variant,
          since this token is scoped to exactly this one section — "white"/
          "transparent" as literal values already matches Button.tsx's own
          primary variant (text-white on bg-(--color-brand-solid)), not a
          new pattern. Headline bookends the hero's own opening line ("If
          it's costing you money, your data already knows") instead of
          introducing a disconnected new idea this late in the page. No
          trust-strip repeat here — those numbers already got their full
          treatment in the Trust section earlier on the page, and "No
          credit card..." right above already does this section's own
          reassurance job; a second, compressed reminder just before the
          buttons would have competed with the actual decision instead of
          helping it. */}
      <section className="border-t border-(--color-border-subtle) px-(--space-4) py-(--space-20) text-center [background:var(--gradient-cta)]">
        <Reveal className="mx-auto flex max-w-2xl flex-col items-center gap-(--space-4)">
          <h2 className="max-w-lg text-white [font:var(--font-h1)]">
            Your data already knows. Go see what it&apos;s saying.
          </h2>
          <p className="max-w-sm text-white/85 [font:var(--font-body)]">
            Every day without it is one more blind spot compounding.
          </p>
          <div className="flex flex-wrap justify-center gap-(--space-3)">
            <Link href="/signup">
              <Button
                size="lg"
                className="bg-white text-(--color-brand-solid) hover:bg-(--color-surface-elevated)"
              >
                Create your workspace
              </Button>
            </Link>
            <Link href="/login">
              <Button
                variant="secondary"
                size="lg"
                className="border-white bg-transparent text-white hover:bg-white/10"
              >
                Sign in
              </Button>
            </Link>
          </div>
          <p className="text-white/65 [font:var(--font-caption)]">
            No credit card. See your own data in minutes.
          </p>
        </Reveal>
      </section>

      {/* Footer — same real destinations as the nav (in-page anchors +
          /login, /signup, /privacy, /terms), not invented routes. This
          route group has no About/Contact/Blog page yet, so the footer
          doesn't link to one. */}
      <footer className="border-t border-(--color-border-subtle) px-(--space-4) py-(--space-8) text-(--color-text-tertiary) [font:var(--font-caption)]">
        <div className="mx-auto flex max-w-4xl flex-col items-start gap-(--space-6) sm:flex-row sm:justify-between">
          <div className="flex flex-col items-start gap-(--space-2)">
            <Link href="/" aria-label="OpsLens home">
              <BrandMark variant="horizontal" tone="color" size={24} />
            </Link>
            {/* Same real positioning line the hero opens with — not a new
                claim invented for the footer. */}
            <p className="max-w-xs text-left">
              The morning brief for e-commerce and logistics operators.
            </p>
          </div>
          <nav
            aria-labelledby="footer-product-heading"
            className="flex flex-col items-start gap-(--space-2)"
          >
            <span
              id="footer-product-heading"
              className="uppercase [font:var(--font-label)]"
            >
              Product
            </span>
            <Link
              href="/#how-it-works"
              className="hover:text-(--color-text-primary)"
            >
              How it works
            </Link>
            <Link
              href="/#features"
              className="hover:text-(--color-text-primary)"
            >
              Features
            </Link>
            <Link href="/#faq" className="hover:text-(--color-text-primary)">
              FAQ
            </Link>
          </nav>
          <nav
            aria-labelledby="footer-account-heading"
            className="flex flex-col items-start gap-(--space-2)"
          >
            <span
              id="footer-account-heading"
              className="uppercase [font:var(--font-label)]"
            >
              Account
            </span>
            <Link href="/login" className="hover:text-(--color-text-primary)">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="hover:text-(--color-text-primary)"
            >
              Get started
            </Link>
          </nav>
          <nav
            aria-labelledby="footer-legal-heading"
            className="flex flex-col items-start gap-(--space-2)"
          >
            <span
              id="footer-legal-heading"
              className="uppercase [font:var(--font-label)]"
            >
              Legal
            </span>
            <Link
              href="/privacy"
              className="hover:text-(--color-text-primary)"
            >
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-(--color-text-primary)">
              Terms
            </Link>
          </nav>
        </div>
        <div className="mx-auto mt-(--space-6) max-w-4xl border-t border-(--color-border-subtle) pt-(--space-4) text-left sm:text-center">
          © {currentYear()} OpsLens
        </div>
      </footer>
    </main>
  );
}
