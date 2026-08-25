/**
 * The fact-checker — "factual accuracy is non-negotiable"
 * (docs/golden-stories-bible.md) made into something that actually runs.
 *
 * It reuses the Daily Gold desk's verify-rather-than-trust machinery wholesale
 * rather than inventing a second one. The shape is the same and so is the
 * reasoning behind it (lib/daily-gold/retrieve.ts): a grounded request comes
 * back with the claim's source as the *model* reports it, and separately with
 * the citation list the *engine* recorded. `verify()` crosses the two, so a
 * claim sourced to a page the request never read is surfaced as unverifiable
 * instead of passing as checked. Everything here is a warning: the report never
 * gates publishing (Standing decision 2), because the admin is the only user
 * and a hard gate would cost more than it caught.
 *
 * Two deliberate omissions, both from the bible rather than from convenience:
 *
 *  - The "If they were 10 today" NARRATIVE is never checked. That spread is
 *    imagination by design and says so on the page; running it through a fact
 *    checker would be a category error, and every verdict it produced would be
 *    noise the admin has to learn to ignore. Its FACT is checked, because that
 *    is the true thing the daydream is built on.
 *  - The takeaway and the lessons are never checked. They are reflections, not
 *    claims, and there is nothing about them a source could confirm or deny.
 *
 * Server-side: these call OpenRouter and perform no writes. Turning a report
 * into a stored column is factcheckStore's job.
 */
import { runPromptDetailed, type ChatPrompt } from './brief.ts';
import { parseJsonReply, verify, type Citation } from './openrouter.ts';
import type { FactCheckClaim, FactCheckReport, RemarkablePersonRow } from '@/src/db/schema';

// ── The units a check runs over ──────────────────────────────────────────────

/**
 * One checkable piece of the book: where it lives, what to call it on screen,
 * and the text whose claims are up for checking.
 *
 * Checking runs one grounded request per unit rather than one for the whole
 * book. A single search cannot serve twenty claims spread across a life — the
 * sources it returns will be about whatever the longest passage was about, and
 * the rest get checked against nothing. Per-unit, each request searches for
 * what that passage actually says.
 */
export type CheckUnit = {
  fieldPath: string;
  fieldLabel: string;
  text: string;
};

const clean = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/** Join a section's narrative and fact into one unit; either may be missing. */
function sectionText(narrative: unknown, fact: unknown): string {
  const parts = [clean(narrative), clean(fact)].filter(Boolean);
  return parts.join('\n\n');
}

/**
 * Everything in this person's book that a source could confirm or deny, in
 * reading order. A unit with no text is dropped — an unwritten section is not
 * an unverifiable one.
 */
export function collectUnits(person: RemarkablePersonRow): CheckUnit[] {
  const units: CheckUnit[] = [];
  const push = (fieldPath: string, fieldLabel: string, text: string) => {
    if (text.trim()) units.push({ fieldPath, fieldLabel, text: text.trim() });
  };

  // Identity: the spine every other claim hangs off, and the one the reader is
  // most likely to repeat as fact. Born Today surfaces a person by this date.
  push('birth_date', 'Cover · dates and identity', [
    person.name,
    person.role ? `Described as: ${person.role}` : '',
    person.field ? `Field: ${person.field}` : '',
    person.country ? `Country: ${person.country}` : '',
    person.birthDate ? `Born: ${person.birthDate}` : '',
    person.deathDate ? `Died: ${person.deathDate}` : '',
  ].filter(Boolean).join('\n'));

  // A quote is the single most misattributed thing in a children's biography.
  push('famous_quote', 'Cover · famous quote',
    person.famousQuote ? `${person.name} is quoted as saying: "${person.famousQuote}"` : '');

  push('story_childhood', 'Childhood page',
    sectionText(person.storyChildhood, person.storyChildhoodFact));

  (person.chapters ?? []).forEach((c, i) => {
    push(`chapters.${i}.narrative`,
      `Chapter ${c.number ?? i + 1}${c.title ? ` · ${c.title}` : ''}`,
      sectionText(c.narrative, c.fact));
  });

  // The timeline is nothing but dates, which makes it the highest-yield unit in
  // the book and the cheapest to check.
  const timeline = (person.timeline ?? [])
    .filter((t) => clean(t.year) || clean(t.caption))
    .map((t) => `${clean(t.year)}: ${clean(t.caption)}`)
    .join('\n');
  push('timeline', 'Life timeline', timeline);

  const treasures = (person.treasures ?? [])
    .filter((t) => clean(t.name))
    .map((t) => [clean(t.name), clean(t.description)].filter(Boolean).join(' — '))
    .join('\n');
  push('treasures', 'Treasures',
    treasures ? `Works and contributions attributed to ${person.name}:\n${treasures}` : '');

  push('after_treasures.narrative', 'Gifts That Live On',
    sectionText(person.afterTreasures?.narrative, person.afterTreasures?.fact));

  // The narrative is imagination and is deliberately not here; the fact is.
  push('modern.fact', 'If they were 10 today · the fact',
    clean(person.modern?.fact));

  return units;
}

