import { DepartmentNav } from '@/components/departments/DepartmentNav';

// Department views: finance/, inventory/, logistics/, customer/ — each a
// scoped view, per architecture.md's Directory Layout. Workforce
// deliberately excluded — see the implementation plan's decision log and
// AGENTS.md's Non-Negotiable #7 on employee-surveillance features.
export default function DepartmentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex max-w-5xl flex-col gap-(--space-6)">
      <div>
        <h1 className="[font:var(--font-h1)]">Departments</h1>
        <DepartmentNav />
      </div>
      {children}
    </div>
  );
}
