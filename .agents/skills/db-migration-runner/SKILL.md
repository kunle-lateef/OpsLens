# DB Migration Runner Skill

Load this skill for any task that changes `prisma/schema.prisma`. Do not write a migration from memory or improvise the schema shape — the logical data model below is the source of truth for what the domain looks like, and Prisma's schema must always stay a faithful, versioned implementation of it, never a shortcut around it.

## The Logical Data Model

Field types below are illustrative, not binding to a specific Postgres type — pick the right Prisma type when implementing (`String`, `Int`, `DateTime`, `Json`, etc.), but the field names, relationships, and enum values are fixed — except where a field is explicitly flagged below as not yet defined; those are genuinely open, not just unwritten.

### Organization
| Field | Notes |
|---|---|
| id | PK |
| name, slug, industry, timezone | |
| healthScore | derived, cached, recalculated on relevant change |
| healthScoreAlgorithmVersion | which scoring formula version produced the cached score, so future formula changes don't silently make historical scores incomparable — see `architecture.md`'s Deterministic Scores section |
| planTier | `Free \| Paid` |
| usageQuota | included imports/pipeline runs per current billing cycle |
| usageCount | imports/pipeline runs consumed in the current cycle (checksum-matched reuse does not increment this) |
| billingCycleStart | anchor date for the rolling monthly quota window |
| createdAt / updatedAt | |

### User
| Field | Notes |
|---|---|
| id | PK |
| organizationId | FK → Organization |
| name, email, avatarUrl | |
| passwordHash | **Added during Foundation implementation, not in the original sketch.** Auth.js needs a Credentials provider (OAuth/magic-link were the only alternatives, and neither is decided anywhere else in this doc set); a password needs somewhere to live. Hashed with Node's built-in `crypto.scrypt`, never a plaintext or reversibly-encrypted value — see `security.md`'s Authentication section. Confirm with the developer if OAuth or passwordless was actually intended instead; this field is easy to leave unused but harder to retrofit blind. |
| roleId | FK → Role |
| status | active / deactivated — exact enum not yet defined, confirm with developer |
| createdAt / updatedAt | |

### Role
| Field | Notes |
|---|---|
| id, organizationId | |
| name | `Owner \| Admin \| Manager \| Analyst \| Viewer` — fixed set for MVP |
| permissions | JSON — granular permission flags, extensible without a schema change |
| createdAt / updatedAt | |

### DataSource
| Field | Notes |
|---|---|
| id, organizationId | |
| name, type, status, configuration, lastSyncedAt | `type`: `CSV \| SPREADSHEET \| CRM \| INVENTORY \| FINANCE \| LOGISTICS \| SUPPORT \| API` — this is the long-term domain vocabulary, not an MVP feature list; `AGENTS.md`'s Non-Negotiables put native ERP/CRM connectors beyond CSV upload out of scope without the developer's explicit sign-off, so only `CSV` (and `SPREADSHEET`, if actually built) should be reachable through the product today even though the other values exist in the enum |
| createdAt / updatedAt | |

