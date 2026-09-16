'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { BrandMark } from '@/components/ui/BrandMark';
import { signUp } from './actions';

export default function SignUpPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setFormError(null);

    const input = {
      organizationName: formData.get('organizationName'),
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password'),
    };

    const result = await signUp(input);
    if (!result.ok) {
      setFormError(result.error.message);
      setIsSubmitting(false);
      return;
    }

    const signInResult = await signIn('credentials', {
      email: input.email,
      password: input.password,
      redirect: false,
    });

    if (signInResult?.error) {
      router.push('/login?workspaceCreated=success');
      return;
    }

    router.push('/overview');
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
          Create your workspace
        </h1>
        <p className="mb-(--space-6) text-center text-(--color-text-secondary) [font:var(--font-body)]">
          Set up your organization in under a minute.
        </p>
        <form action={handleSubmit} className="flex flex-col gap-(--space-4)">
          <Input
            name="organizationName"
            label="Company name"
            required
            autoComplete="organization"
          />
          <Input name="name" label="Your name" required autoComplete="name" />
          <Input
            name="email"
            type="email"
            label="Work email"
            required
            autoComplete="email"
          />
          <Input
            name="password"
            type="password"
            label="Password"
            required
            minLength={8}
            autoComplete="new-password"
            hint="At least 8 characters"
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
            {isSubmitting ? 'Creating workspace...' : 'Create workspace'}
          </Button>
          <p className="text-center text-(--color-text-tertiary) [font:var(--font-caption)]">
            By creating a workspace, you agree to OpsLens&apos;s{' '}
            <Link href="/terms" className="hover:text-(--color-text-primary)">
              Terms
            </Link>{' '}
            and{' '}
            <Link
              href="/privacy"
              className="hover:text-(--color-text-primary)"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </form>
        <p className="mt-(--space-6) text-(--color-text-secondary) [font:var(--font-label)]">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-(--color-brand-accent) hover:underline"
          >
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
