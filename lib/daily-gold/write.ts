/**
 * The Daily Gold writer (Phase 8) — house voice, per-field rewrite prompts, and
 * the whole-day draft schema.
 *
 * Deliberately separate from lib/golden-story/brief.ts, for the same reason the
 * two prompt modules are separate (D6): a Golden Story is a picture book about
 * one life, written in stanzas; a Daily Gold edition is a newspaper a family
 * reads over breakfast. Sharing one system prompt would make every destination
 * card read like a bedtime page.
 *
 * What is shared is the *runner* — `runPrompt` in the story writer — because a
 * second fetch implementation is how two request shapes diverge.
 *
 * Pure and synchronous: this module only builds prompts. Nothing here calls a
 * model, so it is safe to import anywhere.
 */
import type { ChatPrompt } from '@/lib/golden-story/brief';

/**
 * The voice every Daily Gold field is written in. Harvested from the reader's
 * own copy — the destination cards, the sensory trio, the good-news teasers —
 * rather than invented here, so generated text sits beside imported text
 * without a seam.
 */
export const DG_VOICE = `You write "Daily Gold", a daily edition Maison d'Ore publishes for families with children aged 5-10. A parent reads it aloud at breakfast; a child of seven should understand every sentence without help.

Voice:
- Warm, calm, specific. Wonder rather than excitement; never breathless, never a sales pitch.
- Short sentences. Concrete nouns. A real detail beats an adjective — "the smell of bread at six in the morning" beats "a wonderful atmosphere".
- Never lecture and never moralise. No "you should", no "isn't it amazing?", no rhetorical questions to the child.
- Second person is for the parent, not the child. Prefer describing the world to addressing the reader.
- Nothing frightening: no violence, no injury, no death described in detail, no conflict between people. This is read to a seven-year-old at a kitchen table.
- British spelling. No emoji. No exclamation marks unless a person is quoted using one.`;

/**
 * One editable field, in the shape the rewrite prompt needs.
 *
 * `path` is what the editor sends and what the job row stores, so the review
 * panel can say which field is drafting; the guidance is the reader's real
 * constraint on that field, which is what makes the proposal usable rather than
 * merely fluent.
 */
export type DgField = {
  path: string;
  label: string;
  guidance: string;
};

/**
 * Every prose field §5 and §6 expose to rewrite (R8.1). The constraint quoted
 * in each `guidance` is the reader's, taken from the same components the
 * editor's affordances are drawn from — a rewrite that ignores the two-sentence
 * cut is a rewrite the admin has to redo by hand.
 */
export const DG_FIELDS: Record<string, DgField> = {
  destination_description: {
    path: 'destination_description',
    label: 'Destination atmosphere',
    guidance: 'What this place feels like to be in. The card shows ONLY THE FIRST TWO SENTENCES, so those two must stand alone and make sense with nothing after them; the rest is read only if a child opens the destination. 4-6 sentences in total. Present tense. Name real things — a street, a smell, a sound — not "a beautiful city".',
  },
  child_life_story: {
    path: 'child_life_story',
    label: 'A child in this place',
    guidance: 'One ordinary day in the life of one real-seeming child who lives there — what they eat, how they get to school, what they do afterwards. Not a tour and not a lesson about the country. 2-3 paragraphs separated by BLANK LINES (the reader splits on them). Give the child a name and an age between six and ten.',
  },
  taste_of_day: {
    path: 'taste_of_day',
    label: 'Taste of the day',
    guidance: 'A single named food or drink from this place — 4-8 words, no sentence, no full stop. Like "Pastéis de nata, still warm". Not a description of cuisine.',
  },
  sound_of_day: {
    path: 'sound_of_day',
    label: 'Sound of the day',
    guidance: 'One sound a child would actually hear there — 4-8 words, no sentence, no full stop. Like "Trams climbing the hill at dawn".',
  },
  nature_detail: {
    path: 'nature_detail',
    label: 'Nature detail',
    guidance: 'One specific living or natural thing from this place — 4-8 words, no sentence, no full stop. Like "Storks nesting on the church tower".',
  },
  tiny_phrase: {
    path: 'tiny_phrase',
    label: 'Tiny phrase',
    guidance: 'One short everyday word or phrase in the language actually spoken at this destination — never English. One to three words a child could repeat. Return only the phrase itself.',
  },
  daily_quote: {
    path: 'daily_quote',
    label: 'Daily quote',
    guidance: 'One short line, under 25 words, that a child of seven can hold onto. It must be a real quotation by a real person — never invented, never paraphrased. Return only the words, without quotation marks and without the attribution.',
  },
  'news.headline': {
    path: 'news.headline',
    label: 'Good-news headline',
    guidance: 'A headline for a real, recent, genuinely good piece of news. Under 12 words, plain language, no puns, no clickbait, and no words a seven-year-old would need explained. Keep every fact in the current text exactly as it is — this is a rewrite for tone, not a new claim.',
  },
  'news.description': {
    path: 'news.description',
    label: 'Good-news story',
    guidance: 'What happened, for a child of seven. THE LIST SHOWS ONLY THE FIRST SENTENCE, so it must work alone. 3-5 short sentences in total. Do not add facts that are not in the current text, do not change numbers, names, places or dates — an invented detail here is a false claim with a citation attached to it.',
  },
  'event.headline': {
    path: 'event.headline',
    label: 'On This Day headline',
    guidance: 'What happened, in under 12 words. Plain and concrete. Keep the fact exactly as it stands — the year and the claim are not yours to change.',
  },
  'event.story': {
    path: 'event.story',
    label: 'On This Day story',
    guidance: 'The event told to a child of seven, in 40-70 words. Say what happened and why it mattered, once. Do NOT open with the date — the reader already prints the year. Change no fact: not the year, not a name, not a number.',
  },
  'moment.headline': {
    path: 'moment.headline',
    label: 'Greatest Moment headline',
    guidance: 'One of the most important things that ever happened on this day of the year, in under 12 words. Plain and concrete; keep the fact exactly as it stands.',
  },
  'moment.story': {
    path: 'moment.story',
    label: 'Greatest Moment story',
    guidance: 'The moment told to a child of seven, in 40-70 words — what happened, and why people still remember it. Change no fact, and above all not the year: year drift is this content type\'s standard failure.',
  },
};