### DataImport
| Field | Notes |
|---|---|
| id, organizationId, dataSourceId | |
| fileName | |
| fileUrl | **Added during Phase 2 implementation, not in the original sketch.** The Vercel Blob URL the ingestion workflow re-fetches content from — steps are isolated, stateless invocations (see the Workflow SDK docs), so the parsed file content from one step isn't available in the next without refetching it from somewhere durable. |
| checksum | dedupe/integrity — this is what the pipeline's cost-reuse logic matches on (see `architecture.md`'s AI Processing section); not in the original entity sketch, added for the same reason `DesignAsset.checksum` exists in comparable systems |
| status | **Implemented using the plausible-default value set this row used to flag as unconfirmed:** `Uploaded \| Validating \| MappingPending \| Processing \| Completed \| PartiallyCompleted \| Failed` (see `lib/types.ts`'s `DATA_IMPORT_STATUSES`). Built because Phase 2 needed a real value to write to the column — still worth a developer sign-off that this is the intended set, since it was originally a guess, not a confirmed spec. |
| recordsDetected, recordsImported, recordsRejected | |
| qualityScore | overall figure — **not yet broken down into named dimensions in this schema.** `design-system.md`'s Color System section names five proposed dimensions (completeness, validity, consistency, uniqueness, freshness) for the UI to render, but nothing here persists a per-dimension score; confirm with the developer whether that needs its own fields/table before building a UI that assumes it exists |
| errorSummary | |
| startedAt, completedAt, createdAt | |

### DataMapping
| Field | Notes |
|---|---|
| id, dataImportId | |
| sourceField, targetEntity, targetField | |
| confidence, confirmedByUser | AI-suggested mappings must never silently overwrite a user-confirmed mapping — the same "nothing is silently rewritten" principle `architecture.md`'s Data Flow section applies to `Insight`/`Issue`/`Recommendation`, extended to this earlier trust boundary |
| createdAt / updatedAt | |

### Customer
| id, organizationId, externalId, name, email, phone, location, segment, status, createdAt, updatedAt |
|---|

### Product
| id, organizationId, externalId, name, sku, category, unitPrice, status, createdAt, updatedAt |
|---|

### Warehouse
| id, organizationId, externalId, name, location, capacity, status, createdAt, updatedAt |
|---|

### Supplier
| id, organizationId, externalId, name, location, status, createdAt, updatedAt |
|---|

### Order
| Field | Notes |
|---|---|
| id, organizationId, externalId | |
| customerId, warehouseId, supplierId | |
| status | exact enum not yet defined — confirm with developer before implementing |
| totalAmount, currency | **Not yet confirmed elsewhere in this doc set:** the working assumption is no automatic FX conversion and currency always displayed alongside any figure, but neither `design-system.md` nor `architecture.md` actually specifies this — confirm with the developer before relying on it, especially before building any cross-organization or cross-currency aggregate (e.g., a multi-currency Health Score input) |
| orderedAt, expectedDeliveryAt, deliveredAt | |
| createdAt / updatedAt | |

### OrderItem
| id, orderId, productId, quantity, unitPrice, createdAt |
|---|

### InventoryItem
| id, organizationId, productId, warehouseId, quantity, reorderThreshold, reservedQuantity, updatedAt |
|---|

### Delivery
| Field | Notes |
|---|---|
| id, organizationId, orderId, warehouseId, supplierId | |
| status | exact enum not yet defined — confirm with developer |
| carrier, dispatchedAt, expectedAt, deliveredAt, failureReason | |
| createdAt / updatedAt | |

### Invoice
| Field | Notes |
|---|---|
| id, organizationId, customerId, externalId | |
| amount, currency, issuedAt, dueAt, paidAt | |
| status | exact enum not yet defined — confirm with developer |
| createdAt / updatedAt | |

### Payment
| id, organizationId, invoiceId, amount, currency, paidAt, method, status, createdAt |
|---|

### Complaint
| id, organizationId, customerId, orderId, category, severity, description, status, createdAt, resolvedAt |
|---|

### OperationalEvent
This is the central operational entity — the normalized unit every downstream `Metric`/`Insight`/`Issue` traces back to.

| Field | Notes |
|---|---|
| id, organizationId | |
| type | **An open, extensible vocabulary, not a fixed Postgres enum.** `DELIVERY_DELAYED`, `INVENTORY_LOW`, `INVOICE_OVERDUE`, `COMPLAINT_CREATED`, `PAYMENT_FAILED`, `WAREHOUSE_BACKLOG`, `SUPPLIER_DELAY`, `ORDER_CANCELLED` are the known examples, but the product's intelligence model is expected to grow this list over time. Store as a validated string (a maintained reference list in `lib/types.ts`, checked by a Zod enum that's easy to extend) rather than a hard database enum that needs a migration for every new event type. |
| entityType, entityId | which table/row this event describes |
| timestamp, severity, value, metadata | |
| groupKey | **Added post-launch, not in the original sketch.** `'order:<id>'` or `'customer:<id>'` — a real, shared foreign key computed once at event-creation time (see `lib/data-import/normalize.ts`), from the actual `Order`/`Customer` row the event is already tied to. Timeline's chain view (see `app/(dashboard)/timeline/page.tsx`) groups strictly on this field and nothing else — no time-proximity heuristic, no AI inference. `DELIVERY_DELAYED`/`ORDER_CANCELLED`/`COMPLAINT_CREATED` use `order:<id>`; `INVOICE_OVERDUE` uses `customer:<id>` since `Invoice` has no `orderId` in this schema. Nullable, and null on any event created before this field existed — those render as ungrouped singletons rather than being retroactively grouped by a guess. |
| sourceId | which `DataImport` or `DataSource` produced this event |
| createdAt | |

