import { get } from '@vercel/blob';
import { env } from '@/lib/env';

// Object storage wrapper for uploaded CSV files — see architecture.md's
// Directory Layout. Uploads themselves go through the client-upload flow in
// app/api/uploads/route.ts (@vercel/blob/client's handleUpload); this
// wrapper is for the ingestion workflow reading a file's content back.
export async function readBlobText(blobUrl: string): Promise<string> {
  const result = await get(blobUrl, {
    access: 'private',
    token: env.BLOB_READ_WRITE_TOKEN,
  });
  if (!result || result.statusCode !== 200) {
    throw new Error('Uploaded file could not be found in storage.');
  }
  return new Response(result.stream).text();
}
