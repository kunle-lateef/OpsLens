'use server';

import { start } from 'workflow/api';
import { RoleName } from '@prisma/client';
import { requireSession, hasMinimumRole } from '@/lib/authz';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import {
  createDataImportSchema,
  confirmMappingsSchema,
} from '@/lib/validators/data-import';
import {
  ingestDataImportWorkflow,
  mappingConfirmedHook,
} from '@/lib/workflows';
import { track } from '@/lib/analytics';
import { logger } from '@/lib/logger';
import { ok, err, type ActionResult } from '@/lib/result';
import { revalidatePath } from 'next/cache';

/**
 * Creates a DataImport and starts the ingestion workflow — see
 * api-route-scaffolder/SKILL.md's quota-enforcement pattern: reuse an
 * unchanged (checksum-matched) import before touching quota, and never
 * trigger the Workflow before the quota check passes.
 */
export async function createDataImport(
  input: unknown,
): Promise<ActionResult<{ dataImportId: string }>> {
  const session = await requireSession();
  const organizationId = session.user.organizationId;

  if (!hasMinimumRole(session.user.roleName, RoleName.Analyst)) {
    return err('FORBIDDEN', 'Viewers cannot start a data import.');
  }

  const limit = await rateLimit(`data-import:${organizationId}`, 10, 60_000);
  if (!limit.allowed) {
    return err(
      'RATE_LIMITED',
      'Too many imports started. Try again in a minute.',
    );
  }

  const parsed = createDataImportSchema.safeParse(input);
  if (!parsed.success) {
    return err('INVALID_INPUT', 'Please check the upload and try again.');
  }
  const { fileName, checksum, blobUrl } = parsed.data;

  const existing = await db.dataImport.findFirst({
    where: {
      organizationId,
      checksum,
      status: { in: ['Completed', 'PartiallyCompleted'] },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (existing) {
    return ok({ dataImportId: existing.id });
  }

  const organization = await db.organization.findUniqueOrThrow({
    where: { id: organizationId },
  });
  if (organization.usageCount >= organization.usageQuota) {
    return err(
      'QUOTA_EXCEEDED',
      'This workspace has used all its imports for the current cycle.',
    );
  }

  const dataSource = await db.dataSource.upsert({
    where: { organizationId_name: { organizationId, name: 'CSV Uploads' } },
    create: {
      organizationId,
      name: 'CSV Uploads',
      type: 'CSV',
      status: 'active',
    },
    update: {},
  });

  try {
    const [dataImport] = await db.$transaction([
      db.dataImport.create({
        data: {
          organizationId,
          dataSourceId: dataSource.id,
          fileName,
          fileUrl: blobUrl,
          checksum,
          status: 'Uploaded',
        },
      }),
      db.organization.update({
        where: { id: organizationId },
        data: { usageCount: { increment: 1 } },
      }),
    ]);

    await start(ingestDataImportWorkflow, [dataImport.id]);

    logger.info('data_import.started', {
      organizationId,
      dataImportId: dataImport.id,
    });
    track('dataset_uploaded', { organizationId, dataImportId: dataImport.id });

    revalidatePath('/data');
    return ok({ dataImportId: dataImport.id });
  } catch (error) {
    logger.error('data_import.start_failed', {
      organizationId,
      error: String(error),
    });
    return err(
      'IMPORT_FAILED',
      "We couldn't start processing this file. Please try again.",
    );
  }
}

export async function confirmMappings(
  input: unknown,
): Promise<ActionResult<null>> {
  const session = await requireSession();

  if (!hasMinimumRole(session.user.roleName, RoleName.Analyst)) {
    return err('FORBIDDEN', 'Viewers cannot confirm data mappings.');
  }

  const parsed = confirmMappingsSchema.safeParse(input);
  if (!parsed.success) {
    return err('INVALID_INPUT', 'Please review the mappings and try again.');
  }
  const { dataImportId, mappings } = parsed.data;

  const dataImport = await db.dataImport.findUnique({
    where: { id: dataImportId },
  });
  if (
    !dataImport ||
    dataImport.organizationId !== session.user.organizationId
  ) {
    return err('NOT_FOUND', 'Import not found.');
  }
  if (dataImport.status !== 'MappingPending') {
    return err(
      'INVALID_STATE',
      'This import is not waiting for a mapping confirmation.',
    );
  }

  await db.$transaction(
    mappings.map((mapping) =>
      db.dataMapping.update({
        where: { id: mapping.mappingId, dataImportId },
        data: {
          targetEntity: mapping.targetEntity,
          targetField: mapping.targetField,
          confirmedByUser: true,
        },
      }),
    ),
  );

  track('mapping_completed', {
    organizationId: dataImport.organizationId,
    dataImportId,
  });
  await mappingConfirmedHook.resume(dataImportId, { confirmed: true });

  revalidatePath(`/data/${dataImportId}`);
  return ok(null);
}