Treated as append-only once created — see Special Rules, below.

### Metric
| id, organizationId, name, key, value, unit, periodStart, periodEnd, source, metadata, calculatedAt |
|---|

### Insight
| Field | Notes |
|---|---|
| id, organizationId | |
| type, title, summary | |
| severity | uses `IssueSeverity`'s value set for consistency, even though an `Insight` isn't itself an `Issue` |
| confidence | `ConfidenceLevel`: `High \| Medium \| Low \| InsufficientEvidence` — required at creation, never nullable, see Special Rules |
| impactScore, detectedAt, validFrom, validTo, status | |
| rootCauseNarrative | **Added during Phase 3 implementation, not in the original sketch.** The hedged-language prose from the root-cause explanation AI stage (see `architecture.md`'s AI Processing table, stage 2) — nullable, since it's only populated for an `Insight` whose confidence clears the bar for one. Each individual contributing factor is its own `Evidence` row (`sourceType: 'contributing_factor'`) rather than a field here, so `CausalChain`'s "each node links back to the Evidence it's derived from" (design-system.md) has something real to link to. |
| createdAt / updatedAt | |

### Evidence
| id, insightId, sourceType, sourceId, description, metricValue, comparisonValue, period, relevanceScore, createdAt |
|---|

Required at creation for every `Insight` — see Special Rules, below.

### Issue
| Field | Notes |
|---|---|
| id, organizationId, insightId | See Special Rules, below, for a genuine open question about whether this should be a single FK or a join table. |
| title, description | |
| severity | `IssueSeverity`: `Critical \| High \| Medium \| Low` |
| priorityScore | derived, cached — see `architecture.md`'s Deterministic Scores section |
| priorityAlgorithmVersion | which prioritization formula version produced the cached score — same versioning discipline as `Organization.healthScoreAlgorithmVersion` |
| status | `IssueStatus`: `Detected \| Reviewed \| Acknowledged \| InProgress \| Resolved \| Dismissed` |
| assigneeId | FK → User, optional |
| impactAmount, impactCurrency | **Added post-launch, not in the original sketch.** A structured business-impact figure ("₦1.8M revenue at risk"), both nullable — populated only when it can be computed deterministically from real data, never estimated or fabricated to fill the field. Current implementation (`lib/intelligence/create-issue-from-insight.ts`) only populates this for an Insight whose own Evidence text references invoice/overdue data, summing real `Invoice.amount` rows for the org in the insight's detection window — see `lib/intelligence/estimate-impact.ts`'s `estimateImpactFromInvoices`. Deliberately narrow: it does not (yet) cover delivery-delay or inventory-type issues, since there's no equally reliable structured signal for those today without risking a misattributed figure — those render "Not yet quantified" rather than a guess. Widening this to more issue types is a follow-up, not something to force into this pass by loosening the relevance check. No cross-currency aggregation — see the Order model's `currency` note above; a mix of currencies in one window returns `null` rather than summing incompatible values. |
| detectedAt, acknowledgedAt, resolvedAt | |
| createdAt / updatedAt | |

### Recommendation
| Field | Notes |
|---|---|
| id, organizationId, issueId | |
| title, description, expectedImpact | |
| confidence | `ConfidenceLevel` |
| rationale | |
| status | `RecommendationStatus`: `Pending \| Accepted \| Rejected \| Modified \| Dismissed \| Completed` |
| createdAt / updatedAt | |

A human decision recorded on a `Recommendation` (the transition out of `Pending`) is treated as a first-class audit record — see Special Rules, below.

### AIInteraction
| id, organizationId, userId, sessionId, question, answer, model, context, sources, createdAt |
|---|

Do not store unnecessary sensitive information — see `security.md`'s Logging rules.

### Feedback
| Field | Notes |
|---|---|
| id, organizationId, userId | |
| targetType, targetId | which entity this feedback is about (an `Insight`, `Issue`, `Recommendation`, or `AIInteraction`) |
| type | `FeedbackType`: `Helpful \| NotHelpful \| Incorrect \| MissingContext` |
| comment, createdAt | |

### Notification
| Field | Notes |
|---|---|
| id, organizationId, eventId | |
| severity | `NotificationSeverity`: `Critical \| High \| Medium \| Informational` — a distinct enum from `IssueSeverity`, see `code-style.md` |
| channel | `NotificationChannel`: `InApp \| Email \| SMS \| Push` — SMS/Push are Should-Have, gated by a feature flag rather than absent from the schema. Only `InApp` is actually written today — see `lib/notifications.ts`. |
| message, linkUrl | **Added post-launch, not in the original sketch.** `message` is the notification's own display text; `linkUrl` (nullable) is where clicking it navigates (e.g. `/issues/{id}`). Neither existed on the original row, which had no self-descriptive content to render a list item from. |
| status | **Implemented using the plausible-default value set this row used to flag as unconfirmed:** `Pending \| Sent \| Failed \| Read`. In practice only `Sent`/`Read` are used today, since only the `InApp` channel is wired up — still worth a developer sign-off, since it was originally a guess. |
| createdAt | |

**Read state is organization-wide, not per-user — a deliberate scope-narrowing, not an oversight.** `Notification` has no `userId`/membership table to track per-user read state, and the schema doesn't have multi-user membership modeled at all yet (`User.organizationId` is a single FK — see `OrgSwitcher`'s own note on this same limitation). `markAllNotificationsRead` (see `app/(dashboard)/notifications/actions.ts`) therefore marks a notification read for the whole org the first time anyone opens the panel. If per-user read tracking is wanted later, that's a real schema addition (a `userId` field, or a join table if a user can eventually belong to multiple organizations) — confirm with the developer before building it, rather than assuming this MVP shape extends cleanly.

