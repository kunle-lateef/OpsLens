import { logger } from '@/lib/logger';

// Single entry point for the event taxonomy in architecture.md's Product
// Analytics section — features call track(), never a provider SDK directly.
//
// No analytics provider is wired in yet (that's a developer decision to
// make once, not something to fabricate a fake integration for — see the
// master prompt's guardrail against pretending an integration exists).
// Until one is chosen, events are logged structurally so the call sites and
// payload shapes are already correct when a real provider is added.
type AnalyticsEvent =
  | 'user_signed_up'
  | 'workspace_created'
  | 'dataset_uploaded'
  | 'mapping_completed'
  | 'dataset_imported'
  | 'morning_brief_viewed'
  | 'issue_opened'
  | 'issue_acknowledged'
  | 'recommendation_viewed'
  | 'recommendation_accepted'
  | 'recommendation_rejected'
  | 'ai_question_submitted'
  | 'ai_answer_viewed'
  | 'ai_feedback_submitted'
  | 'report_generated';

export function track(
  event: AnalyticsEvent,
  properties?: Record<string, unknown>,
) {
  logger.info(`analytics.${event}`, properties);
}
