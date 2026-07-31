import { describe, expect, it } from 'vitest';
import {
  buildShelf,
  buildWeekBars,
  conversationStarters,
  editionStreak,
  foldBands,
  milestoneFeed,
  recapBreakdown,
  rhythmSentence,
  sectionLabel,
  sessionSpans,
  storyState,
  typicalSession,
  type SessionMark,
  type StoryRow,
} from './derive';
import { EDITION_PAPER_SECTIONS } from './constants';

const TODAY = '2026-07-30';
const MIN = 60_000;

/** Marks are epoch ms; the base is arbitrary because only the deltas matter. */
const T0 = new Date('2026-07-30T18:00:00.000Z').getTime();
const mark = (type: SessionMark['type'], minutes: number): SessionMark => ({ type, at: T0 + minutes * MIN });

const story = (over: Partial<StoryRow> = {}): StoryRow => ({
  storyId: 's1',
  title: 'The Star Cartographer',
  pagesReached: 14,
  sittings: 3,
  ms: 41 * MIN,
  lastDay: TODAY,
  finishedDay: null,
  ...over,
});

describe('buildWeekBars', () => {
  const keys = ['2026-07-24', '2026-07-25', '2026-07-26', '2026-07-27', '2026-07-28', '2026-07-29', '2026-07-30'];

  it('emits one bar per day, zero-filling the days with no rows', () => {
    const bars = buildWeekBars(keys, [{ day: '2026-07-28', ms: 12 * MIN }], TODAY);
    expect(bars).toHaveLength(7);
    expect(bars.map((bar) => bar.minutes)).toEqual([0, 0, 0, 0, 12, 0, 0]);
    // A quiet day is a real zero, not a gap — it must still occupy a column.
    expect(bars[0].height).toBe(0);
  });

  it('labels the last bar "Today" and the rest by weekday', () => {
    const bars = buildWeekBars(keys, [], TODAY);
    expect(bars.at(-1)?.label).toBe('Today');
    expect(bars.at(-1)?.isToday).toBe(true);
    expect(bars[0].label).toBe('Fri');
  });

  it('scales heights against the peak and highlights peak and today', () => {
    const bars = buildWeekBars(keys, [
      { day: '2026-07-25', ms: 22 * MIN },
      { day: '2026-07-30', ms: 11 * MIN },
    ], TODAY);
    expect(bars[1].height).toBe(100);
    expect(bars[1].isHighlight).toBe(true); // the peak
    expect(bars[6].height).toBe(50);
    expect(bars[6].isHighlight).toBe(true); // today
    expect(bars[0].isHighlight).toBe(false);
  });

  it('does not highlight a zero today', () => {
    const bars = buildWeekBars(keys, [{ day: '2026-07-25', ms: 5 * MIN }], TODAY);
    expect(bars.at(-1)?.isHighlight).toBe(false);
  });
});

describe('sessionSpans', () => {
  it('pairs each resume with the pause that follows it', () => {
    expect(sessionSpans([mark('session_resume', 0), mark('session_pause', 12)])).toEqual([12 * MIN]);
  });

  it('sorts before pairing, so a batch that arrives out of order still reads right', () => {
    expect(sessionSpans([mark('session_pause', 12), mark('session_resume', 0)])).toEqual([12 * MIN]);
  });

  // Running an unclosed resume to "now" would invent minutes nobody spent.
  it('drops a resume that never closed', () => {
    expect(sessionSpans([mark('session_resume', 0)])).toEqual([]);
    expect(sessionSpans([mark('session_resume', 0), mark('session_pause', 5), mark('session_resume', 30)]))
      .toEqual([5 * MIN]);
  });

  it('drops a pause with nothing open — a carryover from a lost session', () => {
    expect(sessionSpans([mark('session_pause', 3)])).toEqual([]);
  });

  // A lost pause shows up as two resumes in a row; the earlier open wins so the
  // sitting is not silently split into a shorter one.
  it('keeps the earlier open when a pause was lost', () => {
    expect(sessionSpans([mark('session_resume', 0), mark('session_resume', 4), mark('session_pause', 10)]))
      .toEqual([10 * MIN]);
  });

  it('merges sittings separated by less than a minute', () => {
    const spans = sessionSpans([
      mark('session_resume', 0), mark('session_pause', 5),
      mark('session_resume', 5.5), mark('session_pause', 9),
    ]);
    expect(spans).toEqual([9 * MIN]);
  });

  it('keeps sittings separated by more than a minute apart', () => {
    const spans = sessionSpans([
      mark('session_resume', 0), mark('session_pause', 5),
      mark('session_resume', 20), mark('session_pause', 26),
    ]);
    expect(spans).toEqual([5 * MIN, 6 * MIN]);
  });

  // 30s heartbeats mean a longer silence is a dead tab, not a marathon.
  it('caps a span at 90 minutes', () => {
    expect(sessionSpans([mark('session_resume', 0), mark('session_pause', 400)])).toEqual([90 * MIN]);
  });

  it('discards a zero-length or inverted pair', () => {
    expect(sessionSpans([mark('session_resume', 5), mark('session_pause', 5)])).toEqual([]);
  });

  it('is empty for an empty input', () => {
    expect(sessionSpans([])).toEqual([]);
  });
});

