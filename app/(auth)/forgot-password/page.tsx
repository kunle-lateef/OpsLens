'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { BrandMark } from '@/components/ui/BrandMark';
import { requestPasswordReset } from './actions';

export default function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setFormError(null);

    const result = await requestPasswordReset({
      email: formData.get('email'),
    });

    if (!result.ok) {
      setFormError(result.error.message);
      setIsSubmitting(false);
      return;
    }

    setSubmitted(true);
    setIsSubmitting(false);
  }

  return (
    <div className="w-full max-w-md">
      <Card className="w-full py-(--space-8)">
        <Link
          href="/"
          aria-label="OpsLens home"
          className="mb-(--space-12) flex justify-center"
        >
          <BrandMark variant="horizontal" tone="color" size={32} />
        </Link>
        <h1 className="mb-(--space-2) text-center [font:var(--font-h2)]">
          Reset your password
        </h1>
        {submitted ? (
          <p className="text-center text-(--color-text-secondary) [font:var(--font-body)]">
            If an account exists for that email, we&apos;ve sent a link to reset
            your password. It expires in an hour.
          </p>
        ) : (
          <>
            <p className="mb-(--space-6) text-center text-(--color-text-secondary) [font:var(--font-body)]">
              Enter the email on your account and we&apos;ll send you a link to
              reset your password.
            </p>
            <form
              action={handleSubmit}
              className="flex flex-col gap-(--space-4)"
            >
              <Input
                name="email"
                type="email"
                label="Email"
                required
                autoComplete="email"
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
                {isSubmitting ? 'Sending...' : 'Send reset link'}
              </Button>
            </form>
          </>
        )}
        <Link
          href="/login"
          className="mt-(--space-6) block text-(--color-text-secondary) [font:var(--font-label)] hover:text-(--color-text-primary)"
        >
          Back to sign in
        </Link>
      </Card>
    </div>
  );
}