### AuditLog
| id, organizationId, userId, action, entityType, entityId, previousValue, newValue, metadata, createdAt |
|---|

### Report
**Added during Phase 6 implementation, not in the original entity list.** The master spec's Section 24 (Weekly AI Operations Report) needs somewhere to persist a generated report; nothing in the original entity sketch covers it.

| Field | Notes |
|---|---|
| id, organizationId | |
| type | `ReportType`: `Weekly` — a fixed enum with one value today; sized for `Monthly`/`Custom` later without redesigning the table |
| periodStart, periodEnd | the window the report summarizes |
| content | `Json` — the structured report (biggestWins, biggestRisks, anomalies, predictedRisks, recommendedPriorities — see the master spec's Weekly AI Operations Report section), not a flat text blob, so the UI can render each section distinctly and distinguish historical fact from AI interpretation, per that section's requirement |
| userId | FK → `User`, nullable — who manually triggered this, `null` if this runs on a schedule once one exists; no scheduling mechanism (Vercel Cron or otherwise) is decided yet — confirm with the developer before assuming weekly generation is automatic |
| createdAt | |

### HealthScoreSnapshot
**Added post-launch, not in the original entity list.** Feeds the Health Score trend sparkline on the Morning Brief — before this, the score had no history, only a single current value.

| Field | Notes |
|---|---|
| id, organizationId | |
| overall | The `Organization.healthScore` value at capture time, nullable (an insufficient-data day is still worth recording as "no score," not skipped silently) |
| capturedAt | |

**One row per organization per calendar day, not one per write.** `recomputeHealthScore` (see `lib/health-score.ts`) runs on every Morning Brief page view, not only when the underlying data actually changes (see `lib/morning-brief.ts`) — inserting a snapshot unconditionally on every call would grow this table one row per page view instead of one per day, which would also make the "trend" meaningless (dozens of identical same-day points). `recomputeHealthScore` checks for an existing snapshot captured today for the org and updates it in place instead of inserting a second one. This check-then-write isn't wrapped in a transaction — a rare concurrent double-write would produce two rows for the same day rather than one, a minor cosmetic skew on the sparkline, not a correctness bug worth the added complexity for what this table is used for.

### PasswordResetToken
**Added post-launch, not in the original entity list.** The Credentials provider's `User.passwordHash` (see the User model note above) has no self-service way to change it — there was no forgot-password flow anywhere in the app.

| Field | Notes |
|---|---|
| id, userId | FK → `User`, cascade delete. No `organizationId` — a reset token is never queried across users, so tenant isolation is already covered by the FK, not a separate column. |
| tokenHash | sha256 of the raw token (unique, indexed for lookup) — **not** `lib/password.ts`'s scrypt. A reset token is a 256-bit random value generated by us, not a low-entropy user-chosen secret, so it doesn't need scrypt's deliberate slowness; it does need a lookup that doesn't require re-deriving every outstanding token's hash to find a match, which a per-token salt (scrypt's whole design) would prevent. The raw token itself is only ever held in memory long enough to email it — never persisted. |
| expiresAt | 1 hour from creation (see `lib/password-reset.ts`) |
| usedAt | nullable; set once the token is consumed so it can't be replayed. Requesting a new reset while one is outstanding does not delete the old row — it simply becomes moot once expired or once a newer one is used, since consuming any valid token invalidates the others for that user (see Special Rules below). |
| createdAt | |