describe('foldBands', () => {
  it('folds the small hours into the evening rather than the morning', () => {
    // 00:30 is a late evening. Giving it a band of its own would also leak a
    // finer sense of "when" than the spec allows.
    const { bands, topPhrase } = foldBands([{ hour: 0, ms: 30 * MIN }]);
    expect(bands.find((band) => band.key === 'evening')?.level).toBe(3);
    expect(bands.find((band) => band.key === 'morning')?.level).toBe(0);
    expect(topPhrase).toBe('in the evening');
  });

  it.each([
    [7, 'morning'],
    [12, 'midday'],
    [16, 'after_school'],
    [20, 'evening'],
    [23, 'evening'],
    [4, 'evening'],
  ])('hour %s lands in %s', (hour, key) => {
    const { bands } = foldBands([{ hour, ms: 10 * MIN }]);
    expect(bands.find((band) => band.key === key)?.level).toBe(3);
  });

  it('grades levels by share, not by absolute minutes', () => {
    const { bands } = foldBands([
      { hour: 7, ms: 5 * MIN }, // 5%  → faint
      { hour: 12, ms: 20 * MIN }, // 20% → mid
      { hour: 20, ms: 75 * MIN }, // 75% → solid
    ]);
    expect(bands.map((band) => band.level)).toEqual([1, 2, 0, 3]);
  });

  // A band the child demonstrably used must not render as an empty bar.
  it('never grades a used band as level 0', () => {
    const { bands } = foldBands([{ hour: 7, ms: 1 }, { hour: 20, ms: 10_000 * MIN }]);
    expect(bands.find((band) => band.key === 'morning')?.level).toBe(1);
  });

  it('has no top phrase when there is nothing to fold', () => {
    const { bands, topPhrase } = foldBands([]);
    expect(bands.every((band) => band.level === 0)).toBe(true);
    expect(topPhrase).toBeNull();
  });
});

describe('typicalSession', () => {
  it.each([
    [[3 * MIN, 4 * MIN, 2 * MIN], { lowMin: 0, highMin: 5 }],
    [[6 * MIN, 8 * MIN, 7 * MIN], { lowMin: 5, highMin: 10 }],
    [[11 * MIN, 12 * MIN, 14 * MIN], { lowMin: 10, highMin: 15 }],
    [[20 * MIN, 22 * MIN, 16 * MIN], { lowMin: 15, highMin: 25 }],
    [[30 * MIN, 35 * MIN, 28 * MIN], { lowMin: 25, highMin: 40 }],
    [[85 * MIN, 88 * MIN, 90 * MIN], { lowMin: 60, highMin: 90 }],
  ])('%o → %o', (spans, expected) => {
    expect(typicalSession(spans)).toEqual(expected);
  });

  // A median, not a mean: one long Saturday must not rewrite the sentence a
  // parent reads about a normal Tuesday.
  it('is not dragged by a single outlier', () => {
    expect(typicalSession([11 * MIN, 12 * MIN, 13 * MIN, 90 * MIN])).toEqual({ lowMin: 10, highMin: 15 });
  });

  it('averages the middle pair for an even count', () => {
    expect(typicalSession([8 * MIN, 12 * MIN])).toEqual({ lowMin: 10, highMin: 15 });
  });

  it('is null with nothing to summarise', () => {
    expect(typicalSession([])).toBeNull();
  });
});

