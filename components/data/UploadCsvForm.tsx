'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { upload } from '@vercel/blob/client';
import { Button } from '@/components/ui/Button';
import { createDataImport } from '@/app/(dashboard)/data/actions';

async function sha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Uploading, validating, mapping, processing — see design-system.md's
// Loading States: each stage is communicated honestly, never faked.
type Stage = 'idle' | 'uploading' | 'starting' | 'error';

export function UploadCsvForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setStage('uploading');

    try {
      const checksum = await sha256(file);
      const blob = await upload(file.name, file, {
        access: 'private',
        handleUploadUrl: '/api/uploads',
      });

      setStage('starting');
      const result = await createDataImport({
        fileName: file.name,
        checksum,
        blobUrl: blob.url,
      });

      if (!result.ok) {
        setError(result.error.message);
        setStage('error');
        return;
      }

      router.push(`/data/${result.data.dataImportId}`);
    } catch {
      setError("We couldn't upload this file. Please try again.");
      setStage('error');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-(--space-2)">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />
      <Button
        onClick={() => inputRef.current?.click()}
        disabled={stage === 'uploading' || stage === 'starting'}
      >
        {stage === 'uploading' && 'Uploading...'}
        {stage === 'starting' && 'Starting import...'}
        {(stage === 'idle' || stage === 'error') && 'Upload CSV'}
      </Button>
      {error && (
        <p
          role="alert"
          className="text-(--color-critical) [font:var(--font-caption)]"
        >
          {error}
        </p>
      )}
    </div>
  );
}
