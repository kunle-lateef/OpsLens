import { cn } from '@/lib/cn';

type AvatarProps = {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Filled `--color-brand-solid` circle with white initials — the one Brand
 * surface design-system.md's Color System section sanctions for white text.
 * Falls back to initials since `User.avatarUrl` (db-migration-runner
 * SKILL.md's User model) has no upload flow behind it yet and is null for
 * every real user today. `size` is a runtime prop, not a fixed design
 * constant, so it's passed through as width/height rather than a Tailwind
 * class — same precedent as BrandMark.tsx's computed dimensions.
 */
export function Avatar({ name, avatarUrl, size = 32, className }: AvatarProps) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        width={size}
        height={size}
        className={cn('shrink-0 rounded-(--radius-full) object-cover', className)}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-(--radius-full) bg-(--color-brand-solid) text-white [font:var(--font-label)]',
        className,
      )}
    >
      {getInitials(name)}
    </span>
  );
}
