import { Card } from '@/components/ui/Card';

export function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <Card className="flex flex-col gap-(--space-1)">
      <span className="text-(--color-text-tertiary) [font:var(--font-caption)]">
        {label}
      </span>
      <span className="text-(--color-text-primary) tabular-nums [font:var(--font-display)]">
        {value}
      </span>
      {detail && (
        <span className="text-(--color-text-secondary) [font:var(--font-caption)]">
          {detail}
        </span>
      )}
    </Card>
  );
}