// ── The grounded ask ─────────────────────────────────────────────────────────

type JsonSchema = { type: string; [k: string]: unknown };
const str: JsonSchema = { type: 'string' };
const obj = (properties: Record<string, JsonSchema>): JsonSchema => ({
  type: 'object', properties, required: Object.keys(properties), additionalProperties: false,
});

const CLAIMS_SCHEMA = obj({
  claims: {
    type: 'array',
    items: obj({
      claim: str,
      verdict: { type: 'string', enum: ['supported', 'unsupported', 'wrong', 'unverifiable'] },
      note: str,
      correction: str,
      source_url: str,
      source_title: str,
    }),
  },
});

const CHECKER_SYSTEM = `You are the fact-checker for Maison d'Ore's Golden Stories, illustrated children's biographies of real people. Factual accuracy in these books is non-negotiable: they are read to children as true.

You are given one passage from one person's book. Find every CHECKABLE claim in it and rule on each against the sources you retrieve.

What counts as a checkable claim: a date, a place, a name, a relationship, a quotation, an achievement, a number, an event, or a specific anecdote. If the passage asserts that something happened, that is a claim.

What is NOT a claim, and must never be listed: feelings, atmosphere, imagery, moral reflections, and ordinary narrative colour ("he loved to wander", "she never gave up", "the world felt bigger"). These cannot be true or false. Listing them buries the real findings.

Rule on each claim:
- "supported" — the sources you read confirm it.
- "wrong" — the sources contradict it. Put what the sources actually say in "correction". This is the most valuable verdict you can return; do not soften it.
- "unsupported" — plausible and widely repeated, but you found nothing that establishes it. Common for famous anecdotes that turn out to be legend. Say so in "note".
- "unverifiable" — you could not retrieve anything that speaks to it either way.

For every claim, put in source_url the URL of the page you are actually relying on, copied exactly from the search results you were given. Never invent, guess, shorten or reconstruct a URL. If you are not relying on a specific retrieved page, leave source_url empty and rule "unverifiable" — an empty source is an honest answer and a fabricated one is the worst possible outcome here.

"note" is one plain sentence saying what the sources say. "correction" is empty unless the verdict is "wrong".

Return only claims. A passage with no checkable claims returns an empty list, which is a real and common answer.`;

/** The per-unit ask. The person's name rides in the prompt so the search has a subject. */
export function checkUnitPrompt(personName: string, unit: CheckUnit): ChatPrompt {
  return {
    system: CHECKER_SYSTEM,
    user: `Person: ${personName}
Passage: ${unit.fieldLabel}

"""
${unit.text}
"""

Check every factual claim in this passage about ${personName}.`,
    schema: CLAIMS_SCHEMA,
  };
}

const VERDICTS = ['supported', 'unsupported', 'wrong', 'unverifiable'] as const;
type Verdict = (typeof VERDICTS)[number];

const asVerdict = (v: unknown): Verdict =>
  (typeof v === 'string' && (VERDICTS as readonly string[]).includes(v) ? v : 'unverifiable') as Verdict;

const asUrl = (v: unknown): string | null => {
  const s = clean(v);
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:' ? s : null;
  } catch { return null; }
};

