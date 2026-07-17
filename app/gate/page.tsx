import { requireGuardian } from '@/lib/dal';
import GateForm from '@/components/auth/GateForm';

export const metadata = { title: 'Grown-ups only — Maison d\'Oré' };
export const dynamic = 'force-dynamic';

export default async function GatePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  await requireGuardian();
  const { next } = await searchParams;
  // Only same-origin paths — a full URL or protocol-relative value is dropped.
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/family';
  return <GateForm next={safeNext} />;
}
