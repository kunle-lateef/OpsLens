import { BrandMark } from '@/components/ui/BrandMark';

// The sidebar's top row — now just the full logo, matching the marketing
// header and auth pages exactly (BrandMark variant="horizontal"
// tone="color", the same component and asset, not a new one). Notifications
// and the theme toggle moved out to DashboardShell's top-right bar — see the
// developer-approved sidebar-logo/top-bar preview.
export function SidebarHeader() {
  return (
    <div className="flex items-center border-b border-(--color-border-subtle) px-(--space-4) py-(--space-3)">
      <BrandMark variant="horizontal" tone="color" size={22} />
    </div>
  );
}