/**
 * Run one unit's grounded check.
 *
 * `verify` is the whole point of the exercise and the reason this cannot be a
 * plain ungrounded call: the model's `source_url` is a claim about its own
 * evidence, and crossing it against the engine's citation list is what turns
 * that claim into something the admin can act on.
 */
export async function checkUnit(personName: string, unit: CheckUnit):
  Promise<{ claims: FactCheckClaim[]; citations: Citation[] }> {
  const { text, citations } = await runPromptDetailed(
    checkUnitPrompt(personName, unit),
    {
      maxTokens: 3000,
      web: {
        maxResults: 8,
        searchPrompt: `Reference material about ${personName} for checking biographical claims: dates, places, quotations, works and documented anecdotes.`,
      },
    },
  );

  const parsed = parseJsonReply<{ claims?: unknown }>(text, `The fact-check of ${unit.fieldLabel}`);
  const rows = Array.isArray(parsed?.claims) ? parsed.claims as Record<string, unknown>[] : [];

  const claims = rows
    .filter((r) => clean(r.claim))
    .map((r): FactCheckClaim => {
      const sourceUrl = asUrl(r.source_url);
      const verdict = asVerdict(r.verdict);
      return {
        fieldPath: unit.fieldPath,
        fieldLabel: unit.fieldLabel,
        claim: clean(r.claim).slice(0, 500),
        verdict,
        note: clean(r.note).slice(0, 600),
        // Only a 'wrong' verdict has anything to correct; a correction carried
        // on any other verdict is the model padding the shape, and showing it
        // would invite an edit nobody asked for.
        correction: verdict === 'wrong' ? (clean(r.correction).slice(0, 600) || null) : null,
        sourceUrl,
        sourceTitle: clean(r.source_title).slice(0, 300) || null,
        verified: verify(sourceUrl, citations),
      };
    });

  return { claims, citations };
}

/** Most alarming first, so the report opens on what actually needs an edit. */
const SEVERITY: Record<Verdict, number> = { wrong: 0, unsupported: 1, unverifiable: 2, supported: 3 };

/**
 * Check a whole book, unit by unit.
 *
 * Sequential rather than parallel: each unit is its own grounded search, and a
 * fan-out of ten would spend the admin's OpenRouter credit in one burst for a
 * report nobody is watching in real time. `onProgress` lets the job stamp the
 * row as it goes so the editor's panel can say where it is.
 *
 * A unit that throws does not sink the report. Losing one passage's verdicts is
 * bad; losing the nine that already came back — including any 'wrong' — is
 * worse, so the failure is recorded as an unverifiable claim against that field
 * and the pass carries on.
 */
export async function checkBook(
  person: RemarkablePersonRow,
  onProgress?: (done: number, total: number, label: string) => Promise<void>,
): Promise<FactCheckReport> {
  const units = collectUnits(person);
  const claims: FactCheckClaim[] = [];
  const sources = new Map<string, string | null>();

  for (const [i, unit] of units.entries()) {
    await onProgress?.(i, units.length, unit.fieldLabel);
    try {
      const result = await checkUnit(person.name, unit);
      claims.push(...result.claims);
      for (const c of result.citations) if (!sources.has(c.url)) sources.set(c.url, c.title);
    } catch (err) {
      claims.push({
        fieldPath: unit.fieldPath,
        fieldLabel: unit.fieldLabel,
        claim: `Could not check this passage.`,
        verdict: 'unverifiable',
        note: err instanceof Error ? err.message.slice(0, 600) : String(err).slice(0, 600),
        correction: null,
        sourceUrl: null,
        sourceTitle: null,
        verified: false,
      });
    }
  }
  await onProgress?.(units.length, units.length, 'done');

  claims.sort((a, b) => SEVERITY[a.verdict] - SEVERITY[b.verdict]);

  return {
    checkedAt: new Date().toISOString(),
    bookUpdatedAt: person.updatedAt ? new Date(person.updatedAt).toISOString() : null,
    claims,
    sources: [...sources].map(([url, title]) => ({ url, title })),
  };
}

/** Re-exported so callers of the checker do not have to know where the tally lives. */
export { factCheckCounts } from './factCheckCounts.ts';
