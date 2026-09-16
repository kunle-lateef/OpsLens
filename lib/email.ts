import { logger } from '@/lib/logger';

// Single entry point for transactional email — features call sendEmail(),
// never a provider SDK directly, same shape as lib/analytics.ts's track().
//
// No email provider is wired in yet (that's a developer decision to make
// once — e.g. Resend, matching the rest of the stack's Vercel-first
// defaults — not something to fabricate a fake integration for, per the
// master prompt's guardrail against pretending an integration exists). Until
// one is chosen, the message is logged structurally, at 'info' level so it's
// visible in local development, with the link/body a real provider would
// send — so the one call site (lib/password-reset.ts today) doesn't change
// when a provider is actually added.
type EmailMessage = {
  to: string;
  subject: string;
  body: string;
};

export async function sendEmail(message: EmailMessage): Promise<void> {
  logger.info('email.sent', {
    to: message.to,
    subject: message.subject,
    // Never log full user-submitted content in general (security.md's
    // Logging rules) — but this body is our own generated copy containing a
    // single-use, time-limited token, not user input, and this is the only
    // "delivery" that exists until a real provider is configured.
    body: message.body,
  });
}
