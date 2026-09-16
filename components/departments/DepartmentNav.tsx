'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

const DEPARTMENTS = [
  { label: 'Finance', href: '/departments/finance' },
  { label: 'Inventory', href: '/departments/inventory' },
  { label: 'Logistics', href: '/departments/logistics' },
  { label: 'Customer', href: '/departments/customer' },
];

export function DepartmentNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Departments"
      className="mt-(--space-2) flex gap-(--space-4) border-b border-(--color-border-subtle)"
    >
      {DEPARTMENTS.map((dept) => {
        const isActive = pathname === dept.href;
        return (
          <Link
            key={dept.href}
            href={dept.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'border-b-2 border-transparent pb-(--space-2) text-(--color-text-secondary) [font:var(--font-label)]',
              'focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:outline-none',
              isActive &&
                'border-(--color-brand-accent) text-(--color-brand-accent)',
            )}
          >
            {dept.label}
          </Link>
        );
      })}
    </nav>
  );
}
