'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { BrandMark } from '@/components/ui/BrandMark';
import { resetPassword } from './actions';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setFormError(null);

    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');
    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const result = await resetPassword({ token, password });

    if (!result.ok) {
      setFormError(result.error.message);
      setIsSubmitting(false);
      return;
    }

    router.push('/login?reset=success');
  }

  if (!token) {
    return (
      <Card className="w-full py-(--space-8)">
        <Link
          href="/"
          aria-label="OpsLens home"
          className="mb-(--space-12) flex justify-center"
        >
          <BrandMark variant="horizontal" tone="color" size={32} />
        </Link>
        <h1 className="mb-(--space-2) text-center [font:var(--font-h2)]">
          Invalid reset link
        </h1>
        <p className="mb-(--space-6) text-center text-(--color-text-secondary) [font:var(--font-body)]">
          This link is missing its reset token. Request a new one below.
        </p>
        <Link href="/forgot-password">
          <Button>Request a new link</Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card className="w-full py-(--space-8)">
      <Link
        href="/"
        aria-label="OpsLens home"
        className="mb-(--space-12) flex justify-center"
      >
        <BrandMark variant="horizontal" tone="color" size={32} />
      </Link>
      <h1 className="mb-(--space-6) text-center [font:var(--font-h2)]">
        Choose a new password
      </h1>
      <form action={handleSubmit} className="flex flex-col gap-(--space-4)">
        <Input
          name="password"
          type="password"
          label="New password"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <Input
          name="confirmPassword"
          type="password"
          label="Confirm new password"
          required
          minLength={8}
          autoComplete="new-password"
        />
        {formError && (
          <p
            role="alert"
            className="text-(--color-critical) [font:var(--font-caption)]"
          >
            {formError}
          </p>
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="mt-(--space-2)"
        >
          {isSubmitting ? 'Resetting...' : 'Reset password'}
        </Button>
      </form>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="w-full max-w-md">
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
