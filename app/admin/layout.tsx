export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="parchment" className="min-h-dvh bg-surface-page">
      {children}
    </div>
  );
}
