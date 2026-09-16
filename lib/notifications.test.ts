import { describe, expect, it } from 'vitest';
import { issueSeverityToNotificationSeverity } from './notifications';

describe('issueSeverityToNotificationSeverity', () => {
  it('passes Critical, High, and Medium through unchanged', () => {
    expect(issueSeverityToNotificationSeverity('Critical')).toBe('Critical');
    expect(issueSeverityToNotificationSeverity('High')).toBe('High');
    expect(issueSeverityToNotificationSeverity('Medium')).toBe('Medium');
  });

  it('maps Low to Informational, the only IssueSeverity value with no matching NotificationSeverity member', () => {
    expect(issueSeverityToNotificationSeverity('Low')).toBe('Informational');
  });
});
