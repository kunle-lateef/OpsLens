'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { BrandMark } from '@/components/ui/BrandMark';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setFormError(null);

    const result = await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirect: false,
    });

    if (result?.error) {
      setFormError('Incorrect email or password.');
      setIsSubmitting(false);
      return;
    }

    router.push(searchParams.get('callbackUrl') ?? '/overview');
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
      <h1 className="mb-(--space-2) text-center [font:var(--font-h2)]">
        Sign in to OpsLens
      </h1>
      <p className="mb-(--space-6) text-center text-(--color-text-secondary) [font:var(--font-body)]">
        Welcome back — pick up where you left off.
      </p>
      {searchParams.get('reset') === 'success' && (
        <p className="mb-(--space-4) rounded-(--radius-md) border border-(--color-success) px-(--space-3) py-(--space-2) text-(--color-success) [font:var(--font-caption)]">
          Your password has been reset. Sign in with your new password.
        </p>
      )}
      {searchParams.get('workspaceCreated') === 'success' && (
        <p className="mb-(--space-4) rounded-(--radius-md) border border-(--color-success) px-(--space-3) py-(--space-2) text-(--color-success) [font:var(--font-caption)]">
          Workspace created — sign in to continue.
        </p>
      )}
      <form action={handleSubmit} className="flex flex-col gap-(--space-4)">
        <Input
          name="email"
          type="email"
          label="Email"
          required
          autoComplete="email"
        />
        <Input
          name="password"
          type="password"
          label="Password"
          required
          autoComplete="current-password"
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
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
      <div className="mt-(--space-4) flex items-center justify-between">
        <Link
          href="/forgot-password"
          className="text-(--color-text-secondary) [font:var(--font-label)] hover:text-(--color-text-primary)"
        >
          Forgot password?
        </Link>
        <Link
          href="/signup"
          className="text-(--color-brand-accent) [font:var(--font-label)] hover:underline"
        >
          Create a workspace
        </Link>
      </div>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="w-full max-w-md">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
