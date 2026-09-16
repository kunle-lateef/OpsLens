'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/Input';

const DEBOUNCE_MS = 350;

// Same link-driven pattern as FilterChips — the URL (?q=...) is the source
// of truth, debounced locally so every keystroke doesn't trigger a
// navigation, but the actual filtering still happens server-side in
// IssuesPage, not in this component.
export function SearchInput({ initialValue }: { initialValue: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    const handle = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = value.trim();
      if (trimmed) params.set('q', trimmed);
      else params.delete('q');
      const query = params.toString();
      const next = query ? `${pathname}?${query}` : pathname;
      const current = searchParams.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname;
      if (next !== current) router.push(next);
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [value, pathname, router, searchParams]);

  return (
    <div className="max-w-xs">
      <Input
        label="Search issues"
        type="search"
        placeholder="Search by title..."
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
    </div>
  );
}
