import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/dal';

/**
 * Placeholder for the almanac editor (plan Phase 6). The desk's 366-cell grid
 * links every cell here, so this lands those links somewhere honest.
 */
export const dynamic = 'force-dynamic';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export default async function AlmanacEditorPlaceholder({ params }: { params: Promise<{ monthDay: string }> }) {
  await requireAdmin();
  const { monthDay } = await params;
  if (!/^\d{2}-\d{2}$/.test(monthDay)) notFound();

  const [mm, dd] = monthDay.split('-').map(Number);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) notFound();
  const label = `${dd} ${MONTHS[mm - 1]}`;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f0e7', fontFamily: 'Lato, system-ui, sans-serif', padding: '56px 40px' }}>
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        <div style={{ font: '700 10px/1.4 Lato, sans-serif', letterSpacing: '.26em', textTransform: 'uppercase', color: '#a8843f' }}>
          Almanac · {monthDay}
        </div>
        <h1 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 28, fontWeight: 600, color: '#241a0c', margin: '10px 0 12px' }}>
          The almanac editor is not built yet
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: '#5c4a2a', margin: '0 0 22px' }}>
          <b>{label}, every year.</b> On This Day and Greatest Moments are keyed to the month-day, so
          anything authored here would appear on every future {label}. Editing them arrives with
          Phase&nbsp;6.
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
