import { z } from 'zod';

// Zod schemas for each pipeline stage's structured output — see
// architecture.md's AI Processing section. Every piece of AI-generated
// structured output is validated against one of these before it touches
// the database, per security.md's "AI output is never persisted
// unvalidated." A matching hand-maintained JSON schema (for the Claude
// tool_choice call) sits next to each one — keep them in sync; see
// lib/ai/client.ts for why this project isn't pulling in a zod-to-json-schema
// dependency for three call sites.

export const confidenceLevelSchema = z.enum([
  'High',
  'Medium',
  'Low',
  'InsufficientEvidence',
]);
export const issueSeveritySchema = z.enum([
  'Critical',
  'High',
  'Medium',
  'Low',
]);

// --- Stage 1: Insight detection ---

const evidenceInputSchema = z.object({
  sourceType: z.string().min(1),
  sourceId: z.string().min(1).optional(),
  description: z.string().min(1),
  metricValue: z.number().optional(),
  comparisonValue: z.number().optional(),
  period: z.string().optional(),
  relevanceScore: z.number().min(0).max(1).optional(),
});

export const insightDetectionOutputSchema = z.object({
  insights: z.array(
    z.object({
      type: z.string().min(1),
      title: z.string().min(1).max(200),
      summary: z.string().min(1),
      severity: issueSeveritySchema,
      confidence: confidenceLevelSchema,
      impactScore: z.number().min(0).max(100).optional(),
      // Required at creation for every Insight — see AGENTS.md's Non-Negotiables.
      evidence: z.array(evidenceInputSchema).min(1),
    }),
  ),
});

export const insightDetectionToolSchema = {
  type: 'object',
  properties: {
    insights: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description: 'SCREAMING_SNAKE_CASE category, e.g. DELIVERY_DELAYED',
          },
          title: { type: 'string' },
          summary: { type: 'string' },
          severity: {
            type: 'string',
            enum: ['Critical', 'High', 'Medium', 'Low'],
          },
          confidence: {
            type: 'string',
            enum: ['High', 'Medium', 'Low', 'InsufficientEvidence'],
          },
          impactScore: { type: 'number', minimum: 0, maximum: 100 },
          evidence: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              properties: {
                sourceType: { type: 'string' },
                sourceId: { type: 'string' },
                description: { type: 'string' },
                metricValue: { type: 'number' },
                comparisonValue: { type: 'number' },
                period: { type: 'string' },
                relevanceScore: { type: 'number', minimum: 0, maximum: 1 },
              },
              required: ['sourceType', 'description'],
            },
          },
        },
        required: [
          'type',
          'title',
          'summary',
          'severity',
          'confidence',
          'evidence',
        ],
      },
    },
  },
  required: ['insights'],
} as const;

// --- Stage 2: Root-cause explanation ---

export const rootCauseOutputSchema = z.object({
  rootCauseNarrative: z.string().min(1),
  contributingFactors: z
    .array(
      z.object({
        description: z.string().min(1),
        relevanceScore: z.number().min(0).max(1).optional(),
      }),
    )
    .min(1),
});

export const rootCauseToolSchema = {
  type: 'object',
  properties: {
    rootCauseNarrative: {
      type: 'string',
      description:
        'Hedged language only ("likely," "contributing factor," "correlated") — never asserts causation.',
    },
    contributingFactors: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          relevanceScore: { type: 'number', minimum: 0, maximum: 1 },
        },
        required: ['description'],
      },
    },
  },
  required: ['rootCauseNarrative', 'contributingFactors'],
} as const;

// --- Stage 3: Recommendation generation ---

export const recommendationOutputSchema = z.object({
  recommendations: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().min(1),
        expectedImpact: z.string().min(1).optional(),
        confidence: confidenceLevelSchema,
        rationale: z.string().min(1),
      }),
    )
    .min(1),
});

export const recommendationToolSchema = {
  type: 'object',
  properties: {
    recommendations: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          expectedImpact: { type: 'string' },
          confidence: {
            type: 'string',
            enum: ['High', 'Medium', 'Low', 'InsufficientEvidence'],
          },
          rationale: { type: 'string' },
        },
        required: ['title', 'description', 'confidence', 'rationale'],
      },
    },
  },
  required: ['recommendations'],
} as const;

// --- Weekly AI Operations Report (Phase 6 — not one of architecture.md's ---
// --- three numbered AI Processing stages, but the same trust rules apply ---

export const weeklyReportOutputSchema = z.object({
  biggestWins: z.array(z.string().min(1)).max(5),
  biggestRisks: z.array(z.string().min(1)).max(5),
  anomalies: z.array(z.string().min(1)).max(5),
  predictedRisks: z.array(z.string().min(1)).max(5),
  recommendedPriorities: z.array(z.string().min(1)).max(5),
});

export const weeklyReportToolSchema = {
  type: 'object',
  properties: {
    biggestWins: {
      type: 'array',
      items: { type: 'string' },
      description:
        'What improved this week — historical fact, not interpretation.',
    },
    biggestRisks: {
      type: 'array',
      items: { type: 'string' },
      description:
        'What deteriorated this week — historical fact, not interpretation.',
    },
    anomalies: {
      type: 'array',
      items: { type: 'string' },
      description: 'What changed unexpectedly.',
    },
    predictedRisks: {
      type: 'array',
      items: { type: 'string' },
      description:
        'What may require attention soon — clearly an AI prediction, hedged, never stated as certain.',
    },
    recommendedPriorities: {
      type: 'array',
      items: { type: 'string' },
      description: 'What management should focus on.',
    },
  },
  required: [
    'biggestWins',
    'biggestRisks',
    'anomalies',
    'predictedRisks',
    'recommendedPriorities',
  ],
} as const;