describe('rhythmSentence', () => {
  it('names the child rather than guessing a pronoun', () => {
    expect(rhythmSentence('Rhaenyra', { lowMin: 10, highMin: 15 }, 'in the evening'))
      .toBe('Rhaenyra usually reads 10–15 minutes, mostly in the evening.');
  });

  it('phrases the bottom bucket as "under", not as a range starting at zero', () => {
    expect(rhythmSentence('Darius', { lowMin: 0, highMin: 5 }, 'after school'))
      .toBe('Darius usually reads under 5 minutes, mostly after school.');
  });

  it('drops the clause when no band stands out', () => {
    expect(rhythmSentence('Rhaenyra', { lowMin: 5, highMin: 10 }, null))
      .toBe('Rhaenyra usually reads 5–10 minutes.');
  });

  it('is null when there is no typical sitting', () => {
    expect(rhythmSentence('Rhaenyra', null, 'in the evening')).toBeNull();
  });
});

describe('storyState / buildShelf', () => {
  it.each([
    [{ finishedDay: '2026-07-25', lastDay: '2026-07-25' }, 'finished'],
    [{ lastDay: TODAY }, 'reading'],
    [{ lastDay: '2026-07-16' }, 'reading'], // 14 days is still reading
    [{ lastDay: '2026-07-15' }, 'set_aside'], // 15 is not
    // A book finished long ago stays finished; it never decays to "set aside".
    [{ finishedDay: '2026-01-01', lastDay: '2026-01-01' }, 'finished'],
  ])('%o → %s', (over, expected) => {
    expect(storyState(story(over), TODAY)).toBe(expected);
  });

  it('orders reading first, then finished, then set aside', () => {
    const shelf = buildShelf([
      story({ storyId: 'aside', lastDay: '2026-06-01', ms: 90 * MIN }),
      story({ storyId: 'done', finishedDay: '2026-07-25', lastDay: '2026-07-25', ms: 20 * MIN }),
      story({ storyId: 'now', lastDay: TODAY, ms: 10 * MIN }),
    ], TODAY);
    expect(shelf.map((book) => book.storyId)).toEqual(['now', 'done', 'aside']);
  });

  // The track cannot be fraction-of-book — page totals are unknowable — so it
  // encodes relative attention on this child's own shelf instead.
  it('fills relative to the most-read book, and fills a finished book fully', () => {
    const shelf = buildShelf([
      story({ storyId: 'long', lastDay: TODAY, ms: 40 * MIN }),
      story({ storyId: 'short', lastDay: TODAY, ms: 10 * MIN }),
      story({ storyId: 'done', finishedDay: '2026-07-25', lastDay: '2026-07-25', ms: 1 * MIN }),
    ], TODAY);
    expect(shelf.find((book) => book.storyId === 'long')?.fill).toBe(100);
    expect(shelf.find((book) => book.storyId === 'short')?.fill).toBe(25);
    expect(shelf.find((book) => book.storyId === 'done')?.fill).toBe(100);
  });

  it('keeps a barely-read book visible rather than at hairline zero', () => {
    const shelf = buildShelf([
      story({ storyId: 'long', ms: 600 * MIN }),
      story({ storyId: 'tiny', ms: 1 * MIN }),
    ], TODAY);
    expect(shelf.find((book) => book.storyId === 'tiny')?.fill).toBe(4);
  });

  it.each([
    [{ lastDay: TODAY, pagesReached: 7, sittings: 2, ms: 12 * MIN }, '7 pages in · 2 sittings · 12 min'],
    [{ lastDay: TODAY, pagesReached: 1, sittings: 1, ms: 30_000 }, '1 page in · 1 sitting · 1 min'],
    [
      { finishedDay: '2026-07-25', lastDay: '2026-07-25', pagesReached: 18, sittings: 2 },
      '18 pages · finished Saturday 25 July · 2 sittings',
    ],
    [{ lastDay: '2026-07-12', pagesReached: 6 }, '6 pages in · last read 12 July'],
  ])('%o reads "%s"', (over, expected) => {
    expect(buildShelf([story(over)], TODAY)[0].meta).toBe(expected);
  });

  it('names an untitled book rather than rendering a blank row', () => {
    expect(buildShelf([story({ title: null })], TODAY)[0].title).toBe('A story');
    expect(buildShelf([story({ title: '   ' })], TODAY)[0].title).toBe('A story');
  });

  it('is empty for an empty shelf', () => {
    expect(buildShelf([], TODAY)).toEqual([]);
  });
});

