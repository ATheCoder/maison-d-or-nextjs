import Link from 'next/link';
import { requireAdmin } from '@/lib/dal';
import SignOutButton from '@/components/auth/SignOutButton';
import { Card, Eyebrow, Heading, Prose } from '@/components/ds';

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
    <div className="min-h-dvh px-6 py-12 sm:px-10 lg:px-16">
      <div className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <Eyebrow rule={false}>Maison d&apos;Oré — Administration</Eyebrow>
          {/* level 1: this is the admin's front page and its heading is the
              page's, but at the section scale — the desk below is the content,
              not this line. */}
          <Heading level={1} variant="section" className="mt-1.5">
            Welcome, {session.user.name}
          </Heading>
        </div>
        <SignOutButton />
      </div>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
        {SECTIONS.map((s) => {
          const card = (
            <Card
              tone="raised"
              elevation="card"
              radius="lg"
              className={`h-full${s.href ? '' : ' opacity-60'}`}
            >
              <Heading level={2} variant="story">
                {s.title}
              </Heading>
              <Prose variant="caption" className="mt-1.5" measure={false}>
                {s.blurb}
              </Prose>
            </Card>
          );
          return s.href ? (
            // The whole card is the target, so the coat belongs to the card and
            // the link brings only the navigation — no underline, no second
            // ink. The focus ring is the card's outline, drawn on the anchor
            // because that is what receives focus.
            <Link
              key={s.title}
              href={s.href}
              className="rounded-lg no-underline focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            >
              {card}
            </Link>
          ) : (
            <div key={s.title}>{card}</div>
          );
        })}
      </div>
    </div>
  );
}
