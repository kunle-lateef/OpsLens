import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { MAX_CSV_SIZE_BYTES } from '@/lib/data-import/csv';

// Issues signed upload tokens for CSV files — see architecture.md's
// Directory Layout and security.md's File Uploads section. Actual content
// validation (is this really CSV, are the rows well-formed) happens in the
// ingestion workflow, not here — allowedContentTypes is a first-pass
// filter, not the whole check, per "validated by actual file content, not
// the client-provided MIME type... alone."
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const session = await getSession();
        if (!session?.user) {
          throw new Error('Not authenticated');
        }

        return {
          allowedContentTypes: [
            'text/csv',
            'application/vnd.ms-excel',
            'application/csv',
            'text/plain',
          ],
          maximumSizeInBytes: MAX_CSV_SIZE_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            organizationId: session.user.organizationId,
          }),
        };
      },
      // No onUploadCompleted — it requires a publicly-reachable callback
      // URL for Vercel's blob service to call back into, which localhost
      // can never satisfy (fails every upload in local dev with "no
      // callbackUrl could be determined"). Nothing here depended on it
      // firing: the real bookkeeping (creating the DataImport row,
      // starting the ingestion workflow) happens in createDataImport,
      // called separately by the client after the upload finishes.
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
