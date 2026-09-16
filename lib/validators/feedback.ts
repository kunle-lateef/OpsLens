import { z } from 'zod';

export const submitFeedbackSchema = z.object({
  targetType: z.literal('AIInteraction'),
  targetId: z.string().min(1),
  type: z.enum(['Helpful', 'NotHelpful', 'Incorrect', 'MissingContext']),
  comment: z.string().trim().max(1000).optional(),
});
