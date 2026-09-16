import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// Backs the ⌘K command palette's "Issues" group — see
// components/dashboard/CommandPalette.tsx. Fetched once when the palette
// opens; cmdk does the fuzzy filtering client-side as the user types, so
// this returns a bounded, organization-scoped list rather than accepting a
// query param and re-querying per keystroke.
export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const issues = await db.issue.findMany({
      where: { organizationId: session.user.organizationId },
      select: { id: true, title: true, severity: true },
      orderBy: [{ priorityScore: 'desc' }, { detectedAt: 'desc' }],
      take: 25,
    });

    return NextResponse.json({ issues });
  } catch (error) {
    logger.error('issues_search.failed', {
      organizationId: session.user.organizationId,
      error: String(error),
    });
    return NextResponse.json(
      { error: 'Could not load issues.' },
      { status: 500 },
    );
  }
}