describe('editionStreak', () => {
  it('counts consecutive edition dates ending today', () => {
    expect(editionStreak(['2026-07-28', '2026-07-29', '2026-07-30'], TODAY)).toBe(3);
  });

  // A streak must not read as broken all morning, before today's paper is open.
  it('anchors on yesterday when today has not been opened yet', () => {
    expect(editionStreak(['2026-07-28', '2026-07-29'], TODAY)).toBe(2);
  });

  it('is zero once two days have been missed', () => {
    expect(editionStreak(['2026-07-27', '2026-07-28'], TODAY)).toBe(0);
  });

  it('stops at the first gap rather than counting every edition ever', () => {
    expect(editionStreak(['2026-07-20', '2026-07-21', '2026-07-29', '2026-07-30'], TODAY)).toBe(2);
  });

  it('is unbothered by duplicates and by order', () => {
    expect(editionStreak(['2026-07-30', '2026-07-29', '2026-07-30', '2026-07-28'], TODAY)).toBe(3);
  });

  it('crosses a month boundary', () => {
    expect(editionStreak(['2026-06-30', '2026-07-01', '2026-07-02'], '2026-07-02')).toBe(3);
  });

  it('is zero with no editions at all', () => {
    expect(editionStreak([], TODAY)).toBe(0);
  });
});

describe('milestoneFeed', () => {
  const base = { todayKey: TODAY, flags: [], finishedStories: [], firstSections: [], streak: 0 };

  it('orders newest first and caps the feed', () => {
    const feed = milestoneFeed({
      ...base,
      flags: Array.from({ length: 10 }, (_, i) => ({ countryName: `C${i}`, day: `2026-07-${10 + i}` })),
    });
    expect(feed).toHaveLength(8);
    expect(feed[0].day).toBe('2026-07-19');
    expect(feed.at(-1)?.day).toBe('2026-07-12');
  });

  it('separates the emphasis so a title can be italicised without markup in a string', () => {
    const [item] = milestoneFeed({ ...base, finishedStories: [{ title: 'Nour and the Paper Boats', day: '2026-07-25' }] });
    expect(item).toMatchObject({
      kind: 'story_finished',
      prefix: 'Finished ',
      emphasis: 'Nour and the Paper Boats',
      when: 'Saturday',
      tone: 'gold',
    });
  });

  it('marks a first-ever section in sage, not gold', () => {
    const [item] = milestoneFeed({ ...base, firstSections: [{ section: 'greatest_moments', day: '2026-07-30' }] });
    expect(item).toMatchObject({ emphasis: 'Greatest Moments', tone: 'sage', when: 'Thursday' });
  });

  it.each([[2, 0], [3, 1], [9, 1]])('a streak of %s contributes %s milestone(s)', (streak, expected) => {
    const feed = milestoneFeed({ ...base, streak });
    expect(feed.filter((item) => item.kind === 'streak')).toHaveLength(expected);
  });

  // "editions in a row", never "days in a row" — catching up on a backlog keeps
  // a streak, and calling it days would be the wrong claim.
  it('phrases a streak in editions', () => {
    const [item] = milestoneFeed({ ...base, streak: 5 });
    expect(item.prefix).toBe('5 editions opened in a row');
    expect(item.emphasis).toBeNull();
  });

  it('drops entries with no day or no name rather than rendering a stub', () => {
    expect(milestoneFeed({
      ...base,
      flags: [{ countryName: '', day: '2026-07-30' }],
      finishedStories: [{ title: 'Ghost', day: '' }],
    })).toEqual([]);
  });

  it('is empty for a child with nothing to celebrate yet', () => {
    expect(milestoneFeed(base)).toEqual([]);
  });
});

