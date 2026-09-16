const DAY_MS = 24 * 60 * 60 * 1000;

// A plain helper, not a call to Date.now() inline in a component body —
// React's purity lint flags the latter as an impure render-time call. See
// lib/morning-brief.ts for the original instance of this fix.
export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * DAY_MS);
}
