import type { ReactNode } from 'react';
import Link from 'next/link';
import { requireAdmin } from '@/lib/dal';
import { Card, Heading, Note, PageHeader, Prose, Stat } from '@/components/ds';
import { findDuplicateEditions, getDeskCoverage, getWeekAhead } from './daily-gold/actions';

export const metadata = { title: 'Admin — Maison d\'Oré' };

/**
 * The admin front page.
 *
 * It used to be two cards holding a sentence each — a menu, and once AdminChrome
 * put both sections in a bar above every screen, a menu that said nothing the
 * bar was not already saying. A landing page whose only job is navigation, on a
 * surface that now navigates from everywhere, has no job.
 *
 * So it answers the question the cards could not: is anything waiting for me. It
 * reads the same three aggregates the Daily Gold desk already runs — no new
 * queries — and states, per section, the two numbers that matter and the one
 * line that is a claim on your attention.
 *
 * `listPeople()` is deliberately NOT called here. It returns every column of
 * every person for the whole library, which is right for the library and absurd
 * for two figures; `getDeskCoverage` carries `peopleTotal` and `peopleDrafts`
 * off an aggregate it was already running.
 */
export default async function AdminPage() {
  const session = await requireAdmin();

  const today = new Date().toISOString().slice(0, 10);
  const [coverage, week, duplicates] = await Promise.all([
    getDeskCoverage(),
    getWeekAhead(today),
    findDuplicateEditions(),
  ]);

  const readyThisWeek = week.filter((d) => d.status === 'ready').length;
  const todayLive = week.find((d) => d.date === today)?.status === 'ready';
  // 366, February 29 included — the library counts the year the same way.
  // Derived from peopleDaysCovered rather than from almanac[].peopleCount,
  // which counts published people only: the library's "uncovered days" tile
  // means "nobody is written for this day at all", and this page has to say
  // the same number the page it links to says.
  const daysUncovered = 366 - coverage.peopleDaysCovered;

  return (
    <div className="px-6 py-12 sm:px-10 lg:px-16">
      {/* The Sign out button that used to sit in `actions` is gone: it now lives
          in AdminChrome, where it is reachable from all six admin screens
          instead of only from this one. */}
      <PageHeader
        className="mb-8"
        eyebrow={<>Maison d&apos;Or&eacute; &mdash; Administration</>}
        title={`Welcome, ${session.user.name}`}
        lede="What the two desks look like right now."
      />

      <div className="grid max-w-[1000px] gap-5 lg:grid-cols-2">
        <SectionCard
          href="/admin/daily-gold"
          title="Daily Gold desk"
          blurb="Editions, good news, On This Day and Greatest Moments."
          stats={[
            { figure: coverage.liveDates, label: 'dates a family can open' },
            { figure: readyThisWeek, unit: '/ 7', label: 'of the next seven days ready' },
          ]}
          // The desk's own framing: the week is the only number with a deadline
          // attached, and today being dark is the alarm that outranks it.
          alarm={
            !todayLive
              ? 'Nothing is live for today.'
              : readyThisWeek < 7
                ? `${7 - readyThisWeek} of the next seven days ${7 - readyThisWeek === 1 ? 'has' : 'have'} no edition.`
                : duplicates.length > 0
                  ? `${duplicates.length} date${duplicates.length === 1 ? '' : 's'} ${duplicates.length === 1 ? 'has' : 'have'} conflicting editions.`
                  : null
          }
          quiet={
            <>
              {coverage.almanacDaysCovered} of 366 almanac days have something authored
              {coverage.newestLiveDate ? <> &middot; newest edition {coverage.newestLiveDate}</> : null}
            </>
          }
        />

        <SectionCard
          href="/admin/people"
          title="Remarkable people"
          blurb="Browse, create and edit the Born Today library."
          stats={[
            { figure: coverage.peopleTotal, label: 'books in the library' },
            { figure: coverage.peopleDrafts, label: 'still in draft' },
          ]}
          alarm={
            coverage.peopleMissingCountryCode > 0
              ? `${coverage.peopleMissingCountryCode} ${coverage.peopleMissingCountryCode === 1 ? 'person has' : 'people have'} no country code.`
              : null
          }
          quiet={<>{daysUncovered} of 366 days of the year still uncovered</>}
        />
      </div>
    </div>
  );
}

function SectionCard({
  href,
  title,
  blurb,
  stats,
  alarm,
  quiet,
}: {
  href: string;
  title: string;
  blurb: string;
  stats: { figure: number; unit?: string; label: string }[];
  /** The one line that is a claim on attention, or null when nothing is. */
  alarm: string | null;
  /** The standing facts — true whether or not anything needs doing. */
  quiet: ReactNode;
}) {
  return (
    // The whole card is the target, so the coat belongs to the card and the link
    // brings only the navigation — no underline, no second ink. The focus ring is
    // drawn on the anchor because that is what receives focus. Nothing inside is
    // itself a link: a link within a link is not a thing.
    <Link
      href={href}
      className="rounded-lg no-underline focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
    >
      <Card tone="raised" elevation="card" radius="lg" className="flex h-full flex-col gap-4">
        <div>
          <Heading level={2} variant="story">
            {title}
          </Heading>
          <Prose variant="caption" className="mt-1.5" measure={false}>
            {blurb}
          </Prose>
        </div>

        <div className="flex flex-wrap gap-x-10 gap-y-4">
          {stats.map((s) => (
            <Stat
              key={s.label}
              size="sm"
              figure={s.figure}
              unit={s.unit}
              label={s.label}
            />
          ))}
        </div>

        {alarm && <Note padding="sm">{alarm}</Note>}

        <Prose variant="caption" measure={false} className="mt-auto">
          {quiet}
        </Prose>
      </Card>
    </Link>
  );
}