### MorningBriefSnapshot
**Added post-launch, not in the original entity list.** Feeds the trend sparklines on the Morning Brief's three risk cards (Critical issues, Overdue invoices, Complaints).

| Field | Notes |
|---|---|
| id, organizationId | |
| key | `'critical_issues' \| 'overdue_invoices' \| 'complaints_7d'` — an open string key, same convention as `OperationalEvent.type`, not a fixed enum, since more risk-card metrics may get trend tracking later |
| value | The metric's value at capture time, nullable |
| capturedAt | |

**Deliberately not `Metric`, despite the similar shape.** `Metric` is read wholesale — unfiltered by key — by both `detect-insights.ts` (AI insight detection) and `assistant-context.ts` (AI Assistant grounding), as real operational data. Writing dashboard-cache/trend-tracking rows into that same table would leak them into what the AI treats as grounded fact about the business. This table exists specifically so dashboard display state and AI input data never share storage. Same one-row-per-organization-per-calendar-day bucketing as `HealthScoreSnapshot`, for the same reason (`getMorningBriefData` runs on every Overview page view) — see `lib/morning-brief-snapshots.ts`.

Important user actions involving `Recommendation` decisions, `Issue` status changes, permission changes, and data imports must produce a row here — `Recommendation`/`Issue` decisions are a direct extension of `AGENTS.md`'s Non-Negotiable #3 (a human decision is never silently overwritten, so it must be durably recorded); permission changes and data imports are this file's own reasonable extension of that same auditability principle, not something Non-Negotiables states explicitly — confirm with the developer if narrower coverage is actually intended.

### Relationships (summary)
```
Organization 1—* User, DataSource, DataImport, Customer, Product,
              Warehouse, Supplier, Order, InventoryItem, Delivery,
              Invoice, Payment, Complaint, OperationalEvent, Metric,
              Insight, Issue, Recommendation, AIInteraction,
              Feedback, Notification, AuditLog, Report,
              HealthScoreSnapshot, MorningBriefSnapshot
User 1—* AIInteraction, Feedback, AuditLog, Report,
          PasswordResetToken                              (via userId)
DataSource 1—* DataImport
DataImport 1—* DataMapping
Customer 1—* Order, Invoice, Complaint
Order 1—* OrderItem, Delivery, Complaint
Product 1—* OrderItem, InventoryItem
Warehouse 1—* Order, InventoryItem, Delivery                (via warehouseId)
Supplier 1—* Order, Delivery                                (via supplierId)
Invoice 1—* Payment
Insight 1—* Evidence
Insight 1—* Issue                                          (see Special Rules — this may need to become many-to-many)
Issue 1—* Recommendation
```

**Design principle:** the schema is stable independent of database technology; `organizationId` and `confidence`/`evidence` fields exist on nearly every entity so tenant isolation and trust state are never implicit.

## Before You Touch the Schema

**Step 1. Cross-check against the model above.** If the field or entity you need already exists there, match it exactly — same name, same enum values. If it doesn't exist there, that's a signal to pause: either the model above needs updating (ask the developer, and update this file once agreed) or the field belongs somewhere else — implementation detail that doesn't need to be in the logical model, like an internal index.

**Step 2. Match naming conventions exactly** (see `code-style.md`):
- Models: `PascalCase` singular — `Organization`, `Issue`, `Insight`, `Recommendation`, `OperationalEvent`.
- Columns: `camelCase` in the Prisma client, mapped from `snake_case` in the database via `@map`.
- Enums match the vocabulary in the logical data model above, exactly — do not invent a synonym. The same word has to mean the same thing in the database, the Zod schema, the API response, and the UI copy.

