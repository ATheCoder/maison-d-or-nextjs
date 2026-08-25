/**
 * What the fact-checker is allowed to check.
 *
 * `collectUnits` is pure, and every mistake it can make is silent. Two of them
 * would quietly break rules the bible is explicit about
 * (docs/golden-stories-bible.md):
 *
 *  - Sending the "If they were 10 today" NARRATIVE to be checked. That spread
 *    is imagination by design; every verdict it produced would be noise, and
 *    noise in an accuracy report is how a real finding gets skipped. Nothing
 *    throws if this regresses — the report just fills with nonsense.
 *  - Dropping its FACT. That fact is the true thing the daydream is built on
 *    and the reason the spread can carry "But this is true:" at all.
 *
 * The rest guards the ordinary way this decays: a new narrative field is added
 * to the book and nobody adds it here, so it is never checked and nobody
 * notices, because an unchecked passage looks exactly like a clean one.
 */
import { describe, expect, it } from 'vitest';
import { collectUnits } from './factcheck';
import { factCheckCounts } from './factCheckCounts';
import type { FactCheckReport, RemarkablePersonRow } from '@/src/db/schema';

// Only the fields collectUnits reads; the row is far wider than this.
const person = (over: Partial<RemarkablePersonRow> = {}) => ({
  slug: 'ada-lovelace',
  name: 'Ada Lovelace',
  role: 'Mathematician & First Programmer',
  field: 'Mathematics',
  country: 'England',
  birthDate: '1815-12-10',
  deathDate: '1852',
  famousQuote: 'That brain of mine is something more than merely mortal.',
  storyChildhood: 'Ada grew up among numbers.',
  storyChildhoodFact: 'Her father was the poet Lord Byron, whom she never knew.',
  storyTakeaway: 'Numbers can be poetry.',
  chapters: [
    { number: 1, title: 'The Engine', narrative: 'She met a machine.', fact: 'She wrote the first algorithm.' },
  ],
  timeline: [{ year: '1843', caption: 'Publishes her notes.' }],
  treasures: [{ name: 'Note G' }],
  afterTreasures: { narrative: 'Her notes outlived her.', fact: 'They were rediscovered a century later.' },
  modern: {
    narrative: 'She would be building robots in her bedroom.',
    fact: 'Her notes on the Analytical Engine ran three times longer than the paper they annotated.',
  },
  lessons: [{ icon_name: 'curiosity', lesson: 'Ask what a machine could become.' }],
  ...over,
} as unknown as RemarkablePersonRow);

const at = (path: string, units: ReturnType<typeof collectUnits>) =>
  units.find((u) => u.fieldPath === path);

describe('collectUnits', () => {
  it('never sends the modern narrative to be checked — that spread is imagination', () => {
    const units = collectUnits(person());
    const all = units.map((u) => u.text).join('\n');
    expect(all).not.toContain('building robots in her bedroom');
  });

  it('does check the modern FACT — the true thing the daydream stands on', () => {
    const unit = at('modern.fact', collectUnits(person()));
    expect(unit?.text).toContain('three times longer');
  });

  it('checks a section\'s narrative and its fact together', () => {
    const unit = at('story_childhood', collectUnits(person()));
    expect(unit?.text).toContain('Ada grew up among numbers.');
    expect(unit?.text).toContain('Lord Byron');
  });

  it('checks the dates, the quote, the timeline and the treasures', () => {
    const units = collectUnits(person());
    expect(at('birth_date', units)?.text).toContain('1815-12-10');
    expect(at('famous_quote', units)?.text).toContain('merely mortal');
    expect(at('timeline', units)?.text).toContain('1843');
    expect(at('treasures', units)?.text).toContain('Note G');
  });

  it('leaves reflections alone — a takeaway and a lesson are not claims', () => {
    const all = collectUnits(person()).map((u) => u.text).join('\n');
    expect(all).not.toContain('Numbers can be poetry');
    expect(all).not.toContain('Ask what a machine could become');
  });

  it('drops empty sections rather than reporting them unverifiable', () => {
    const units = collectUnits(person({
      famousQuote: null,
      storyChildhood: null,
      storyChildhoodFact: null,
    } as Partial<RemarkablePersonRow>));
    expect(at('famous_quote', units)).toBeUndefined();
    expect(at('story_childhood', units)).toBeUndefined();
  });

  it('survives a pre-bible book, which has no facts anywhere', () => {
    const units = collectUnits(person({
      storyChildhoodFact: null,
      chapters: [{ number: 1, title: 'The Engine', narrative: 'She met a machine.' }],
      afterTreasures: { narrative: 'Her notes outlived her.' },
      modern: { narrative: 'She would be building robots.' },
    } as unknown as Partial<RemarkablePersonRow>));
    // The narratives are still checkable, and the childhood unit is now just
    // the narrative with no fact appended. The modern spread contributes
    // nothing at all, which is correct: its narrative is never checked and it
    // has no fact to check.
    expect(at('story_childhood', units)?.text).toBe('Ada grew up among numbers.');
    expect(at('chapters.0.narrative', units)?.text).toBe('She met a machine.');
    expect(at('modern.fact', units)).toBeUndefined();
  });
});

describe('factCheckCounts', () => {
  const report = (verdicts: string[]): FactCheckReport => ({
    checkedAt: '2026-08-25T00:00:00.000Z',
    bookUpdatedAt: null,
    sources: [],
    claims: verdicts.map((v, i) => ({
      fieldPath: 'x', fieldLabel: 'X', claim: `c${i}`,
      verdict: v as FactCheckReport['claims'][number]['verdict'],
      note: '', correction: null, sourceUrl: null, sourceTitle: null, verified: false,
    })),
  });

  it('counts each verdict separately', () => {
    const s = factCheckCounts(report(['wrong', 'wrong', 'supported', 'unverifiable']));
    expect(s).toMatchObject({ wrong: 2, supported: 1, unverifiable: 1, unsupported: 0, total: 4 });
  });

  it('treats never-checked as an empty report, not an error', () => {
    expect(factCheckCounts(null)).toMatchObject({ total: 0, checked: false });
  });
});
