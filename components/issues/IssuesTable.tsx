'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  flexRender,
  type SortingState,
} from '@tanstack/react-table';
import type { Issue, IssueSeverity } from '@prisma/client';
import type { ConfidenceLevel } from '@/components/ui/ConfidenceTag';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { ConfidenceTag } from '@/components/ui/ConfidenceTag';
import { ArrowUp, ArrowDown, ChevronsUpDown } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

// impactAmount is a plain number here, not Prisma's Decimal — the page
// component converts it before this client component ever sees it, since a
// Decimal instance isn't a serializable prop across the server/client
// boundary (React logs this even though it happens to render correctly
// today via the Number() coercion below).
type IssueRow = Omit<Issue, 'impactAmount'> & {
  impactAmount: number | null;
  insight: { confidence: ConfidenceLevel };
};

const SEVERITY_RANK: Record<IssueSeverity, number> = {
  Critical: 3,
  High: 2,
  Medium: 1,
  Low: 0,
};
const CONFIDENCE_RANK: Record<ConfidenceLevel, number> = {
  High: 3,
  Medium: 2,
  Low: 1,
  InsufficientEvidence: 0,
};

const columnHelper = createColumnHelper<IssueRow>();

// TanStack Table is headless — it supplies sort state/comparators only, no
// markup or styling of its own, so every cell below still renders the real
// SeverityBadge/ConfidenceTag components and OpsLens's own tokens, per the
// "re-skin, don't adopt a competing visual layer" plan. Replaces the
// stacked-Card list in app/(dashboard)/issues/page.tsx; sorting starts
// unsorted (server's priorityScore-then-detectedAt order) until a column
// header is clicked.
const columns = [
  columnHelper.accessor('title', {
    header: 'Issue',
    cell: (info) => (
      <Link
        href={`/issues/${info.row.original.id}`}
        className="text-(--color-text-primary) [font:var(--font-body-emphasis)] hover:underline focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:outline-none"
      >
        {info.getValue()}
      </Link>
    ),
  }),
  columnHelper.accessor('severity', {
    header: 'Severity',
    sortingFn: (a, b) =>
      SEVERITY_RANK[a.original.severity] - SEVERITY_RANK[b.original.severity],
    cell: (info) => <SeverityBadge severity={info.getValue()} />,
  }),
  columnHelper.accessor((row) => row.insight.confidence, {
    id: 'confidence',
    header: 'Confidence',
    sortingFn: (a, b) =>
      CONFIDENCE_RANK[a.original.insight.confidence] -
      CONFIDENCE_RANK[b.original.insight.confidence],
    cell: (info) => <ConfidenceTag confidence={info.getValue()} />,
  }),
  columnHelper.accessor('detectedAt', {
    header: 'Detected',
    cell: (info) => (
      <span className="tabular-nums text-(--color-text-tertiary) [font:var(--font-caption)]">
        {info.getValue().toLocaleDateString()}
      </span>
    ),
  }),
  columnHelper.accessor('impactAmount', {
    header: 'Impact',
    cell: (info) => {
      const amount = info.getValue();
      if (amount === null) {
        return (
          <span className="text-(--color-text-tertiary) [font:var(--font-caption)]">
            —
          </span>
        );
      }
      return (
        <span className="tabular-nums text-(--color-brand-accent) [font:var(--font-caption)]">
          ${Number(amount).toLocaleString()}
        </span>
      );
    },
  }),
];

export function IssuesTable({
  issues,
  muted = false,
}: {
  issues: IssueRow[];
  muted?: boolean;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data: issues,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div
      className={cn(
        'overflow-x-auto rounded-(--radius-lg) border border-(--color-border-subtle)',
        muted && 'opacity-60',
      )}
    >
      {/* min-w keeps every column at a legible width on narrow viewports —
          without it, `w-full` alone lets the browser shrink columns to fit
          instead of actually using this wrapper's overflow-x-auto, which
          was silently losing the Impact column and wrapping the Issue title
          into a single-word stack on mobile. */}
      <table className="w-full min-w-[640px] border-collapse">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sortDirection = header.column.getIsSorted();
                return (
                  <th
                    key={header.id}
                    scope="col"
                    className="border-b border-(--color-border-subtle) px-(--space-3) py-(--space-2) text-left text-(--color-text-tertiary) [font:var(--font-label)]"
                  >
                    {canSort ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="flex items-center gap-(--space-1) focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:outline-none"
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {sortDirection === 'asc' ? (
                          <ArrowUp size={12} aria-hidden="true" />
                        ) : sortDirection === 'desc' ? (
                          <ArrowDown size={12} aria-hidden="true" />
                        ) : (
                          <ChevronsUpDown
                            size={12}
                            aria-hidden="true"
                            className="text-(--color-text-tertiary) opacity-50"
                          />
                        )}
                      </button>
                    ) : (
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-(--color-border-subtle) last:border-b-0 hover:bg-(--color-surface-base)"
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-(--space-3) py-(--space-2)">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
