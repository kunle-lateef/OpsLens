'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell } from '@/components/ui/icons';
import type { Notification } from '@prisma/client';
import { Button } from '@/components/ui/Button';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover';
import { markAllNotificationsRead } from '@/app/(dashboard)/notifications/actions';

function timeAgo(date: Date): string {
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

type NotificationBellProps = {
  notifications: Notification[];
  unreadCount: number;
};

// The one write/read surface for the Notification model — see
// db-migration-runner/SKILL.md's Notification section. Server-fetched data
// in, this component only handles the open/close interaction and the
// mark-read action; it never queries the database itself.
export function NotificationBell({
  notifications,
  unreadCount,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsRead();
      router.refresh();
    });
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={
            unreadCount > 0
              ? `Notifications (${unreadCount} unread)`
              : 'Notifications'
          }
        >
          <span className="relative inline-flex">
            <Bell size={16} aria-hidden="true" />
            {unreadCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute -top-1 -right-1 h-2 w-2 rounded-(--radius-full) border border-(--color-surface-base) bg-(--color-critical)"
              />
            )}
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent aria-label="Notifications" className="w-80">
        <div className="flex items-center justify-between border-b border-(--color-border-subtle) px-(--space-3) py-(--space-2)">
          <span className="text-(--color-text-tertiary) [font:var(--font-label)]">
            Notifications
          </span>
          {unreadCount > 0 && (
            <button
              type="button"
              disabled={isPending}
              onClick={handleMarkAllRead}
              className="text-(--color-brand-accent) [font:var(--font-caption)] hover:underline disabled:opacity-50"
            >
              Mark all as read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <p className="p-(--space-3) text-(--color-text-tertiary) [font:var(--font-body)]">
            Nothing yet. OpsLens will notify you here when a new Critical
            issue is detected or a recommendation is ready for review.
          </p>
        ) : (
          <ul className="flex max-h-80 flex-col overflow-y-auto">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onNavigate={() => setIsOpen(false)}
              />
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

function NotificationItem({
  notification,
  onNavigate,
}: {
  notification: Notification;
  onNavigate: () => void;
}) {
  const body = (
    <div className="flex flex-col items-start gap-(--space-1) border-b border-(--color-border-subtle) px-(--space-3) py-(--space-2) last:border-b-0 hover:bg-(--color-surface-base)">
      <SeverityBadge severity={notification.severity} />
      <span className="text-(--color-text-primary) [font:var(--font-body)]">
        {notification.message}
      </span>
      <span className="text-(--color-text-tertiary) [font:var(--font-caption)]">
        {timeAgo(notification.createdAt)}
      </span>
    </div>
  );

  return (
    <li>
      {notification.linkUrl ? (
        <Link href={notification.linkUrl} onClick={onNavigate}>
          {body}
        </Link>
      ) : (
        body
      )}
    </li>
  );
}
