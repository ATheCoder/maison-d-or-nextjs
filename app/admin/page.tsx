import Link from 'next/link';
import { requireAdmin } from '@/lib/dal';
import SignOutButton from '@/components/auth/SignOutButton';

export const metadata = { title: 'Admin — Maison d\'Oré' };

// The four dead "arrives in phase 4" cards are gone: editions, good news, on
// this day and greatest moments are all authored from the Daily Gold desk,
// which answers the question those cards never could — is tomorrow ready?
const SECTIONS: { title: string; href?: string; blurb: string }[] = [
  {
    title: 'Daily Gold desk',
    href: '/admin/daily-gold',
    blurb: 'Editions, good news, On This Day and Greatest Moments — and what a family will see for the next seven days.',
  },
  {
    title: 'Remarkable people',
    href: '/admin/people',
    blurb: 'Browse, create and edit Born Today people.',
  },
];

export default async function AdminPage() {
  const session = await requireAdmin();

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F5F0E7',
      padding: '3rem clamp(1.5rem, 5vw, 4rem)',
      fontFamily: 'Lato, sans-serif',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2rem' }}>
        <div>
          <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#C9A96E', margin: '0 0 0.4rem' }}>
            Maison d&apos;Oré — Administration
          </p>
          <h1 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.9rem', fontWeight: 600, color: '#241A0C', margin: 0 }}>
            Welcome, {session.user.name}
          </h1>
        </div>
        <SignOutButton />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
        {SECTIONS.map((s) => {
          const live = Boolean(s.href);
          const card = (
            <div style={{
              background: 'rgba(255,248,238,0.8)',
              border: `1px solid ${live ? 'rgba(201,169,110,0.5)' : 'rgba(201,169,110,0.25)'}`,
              borderRadius: 14,
              padding: '1.5rem 1.25rem',
              color: '#5C4A2A',
              height: '100%',
              boxSizing: 'border-box',
            }}>
              <h2 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.05rem', fontWeight: 600, margin: '0 0 0.4rem', color: '#241A0C' }}>
                {s.title}
              </h2>
              <p style={{ fontSize: '0.78rem', margin: 0, color: '#8B7355' }}>
                {s.blurb}
              </p>
            </div>
          );
          return s.href
            ? <Link key={s.title} href={s.href} style={{ textDecoration: 'none' }}>{card}</Link>
            : <div key={s.title}>{card}</div>;
        })}
      </div>
    </div>
  );
}
