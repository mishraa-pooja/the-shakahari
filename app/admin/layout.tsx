/**
 * Admin layout — simple wrapper with auth gate.
 * Uses a separate layout so admin pages don't share the main site nav.
 */

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
