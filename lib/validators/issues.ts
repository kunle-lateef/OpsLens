import { z } from 'zod';

export const updateIssueStatusSchema = z.object({
  issueId: z.string().min(1),
  status: z.enum(['Acknowledged', 'InProgress', 'Resolved', 'Dismissed']),
});

export const decideOnRecommendationSchema = z.object({
  recommendationId: z.string().min(1),
  decision: z.enum(['Accepted', 'Rejected', 'Modified', 'Dismissed']),
  note: z.string().trim().max(2000).optional(),
});
