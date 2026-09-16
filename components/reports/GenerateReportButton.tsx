'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { generateReport } from '@/app/(dashboard)/reports/actions';

export function GenerateReportButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await generateReport();
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      router.push(`/reports/${result.data.reportId}`);
    });
  }

  return (
    <div className="flex flex-col gap-(--space-2)">
      <Button onClick={handleClick} disabled={isPending}>
        {isPending ? 'Generating...' : 'Generate this week’s report'}
      </Button>
      {error && (
        <p
          role="alert"
          className="text-(--color-critical) [font:var(--font-caption)]"
        >
          {error}
        </p>
      )}
    </div>
  );
}
