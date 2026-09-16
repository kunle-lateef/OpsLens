import { z } from 'zod';

export const createDataImportSchema = z.object({
  fileName: z.string().trim().min(1).max(500),
  checksum: z.string().trim().min(1),
  blobUrl: z.string().url(),
});

export const confirmMappingsSchema = z.object({
  dataImportId: z.string().min(1),
  mappings: z
    .array(
      z.object({
        mappingId: z.string().min(1),
        targetEntity: z.string().nullable(),
        targetField: z.string().nullable(),
      }),
    )
    .min(1),
});
