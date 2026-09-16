'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const TERMINAL_STATUSES = new Set([
  'Completed',
  'PartiallyCompleted',
  'Failed',
  'MappingPending',
]);

// Polls the server component's data by refreshing the route — see
// design-system.md's Loading States: async processing must be represented
// honestly, not faked. Stops once the import reaches a state that needs
// human input (MappingPending) or has finished.
export function StatusPoller({ status }: { status: string }) {
  const router = useRouter();

  useEffect(() => {
    if (TERMINAL_STATUSES.has(status)) return;
    const interval = setInterval(() => router.refresh(), 2000);
    return () => clearInterval(interval);
  }, [status, router]);

  return null;
}