describe('recapBreakdown', () => {
  it('counts against the nine sections a child reads', () => {
    expect(EDITION_PAPER_SECTIONS).toHaveLength(9);
    // for_parents is rendered too, but counting it would cap every child at 9 of 10.
    expect(EDITION_PAPER_SECTIONS).not.toContain('for_parents');
  });

  it('reports visited, total and the skipped labels', () => {
    const result = recapBreakdown([...EDITION_PAPER_SECTIONS], ['hero', 'on_this_day', 'destination', 'values']);
    expect(result.visited).toBe(4);
    expect(result.total).toBe(9);
    expect(result.skipped).toEqual(['Born Today', 'Good News', 'Greatest Moments', 'Inspiration', 'More to Explore']);
  });

  // A section that was never printed cannot be "skipped".
  it('shrinks the denominator on a day with no good news', () => {
    const printed = EDITION_PAPER_SECTIONS.filter((section) => section !== 'good_news');
    const result = recapBreakdown(printed, ['hero']);
    expect(result.total).toBe(8);
    expect(result.skipped).not.toContain('Good News');
  });

  it('ignores visits to sections outside the paper', () => {
    const result = recapBreakdown([...EDITION_PAPER_SECTIONS], ['hero', 'story', 'collection', 'for_parents']);
    expect(result.visited).toBe(1);
  });
});

describe('conversationStarters', () => {
  const shelf = buildShelf([story({ lastDay: TODAY, pagesReached: 14 })], TODAY);

  it('renders one starter per available source, newest flag included', () => {
    const starters = conversationStarters({
      name: 'Rhaenyra',
      topContent: [{ label: 'Marie Curie', ms: 9 * MIN }],
      shelf,
      flags: [{ countryName: 'Portugal', day: '2026-07-28' }],
    });
    expect(starters).toEqual([
      { text: 'Ask Rhaenyra about Marie Curie.', why: '9 min with it this month.' },
      { text: 'Ask how The Star Cartographer is going.', why: 'Rhaenyra is 14 pages in.' },
      { text: 'Ask about the flag of Portugal.', why: 'Earned Tuesday.' },
    ]);
  });

  it('caps at three so the rail stays a prompt, not a list', () => {
    const starters = conversationStarters({
      name: 'Rhaenyra',
      topContent: [{ label: 'A', ms: MIN }, { label: 'B', ms: MIN }],
      shelf,
      flags: [{ countryName: 'Portugal', day: '2026-07-28' }, { countryName: 'Peru', day: '2026-07-27' }],
    });
    expect(starters).toHaveLength(3);
  });

  it('skips content with no stored label rather than asking about nothing', () => {
    const starters = conversationStarters({
      name: 'Rhaenyra',
      topContent: [{ label: null, ms: 9 * MIN }, { label: '  ', ms: 5 * MIN }],
      shelf: [],
      flags: [],
    });
    expect(starters).toEqual([]);
  });

  it('skips a book with no pages read — "0 pages in" is not a conversation', () => {
    const untouched = buildShelf([story({ lastDay: TODAY, pagesReached: 0 })], TODAY);
    expect(conversationStarters({ name: 'Rhaenyra', topContent: [], shelf: untouched, flags: [] })).toEqual([]);
  });

  it('does not offer a finished or set-aside book as "how is it going"', () => {
    const done = buildShelf([story({ finishedDay: '2026-07-25', lastDay: '2026-07-25' })], TODAY);
    expect(conversationStarters({ name: 'Rhaenyra', topContent: [], shelf: done, flags: [] })).toEqual([]);
  });

  // The module hides entirely rather than reaching for something to say.
  it('is empty when nothing can be generated honestly', () => {
    expect(conversationStarters({ name: 'Rhaenyra', topContent: [], shelf: [], flags: [] })).toEqual([]);
  });
});

describe('sectionLabel', () => {
  it('uses the child’s own words for the page', () => {
    expect(sectionLabel('on_this_day')).toBe('On This Day');
    expect(sectionLabel('more_to_explore')).toBe('More to Explore');
  });

  it('falls back to the raw id rather than to a blank chip', () => {
    expect(sectionLabel('a_section_from_the_future')).toBe('a_section_from_the_future');
  });
});