/**
 * Resolve a field path to its descriptor.
 *
 * Edition fields are addressed plainly (`child_life_story`), but the row-scoped
 * ones carry the row's id — `news.31.description`, `moment.7.story` — because a
 * job is identified by its field path and two open stories would otherwise
 * share one proposal. The id is stripped to find the descriptor and kept on the
 * job, so the review panel lands under the row that asked for it.
 */
export function resolveDgField(path: string): DgField | null {
  if (DG_FIELDS[path]) return DG_FIELDS[path];
  const generic = path.replace(/^([a-z]+)\.\d+\./, '$1.');
  return DG_FIELDS[generic] ?? null;
}

/**
 * Rewrite one field, in the house voice, against the reader's constraint on it.
 *
 * `context` is whatever the surrounding row makes true — the destination for an
 * edition field, the year for an event — because a rewrite of "taste of the
 * day" without knowing the destination can only produce something generic.
 * The proposal is applied on the editor's explicit Accept, never here.
 */
export function rewriteDgField(field: DgField, current: string, context?: string): ChatPrompt {
  return {
    system: DG_VOICE,
    user: `${context ? `Context: ${context}\n\n` : ''}Rewrite the "${field.label}" field of a Daily Gold edition.

${field.guidance}

Current text:
"""
${current}
"""

Return only the rewritten value as a single string: no preamble, no quotation marks around it, no explanation.`,
  };
}

// ── The whole-day draft (§8.2) ───────────────────────────────────────────────

type JsonSchema = { type: string; [k: string]: unknown };
const str: JsonSchema = { type: 'string' };
const obj = (properties: Record<string, JsonSchema>): JsonSchema => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

/**
 * The freely-generated half of a day (§8.3): destination, the sensory trio, the
 * tiny phrase, the child's day, and the two image scenes. The quote and the
 * good-news column are *retrieved* instead, in their own stages, because both
 * are factual claims that a training corpus cannot supply for a given week.
 */
export const DAY_DRAFT_SCHEMA = obj({
  destination_country: str,
  continent: str,
  destination_description: str,
  child_life_story: str,
  taste_of_day: str,
  sound_of_day: str,
  nature_detail: str,
  tiny_phrase: str,
  tiny_phrase_language: str,
  tiny_phrase_translation: str,
  hero_scene: str,
  destination_scene: str,
});

export type DayDraft = {
  destination_country: string;
  continent: string;
  destination_description: string;
  child_life_story: string;
  taste_of_day: string;
  sound_of_day: string;
  nature_detail: string;
  tiny_phrase: string;
  tiny_phrase_language: string;
  tiny_phrase_translation: string;
  hero_scene: string;
  destination_scene: string;
};

const CONTINENT_LIST = 'Africa, Asia, Europe, North America, South America, Oceania, Antarctica';

/**
 * Draft one day's destination and its atmosphere.
 *
 * `recentDestinations` are the places the nearby editions already visit; a
 * fortnight of Lisbon, Porto and Coimbra is the failure this avoids. The two
 * scenes are SUBJECT blocks for the image model — style and composition are
 * added by lib/daily-gold/prompts.ts, so asking for them here would produce a
 * prompt with the house style in it twice.
 */
export function draftDayPrompt(date: string, recentDestinations: string[] = [], keepDestination?: string): ChatPrompt {
  const avoid = recentDestinations.length
    ? `\n\nNearby editions already visit these places — choose somewhere else, and somewhere in a different part of the world: ${recentDestinations.join('; ')}.`
    : '';
  const fixed = keepDestination
    ? `\n\nThe destination is already chosen and must not change: ${keepDestination}. Write everything else about that place.`
    : '';

  return {
    system: DG_VOICE,
    user: `Write the ${date} edition of Daily Gold.

Choose one destination anywhere in the world and write the edition around it.${fixed}${avoid}

Fields:
- destination_country: "City, Country" — the form the reader splits on the comma, e.g. "Lisbon, Portugal".
- continent: exactly one of ${CONTINENT_LIST}.
- destination_description: ${DG_FIELDS.destination_description.guidance}
- child_life_story: ${DG_FIELDS.child_life_story.guidance}
- taste_of_day: ${DG_FIELDS.taste_of_day.guidance}
- sound_of_day: ${DG_FIELDS.sound_of_day.guidance}
- nature_detail: ${DG_FIELDS.nature_detail.guidance}
- tiny_phrase: ${DG_FIELDS.tiny_phrase.guidance}
- tiny_phrase_language: the language that phrase is in, in English, e.g. "Portuguese".
- tiny_phrase_translation: what it means in English, e.g. "Thank you". The phrase and its translation are a factual claim — use a phrase you are certain of.
- hero_scene: a SUBJECT description for the masthead painting. One or two sentences of concrete nouns describing a wide, calm view of this place. No style words (no "oil painting", "warm light") — a fixed style block is added separately. No text or lettering in the scene.
- destination_scene: a SUBJECT description for the destination card painting: the place itself, a street, coastline or building, with the subject slightly below centre. Same rules — no style words, no text.`,
    schema: DAY_DRAFT_SCHEMA,
  };
}