## Special Rules for This Schema

**`OperationalEvent` is append-only.** It's an immutable historical record. A migration that adds an `UPDATE` or `DELETE` path to existing `OperationalEvent` rows (outside of the corrected-reimport flow described in `architecture.md`'s Data Flow section, which creates a *new* event rather than mutating an old one) is almost certainly wrong — stop and ask the developer before writing it.

**Health Score and priority-score versioning are deliberate, not incidental.** `Organization.healthScoreAlgorithmVersion` and `Issue.priorityAlgorithmVersion` exist specifically so historical scores stay explainable when the underlying formula changes. If a migration changes the shape of data either formula reads, bump the corresponding version field's default/handling — don't just silently change what the number means.

**A `Recommendation`'s decision is a first-class audit record, not a convenience log.** Never write a migration that would allow deleting a `Recommendation` row or overwriting its `status` in the normal application flow once it's left `Pending` — a `Rejected` decision, for instance, is itself the record that matters; it stays, rather than the finding being deleted.

**Confidence and evidence are required, not optional, on every AI-generated entity.** `Insight` needs `confidence` at creation and at least one linked `Evidence` row; `Issue` and `Recommendation` need `confidence` inherited or recomputed, never nullable. A migration that makes one of these nullable "to make seeding easier" is a bug — see `security.md`'s AI Output & Structured Data Trust section for why.

**Consuming a `PasswordResetToken` invalidates the others.** `resetPassword` (see `lib/password-reset.ts`) marks every other unused, unexpired token for that `userId` as used in the same transaction as the password change — a stale reset link from an earlier request must not still work after a newer one succeeded.

**`Issue.insightId` may need to become many-to-many.** The logical model above has a single FK, but `architecture.md`'s AI Processing section describes an `Issue` as potentially synthesizing more than one `Insight` (e.g., a supplier-delay `Insight` and an inventory-shortage `Insight` combining into one `Issue`). This is a genuine, unresolved tension between the two documents — do not silently pick one shape. Ask the developer before the first migration that creates `Issue` rows from more than one `Insight`. **Phase 3's implementation deliberately keeps the single FK** — `lib/intelligence/create-issue-from-insight.ts` creates one `Issue` per qualifying `Insight`, never merges several into one — so this tension is still live, not resolved by precedent; don't treat the shipped code as having settled the question.

## Running the Migration

**Step 1.** Update `prisma/schema.prisma` with the change.

**Step 2.** Run `npx prisma migrate dev --name <descriptive-name>` locally against your dev database (or a Neon branch — see `architecture.md`'s Environments section). Use a name that describes the change, not the ticket number — `add-issue-status-dismissed` not `fix-123`.

**Step 3.** Review the generated SQL in `prisma/migrations/`. Never hand-edit a generated migration file after it's been applied anywhere but your own local machine — if it's wrong, fix the schema and generate a new migration instead.

**Step 4.** If the change affects existing data (a new required column on a table with rows, a renamed column, a changed enum), write the data migration explicitly rather than trusting Prisma's default behavior. A required column with no default on an existing table will fail the migration outright — decide the backfill value deliberately.

**Step 5.** Update the corresponding Zod schema (in `lib/validators/` or `lib/ai/schemas.ts`) in the same commit. A schema change that isn't reflected in the matching Zod validator is a trust-boundary bug waiting to happen — the two must never drift apart.

**Step 6.** Test the migration against a fresh local database, not just an already-migrated one, to catch ordering issues.

## Common Mistakes

- Renaming a column without a data migration, silently losing existing values.
- Dropping a column that still has data referenced elsewhere in the app (check `app/`, `components/`, and `lib/` for usages before dropping anything).
- Making a `confidence` or `Evidence` relationship nullable/optional for convenience.
- Forgetting to update the matching Zod schema, so the app's runtime validation and the database schema silently diverge.
- Writing raw SQL outside of a migration file — see `architecture.md`'s Database Access rules.
- Adding an update/delete path to `OperationalEvent` rows.
- Treating `Issue.insightId` as settled without checking Special Rules, above.

## Resources in This Skill

- None yet. If a seed script or reference migration pattern is added later, it belongs in `resources/` in this folder.
