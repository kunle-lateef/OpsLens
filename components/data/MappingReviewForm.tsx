'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { TARGET_FIELDS, targetKey } from '@/lib/data-import/target-fields';
import { confirmMappings } from '@/app/(dashboard)/data/actions';

type MappingRow = {
  id: string;
  sourceField: string;
  targetEntity: string | null;
  targetField: string | null;
  confidence: number | null;
};

const UNMAPPED = '__unmapped__';

export function MappingReviewForm({
  dataImportId,
  mappings,
}: {
  dataImportId: string;
  mappings: MappingRow[];
}) {
  const router = useRouter();
  const [selections, setSelections] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      mappings.map((m) => [
        m.id,
        m.targetEntity && m.targetField
          ? targetKey(m.targetEntity, m.targetField)
          : UNMAPPED,
      ]),
    ),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setIsSubmitting(true);
    setError(null);

    const payload = {
      dataImportId,
      mappings: mappings.map((m) => {
        const selection = selections[m.id];
        if (selection === UNMAPPED) {
          return { mappingId: m.id, targetEntity: null, targetField: null };
        }
        const [targetEntity, targetField] = selection.split('.');
        return { mappingId: m.id, targetEntity, targetField };
      }),
    };

    const result = await confirmMappings(payload);
    if (!result.ok) {
      setError(result.error.message);
      setIsSubmitting(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col gap-(--space-4)">
      <p className="text-(--color-text-secondary) [font:var(--font-body)]">
        Review the suggested mapping for each column. AI-suggested mappings
        never overwrite what you confirm here — adjust anything before
        importing.
      </p>

      <div className="flex flex-col gap-(--space-2)">
        {mappings.map((mapping) => (
          <div
            key={mapping.id}
            className="flex items-center justify-between gap-(--space-4) rounded-(--radius-md) border border-(--color-border-subtle) p-(--space-3)"
          >
            <div className="flex flex-col">
              <label
                htmlFor={`mapping-${mapping.id}`}
                className="[font:var(--font-label)]"
              >
                {mapping.sourceField}
              </label>
              {mapping.confidence !== null && (
                <span className="text-(--color-text-tertiary) [font:var(--font-caption)]">
                  Suggested at {Math.round(mapping.confidence * 100)}%
                  confidence
                </span>
              )}
            </div>
            <select
              id={`mapping-${mapping.id}`}
              value={selections[mapping.id]}
              onChange={(event) =>
                setSelections((prev) => ({
                  ...prev,
                  [mapping.id]: event.target.value,
                }))
              }
              className="h-(--space-10) rounded-(--radius-md) border border-(--color-border-strong) bg-(--color-surface-elevated) px-(--space-3) text-(--color-text-primary) [font:var(--font-body)] focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:outline-none"
            >
              <option value={UNMAPPED}>Don&apos;t import this column</option>
              {TARGET_FIELDS.map((target) => (
                <option
                  key={targetKey(target.entity, target.field)}
                  value={targetKey(target.entity, target.field)}
                >
                  {target.entity} — {target.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {error && (
        <p
          role="alert"
          className="text-(--color-critical) [font:var(--font-caption)]"
        >
          {error}
        </p>
      )}

      <Button
        onClick={handleConfirm}
        disabled={isSubmitting}
        className="self-start"
      >
        {isSubmitting ? 'Importing...' : 'Confirm mapping and import'}
      </Button>
    </div>
  );
}
