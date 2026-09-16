// Structured logger — see security.md's Logging rules. Never log passwords,
// session tokens, the Anthropic API key, storage credentials, full raw CSV
// content, or a complete AI Assistant conversation beyond what's needed to
// debug a specific incident.
type LogContext = Record<string, unknown>;

function emit(
  level: 'info' | 'error' | 'warn',
  event: string,
  context?: LogContext,
) {
  const entry = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...context,
  };
  console[level === 'info' ? 'log' : level](JSON.stringify(entry));
}

export const logger = {
  info: (event: string, context?: LogContext) => emit('info', event, context),
  warn: (event: string, context?: LogContext) => emit('warn', event, context),
  error: (event: string, context?: LogContext) => emit('error', event, context),
};
