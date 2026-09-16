import { TARGET_FIELDS, targetKey, type TargetField } from './target-fields';

function normalize(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export type MappingSuggestion = {
  entity: string;
  field: string;
  /** 0-1. Confidence is deterministic here — see architecture.md's AI Confidence Model: no fabricated value. */
  confidence: number;
} | null;

/**
 * Deterministic column-to-field matching per section 27 of the product
 * spec — "the system may suggest mappings using deterministic rules and AI
 * assistance." AI-assisted suggestions are a later-phase enhancement (the
 * AI pipeline doesn't exist yet); this rule-based pass is the whole
 * suggestion engine for now, not a fallback for it.
 */
export function suggestMapping(sourceColumn: string): MappingSuggestion {
  const normalizedColumn = normalize(sourceColumn);
  if (!normalizedColumn) return null;

  let bestMatch: { target: TargetField; confidence: number } | null = null;

  for (const target of TARGET_FIELDS) {
    const normalizedField = normalize(target.field);
    const normalizedLabel = normalize(target.label);
    const normalizedSynonyms = target.synonyms.map(normalize);

    if (
      normalizedColumn === normalizedField ||
      normalizedSynonyms.includes(normalizedColumn)
    ) {
      // Exact match on the field name or a listed synonym.
      bestMatch = { target, confidence: 0.95 };
      break;
    }

    if (normalizedColumn === normalizedLabel) {
      bestMatch = { target, confidence: 0.9 };
      continue;
    }

    const isPartialMatch =
      normalizedSynonyms.some(
        (s) => s.includes(normalizedColumn) || normalizedColumn.includes(s),
      ) ||
      normalizedField.includes(normalizedColumn) ||
      normalizedColumn.includes(normalizedField);

    if (isPartialMatch && (!bestMatch || bestMatch.confidence < 0.6)) {
      bestMatch = { target, confidence: 0.6 };
    }
  }

  if (!bestMatch) return null;
  return {
    entity: bestMatch.target.entity,
    field: bestMatch.target.field,
    confidence: bestMatch.confidence,
  };
}

export { TARGET_FIELDS, targetKey };
