import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  countUnreadNotifications,
  listRecentNotifications,
} from '@/lib/notifications';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Toaster } from '@/components/ui/Toaster';

// Server-rendered shell per architecture.md's Rendering Rules — the session
// and organization name are fetched here, once, and passed down; child
// pages never need their own top-level auth check for "is there a session
// at all" (middleware already guarantees that), only their own
// organizationId-scoped queries per security.md's Multi-Tenant Isolation.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) {
    redirect('/login');
  }

  const [organization, user, notifications, unreadNotificationCount] =
    await Promise.all([
      db.organization.findUnique({
        where: { id: session.user.organizationId },
        select: { name: true },
      }),
      db.user.findUnique({
        where: { id: session.user.id },
        select: { avatarUrl: true },
      }),
      listRecentNotifications(session.user.organizationId),
      countUnreadNotifications(session.user.organizationId),
    ]);

  return (
    <DashboardShell
      organizationName={organization?.name ?? 'OpsLens'}
      userName={session.user.name ?? session.user.email ?? ''}
      avatarUrl={user?.avatarUrl}
      notifications={notifications}
      unreadNotificationCount={unreadNotificationCount}
    >
      {children}
      <Toaster />
    </DashboardShell>
  );
}
