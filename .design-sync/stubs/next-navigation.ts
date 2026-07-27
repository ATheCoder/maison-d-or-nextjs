// design-sync stub for `next/navigation`.
// Preview cards have no Next.js router; navigation calls become no-ops so a
// component that routes on click still renders (and stays clickable) in a card.
export function useRouter() {
  return {
    push: () => {},
    replace: () => {},
    back: () => {},
    forward: () => {},
    refresh: () => {},
    prefetch: () => {},
  };
}

export function usePathname(): string {
  return '/daily-gold-edition';
}

export function useSearchParams(): URLSearchParams {
  return new URLSearchParams();
}

export function useParams(): Record<string, string> {
  return {};
}

export function redirect(_url: string): void {}
export function notFound(): void {}
