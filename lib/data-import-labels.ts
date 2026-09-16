// Shared with app/(dashboard)/data/page.tsx (the import list's status
// column) and app/(dashboard)/data/[importId]/page.tsx (the detail page's
// stage line) — previously only the detail page humanized this field, so
// the list showed the raw status enum (e.g. "MappingPending") right next
// to the same field spelled out in full on the page one click away.
export const DATA_IMPORT_STAGE_LABEL: Record<string, string> = {
  Uploaded: 'Uploaded — waiting to start',
  Validating: 'Validating file...',
  MappingPending: 'Waiting for you to confirm the column mapping',
  Processing: 'Importing records...',
  Completed: 'Completed',
  PartiallyCompleted: 'Completed with some rows rejected',
  Failed: 'Failed',
};

// A shorter form for contexts (like a list row) where the full sentence
// above would wrap awkwardly next to a filename.
export const DATA_IMPORT_STATUS_LABEL: Record<string, string> = {
  Uploaded: 'Uploaded',
  Validating: 'Validating',
  MappingPending: 'Needs mapping',
  Processing: 'Processing',
  Completed: 'Completed',
  PartiallyCompleted: 'Partially completed',
  Failed: 'Failed',
};
