// Split out from (marketing) so auth flows don't inherit marketing-site
// chrome as that route group grows real content (pricing, about, etc.) —
// see the implementation-plan review. No session check here; middleware
// already redirects an authenticated user away from these routes.
//
// The logo used to live here, above the form card — moved inside each
// page's own Card instead (top, centered) so it reads as part of the form
// container rather than a separate page-level element. See each page's own
// logo block for the link/BrandMark markup, kept identical across all four
// auth pages since they're one continuous flow.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-(--color-surface-base) px-(--space-4)">
      {children}
    </div>
  );
}
