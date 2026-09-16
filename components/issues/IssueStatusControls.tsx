'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/Dialog';
import { updateIssueStatus } from '@/app/(dashboard)/issues/actions';

type IssueStatusControlsProps = {
  issueId: string;
  status:
    | 'Detected'
    | 'Reviewed'
    | 'Acknowledged'
    | 'InProgress'
    | 'Resolved'
    | 'Dismissed';
};

// Resolved and Dismissed are the two statuses IssueStatusControls itself
// treats as final (see the early return below) — neither has an undo path
// in the UI, so both get a confirmation step; Acknowledge/Start progress
// don't, since those are freely reversible.
const ACTIONS: {
  status: 'Acknowledged' | 'InProgress' | 'Resolved' | 'Dismissed';
  label: string;
  confirm?: { title: string; description: string; confirmLabel: string };
}[] = [
  { status: 'Acknowledged', label: 'Acknowledge' },
  { status: 'InProgress', label: 'Start progress' },
  {
    status: 'Resolved',
    label: 'Resolve',
    confirm: {
      title: 'Resolve this issue?',
      description:
        "This marks the issue as resolved and can't be undone here — if the same pattern reappears, OpsLens will raise it as a new issue rather than reopening this one.",
      confirmLabel: 'Resolve issue',
    },
  },
  {
    status: 'Dismissed',
    label: 'Dismiss',
    confirm: {
      title: 'Dismiss this issue?',
      description:
        "This marks the issue as dismissed and can't be undone here — if the same pattern reappears, OpsLens will raise it as a new issue rather than reopening this one.",
      confirmLabel: 'Dismiss issue',
    },
  },
];

const STATUS_TOAST: Record<
  'Acknowledged' | 'InProgress' | 'Resolved' | 'Dismissed',
  string
> = {
  Acknowledged: 'Issue acknowledged',
  InProgress: 'Issue marked in progress',
  Resolved: 'Issue resolved',
  Dismissed: 'Issue dismissed',
};

export function IssueStatusControls({
  issueId,
  status,
}: IssueStatusControlsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (status === 'Resolved' || status === 'Dismissed') {
    return null;
  }

  function handleClick(
    nextStatus: 'Acknowledged' | 'InProgress' | 'Resolved' | 'Dismissed',
  ) {
    setError(null);
    startTransition(async () => {
      const result = await updateIssueStatus({ issueId, status: nextStatus });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      toast.success(STATUS_TOAST[nextStatus]);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-(--space-2)">
      <div className="flex flex-wrap gap-(--space-2)">
        {ACTIONS.filter((action) => action.status !== status).map((action) =>
          action.confirm ? (
            <Dialog key={action.status}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant={action.status === 'Dismissed' ? 'ghost' : 'secondary'}
                  disabled={isPending}
                >
                  {action.label}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogTitle>{action.confirm.title}</DialogTitle>
                <DialogDescription>
                  {action.confirm.description}
                </DialogDescription>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button size="sm" variant="secondary">
                      Cancel
                    </Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleClick(action.status)}
                    >
                      {action.confirm.confirmLabel}
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : (
            <Button
              key={action.status}
              size="sm"
              variant="secondary"
              disabled={isPending}
              onClick={() => handleClick(action.status)}
            >
              {action.label}
            </Button>
          ),
        )}
      </div>
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
