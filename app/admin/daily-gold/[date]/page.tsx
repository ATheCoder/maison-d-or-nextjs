import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/dal';

/**
 * Placeholder for the day editor (plan Phase 5). The desk already creates draft
 * rows and links here, so this exists to land those links somewhere honest
 * rather than on a 404. Replaced wholesale by the real editor.
 */
export const dynamic = 'force-dynamic';

export default async function DayEditorPlaceholder({ params }: { params: Promise<{ date: string }> }) {
  await requireAdmin();
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  return (
    <div style={{ minHeight: '100vh', background: '#f5f0e7', fontFamily: 'Lato, system-ui, sans-serif', padding: '56px 40px' }}>
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        <div style={{ font: '700 10px/1.4 Lato, sans-serif', letterSpacing: '.26em', textTransform: 'uppercase', color: '#a8843f' }}>
          Daily Gold · {date}
        </div>
        <h1 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 28, fontWeight: 600, color: '#241a0c', margin: '10px 0 12px' }}>
          The day editor is not built yet
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: '#5c4a2a', margin: '0 0 22px' }}>
          A draft edition row exists for {date} — it is saved, and no family can see it while its
          status is <code>draft</code>. Editing the masthead, destination, sensory trio and this
          day&rsquo;s good news arrives with Phase&nbsp;5.
        </p>
        <Link href="/admin/daily-gold" style={{
          display: 'inline-flex', padding: '10px 15px', borderRadius: 9,
          border: '1px solid rgba(201,169,110,.45)', background: '#fffdf8',
          color: '#5c4a2a', font: '700 12px/1 Lato, sans-serif', textDecoration: 'none',
        }}>← Back to the desk</Link>
      </div>
    </div>
  );
}
