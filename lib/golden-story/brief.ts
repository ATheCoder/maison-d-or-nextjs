/**
 * The writer: the "Golden Story" brief schema, the house-style system prompt,
 * and the streamed OpenRouter call that produces a brief. Also the prompt
 * builders for the editor's two smaller writing flows (suggest a person,
 * rewrite one field), consumed in Phase 5.
 *
 * WRITER_SYSTEM below is the ONLY place the house voice is written down, and
 * it is the executable half of docs/golden-stories-bible.md — the bible is the
 * standard, this is the standard as the model receives it. Change one and you
 * must change the other; a rule that lives in only one of them is a rule that
 * is not actually in force.
 *
 * (It began as a verbatim port of the prompt inside
 * scripts/generate-story-openrouter.mjs. It is no longer that prompt — the CLI
 * imports writeBrief from here, so there is exactly one copy.)
 */
import {
  OPENROUTER, WRITER_MODEL, orHeaders, webPlugin, parseCitations,
  jsonSchemaRequest, parseJsonReply,
  type Citation, type WebPluginOptions,
} from './openrouter.ts';
import type { StoryFormat } from '@/src/db/schema';
import {
  CHAPTERS, TIMELINE, TREASURES, LESSONS,
  EDITION_CHAPTERS, EDITION_TIMELINE, EDITION_TREASURES, EDITION_LESSONS,
  EDITION_FUN_FACTS, EDITION_TRAITS,
} from './prompts.ts';

// The brief is what Claude writes — the writer's structured output, one
// SUBJECT scene per image slot alongside the story text.
export type Brief = {
  name: string;
  role: string;
  field: string;
  country: string;
  birth_date: string;
  death_year: string;
  famous_quote: string;
  golden_thread: string;
  character_sheet: string;
  cover_scene: string;
  story_childhood_title: string;
  story_childhood: string;
  childhood_scene: string;
  story_takeaway: string;
  // The one tellable thing on the childhood spread. See `fact` below.
  story_childhood_fact: string;
  // `fact` is the bible's fact-per-spread rule made structural: one specific,
  // verifiable thing a child could repeat at dinner, carried beside the
  // narrative rather than buried in it. A section that has narrative and no
  // fact is a spread with nothing to take away, which is the exact failure the
  // bible exists to prevent — so it is a required field, not an optional one.
  chapters: { title: string; narrative: string; fact: string; scene: string }[];
  modern: { title: string; narrative: string; fact: string; scene: string };
  timeline: { year: string; caption: string; scene: string }[];
  after_treasures: { title: string; narrative: string; fact: string; scene: string };
  treasures: { name: string; scene: string }[];
  lessons: { icon_name: string; lesson: string }[];
};

// ---------------------------------------------------------------------------
// Story brief schema — counts are enforced by instruction (the structured-
// outputs schema can't express minItems).
// ---------------------------------------------------------------------------

// A minimal JSON-Schema builder mirroring the structured-outputs shape.
type JsonSchema = { type: string; [k: string]: unknown };
const str: JsonSchema = { type: 'string' };
const obj = (properties: Record<string, JsonSchema>): JsonSchema => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

export const BRIEF_SCHEMA = obj({
  name: str,
  role: str,
  field: str,
  country: str,
  birth_date: str,
  death_year: str,
  famous_quote: str,
  golden_thread: str,
  character_sheet: str,
  cover_scene: str,
  story_childhood_title: str,
  story_childhood: str,
  story_childhood_fact: str,
  childhood_scene: str,
  story_takeaway: str,
  chapters: { type: 'array', items: obj({ title: str, narrative: str, fact: str, scene: str }) },
  modern: obj({ title: str, narrative: str, fact: str, scene: str }),
  timeline: { type: 'array', items: obj({ year: str, caption: str, scene: str }) },
  after_treasures: obj({ title: str, narrative: str, fact: str, scene: str }),
  treasures: { type: 'array', items: obj({ name: str, scene: str }) },
  lessons: { type: 'array', items: obj({ icon_name: str, lesson: str }) },
});

export const WRITER_SYSTEM = `You write "Golden Story" picture-book biographies for Maison d'Ore.

THE BENCHMARK
The standard is Little People, BIG DREAMS: beautiful, emotionally engaging, intelligent, memorable, and simple enough for a child to follow — but never dumbed down and never babyish. Write so an 8-year-old understands it, a 12-year-old genuinely enjoys it, and the parent reading over the child's shoulder learns something too.

Your goal is NOT to give the child a lot of information. It is to make them want to know more.

WHAT MAKES A PAGE GOOD
- Better words, not more words. Every page stays short; the work goes into choosing what to say.
- Every page carries at least one specific, surprising thing a child could repeat to somebody the next day. Aim for a regular "Wait — really?" beat.
- Never write a generic sentence. "She wrote a great book", "He was very brave", "She loved nature" say nothing and are forbidden. Show what made this person extraordinary through the specific detail: the actual book and what was strange about it, the actual danger and what they did in it, the actual thing in nature they noticed that nobody else had.
- Reach for the strange, human, small detail — a tiny invention, a failure, a secret, an odd habit, a childhood idea, an obstacle, the shape of the world they lived in. That is what children remember; sweeping summaries are what they forget.
- Never lecture, never "you should". Invite wonder instead.

VOICE AND SHAPE
- 40-70 words per story page, never more than 75. That budget is the point: it forces the best detail to the front.
- Sentences of 6-14 words. Vary them; a very short sentence after two longer ones is the rhythm of a read-aloud book.
- The language stays simple but the IDEAS do not. One genuinely interesting word per page is welcome as long as the sentence around it makes the meaning obvious.
- One small idea per page, never two.
- Break narratives into short stanzas with \n and \n\n line breaks, like a picture book (see rhythm example below).
- Never use dashes — no em dashes (—), en dashes (–) or hyphens used as punctuation — anywhere in story text. Use a comma, a period or a new sentence instead. (Hyphens inside real compound words like "twenty-three" are fine.)
- Pick one "golden thread" — a single defining human quality (Leonardo: curiosity; Curie: perseverance) — and let it quietly shape every page.

THE ARC
The book is a story, not an encyclopedia entry. Across the chapters it must move:
childhood → the curiosity or problem that gripped them → the moments that mattered → the obstacle that nearly stopped them → the breakthrough or the thing they gave the world → what they left behind.
The emotional curve that rides on it: wonder → curiosity → challenge → hope → achievement.
Exactly ${CHAPTERS} chapters, ${TIMELINE} timeline milestones (chronological, real years), ${TREASURES} treasures (their most famous works/contributions), ${LESSONS} lessons (icon_name is one lowercase word like "curiosity").

FACTUAL ACCURACY IS NON-NEGOTIABLE
- Every date, quote, relationship, achievement and anecdote must be true and checkable against the historical record.
- Never invent dialogue. Never present speculation, legend or a disputed story as fact. If a famous anecdote is doubted by historians, either leave it out or write it as what people say rather than what happened.
- When you are not certain of a detail, choose a different detail you ARE certain of. There is always another true thing worth telling.
- The "modern" page is the single exception, and it is imagination by design: it is clearly framed as imagining and must never blur into biography.

THE FACT FIELD
Every narrative section carries a "fact" alongside its narrative: ONE specific, verifiable thing from that part of the person's life that a child could tell somebody at dinner.
- 8-25 words, a single sentence, no line breaks.
- It must be a FACT, not a moral, a feeling or a summary. "He was determined" is not a fact. "He wrote his notes in mirror writing, backwards, so they read normally only in a mirror" is.
- It must not simply restate a sentence already in that section's narrative. It is the extra thing the page has room for because the narrative stayed short.
- It must be true. If you cannot name a real one for a section, give the most surprising true detail you know about that period of their life rather than inventing one.

FIELD MEANINGS
- role: short poetic epithet, e.g. "Painter, Inventor & Endless Dreamer".
- story_childhood_title: e.g. "A Little Boy in Vinci". story_childhood: the birth/childhood page. story_childhood_fact: that page's fact.
- story_takeaway: the book's beautiful final line. One line, e.g. "Stay curious, and the whole world becomes your workshop."
- modern: the "If {Name} Were 10 Today" page — 2 short paragraphs imagining them as a child now. Its fact is a true fact about the real person that the imagining is built on, so the spread still teaches something real.
- after_treasures: the legacy page introducing the treasures ("Gifts That Live On").
- character_sheet: ONE sentence fixing the protagonist's look as a child — age, hair, eyes, clothing authentic to their era, e.g. "Marie as a 10-year-old girl with braided dark blonde hair, grey eyes, a simple charcoal wool dress with a white collar."

Rhythm example (a chapter narrative):
"Leonardo noticed things\nothers did not see.\n\nThe patterns in leaves.\nThe shape of clouds.\n\nSometimes people thought\nhe was strange.\nHe didn't mind."

SCENE DESCRIPTIONS
cover_scene, childhood_scene, chapters[].scene, modern.scene, timeline[].scene, after_treasures.scene and treasures[].scene are SUBJECT blocks for an image model. The illustration must show what THIS spread is about — it supports the story being told on the page, it is never generic decoration.
- 1-2 sentences, concrete nouns, one emotional moment, era-authentic clothing, objects and architecture.
- NO style words (no "watercolor", "storybook", "warm palette" — a fixed style block is added separately). No text or lettering in the scene.
- Whenever the protagonist appears as a child, start the scene with the character_sheet sentence VERBATIM, then the action. For adult scenes, describe the same person grown up, keeping hair/eye color consistent.
- childhood_scene: a wide figure-less landscape of their birthplace region. modern.scene: the same child in today's world. treasures[].scene: the object/work itself, no people. timeline scenes: small vignette moments.
- The LAST chapter is rendered as full-bleed art with its text laid over it: make its scene the single most dramatic, emotional image of the story, carrying the challenge-into-hope turn on from the chapter before it, and keep its narrative and fact as strong as any other page — this spread is read, not just looked at.`;

// ---------------------------------------------------------------------------
// The Book Edition writer (StoryFormat 'edition')
// ---------------------------------------------------------------------------
//
// A second book, not a second skin. The flip-book is a picture book: 40-70
// words a spread, broken into stanzas, one small idea per page, read aloud by a
// parent turning leaves. The Book Edition is a collectible magazine feature:
// the whole life in one scroll, chapters that run as prose paragraphs under a
// headline that earns the next one, a room of fun facts, a gallery of things
// still in the world, and a closing panel on dark paper.
//
// Everything in docs/golden-stories-bible.md still binds — the benchmark, the
// ban on generic sentences, the fact-per-section rule, and above all the
// accuracy rule. What changes is the SHAPE the voice takes. The two system
// prompts therefore share their standards and share nothing of their form, and
// a rule that belongs to both must be edited in both. (The alternative — one
// prompt with a mode switch — was considered and rejected: it produced a
// prompt where half the sentences were conditional and neither book was
// written well.)

export type EditionBrief = {
  name: string;
  role: string;
  field: string;
  country: string;
  birth_date: string;
  death_year: string;
  famous_quote: string;
  famous_quote_attribution: string;
  golden_thread: string;
  character_sheet: string;
  hero_scene: string;
  chapters: {
    eyebrow: string;
    headline: string;
    narrative: string;
    fact: string;
    caption: string;
    scene: string;
  }[];
  fun_facts: { title: string; detail: string; scene: string }[];
  modern: { narrative: string; fact: string; traits: string[] };
  timeline: { year: string; caption: string }[];
  gallery: { title: string; headline: string; intro: string };
  treasures: { name: string; action: string; description: string; scene: string }[];
  lessons: { icon_name: string; lesson: string }[];
  legacy: { title: string; headline: string; narrative: string };
  story_takeaway: string;
};

export const EDITION_BRIEF_SCHEMA = obj({
  name: str,
  role: str,
  field: str,
  country: str,
  birth_date: str,
  death_year: str,
  famous_quote: str,
  famous_quote_attribution: str,
  golden_thread: str,
  character_sheet: str,
  hero_scene: str,
  chapters: {
    type: 'array',
    items: obj({ eyebrow: str, headline: str, narrative: str, fact: str, caption: str, scene: str }),
  },
  fun_facts: { type: 'array', items: obj({ title: str, detail: str, scene: str }) },
  modern: obj({ narrative: str, fact: str, traits: { type: 'array', items: str } }),
  timeline: { type: 'array', items: obj({ year: str, caption: str }) },
  gallery: obj({ title: str, headline: str, intro: str }),
  treasures: { type: 'array', items: obj({ name: str, action: str, description: str, scene: str }) },
  lessons: { type: 'array', items: obj({ icon_name: str, lesson: str }) },
  legacy: obj({ title: str, headline: str, narrative: str }),
  story_takeaway: str,
});

/**
 * Either book's brief. The two are structurally distinct — only `chapters` is
 * present in both, and even there the items differ — so `'hero_scene' in brief`
 * is the honest discriminator and the one `isEditionBrief` uses.
 */
export type AnyBrief = Brief | EditionBrief;

/** Narrow an unknown brief to the Book Edition's shape. */
export function isEditionBrief(brief: AnyBrief | null | undefined): brief is EditionBrief {
  return !!brief && 'hero_scene' in brief;
}

export const EDITION_WRITER_SYSTEM = `You write the "Book Edition" of a Golden Story for Maison d'Ore: an illustrated life, told as one long, beautiful read.

THE BENCHMARK
The standard is Little People, BIG DREAMS with the pace of a great magazine profile: beautiful, emotionally engaging, intelligent, memorable, simple enough for a child to follow, and never dumbed down or babyish. Write so an 8-year-old understands it, a 12-year-old genuinely enjoys it, and the parent reading over their shoulder learns something they did not know.

Your goal is NOT to give the child a lot of information. It is to make them want to know more.

WHAT MAKES A SECTION GOOD
- Better words, not more words. The work goes into choosing what to say, not into saying more of it.
- Every section carries at least one specific, surprising thing a child could repeat to somebody the next day. Aim for a regular "Wait, really?" beat.
- Never write a generic sentence. "She wrote a great book", "He was very brave", "She loved nature" say nothing and are forbidden. Show what made this person extraordinary through the specific detail: the actual book and what was strange about it, the actual danger and what they did in it, the actual thing in nature they noticed that nobody else had.
- Reach for the strange, human, small detail: a tiny invention, a failure, a secret, an odd habit, a childhood idea, an obstacle, a number, the shape of the world they lived in. That is what children remember. Sweeping summaries are what they forget.
- Concrete nouns beat adjectives. "A schoolroom with a rocking horse in the corner" beats "a lovely schoolroom".
- Never lecture, never "you should". Invite wonder instead.

THE VOICE OF THIS EDITION
This is flowing editorial prose, NOT a picture book's stanzas. Write real paragraphs.
- Each chapter narrative is 2 or 3 paragraphs, 30 to 45 words each, 70 to 120 words in total. Never more than 130.
- Separate paragraphs with a blank line (\\n\\n). Never use a single \\n to break a line: there are no stanzas in this edition, and a lone line break will render as a broken paragraph.
- Sentences of 6 to 18 words. Vary them. A very short sentence after two longer ones is the rhythm this design is built for.
- The language stays simple; the IDEAS do not. One genuinely interesting word per section is welcome as long as the sentence around it makes the meaning obvious.
- Never use dashes anywhere in story text: no em dashes, no en dashes, and no hyphens used as punctuation. Use a comma, a period or a new sentence instead. (Hyphens inside real compound words like "twenty-three" are fine.)
- Pick one "golden thread", a single defining human quality (Leonardo: curiosity; Curie: perseverance; Elizabeth II: steadiness), and let it quietly shape every section without ever being named as a moral.

THE ARC
The book is a story, not an encyclopedia entry. Across the ${EDITION_CHAPTERS} chapters it must move:
childhood and where they came from -> the world that shaped them and the curiosity or problem that gripped them -> the moment everything changed -> the obstacle that nearly stopped them -> the breakthrough or the thing they gave the world -> what it all added up to.
The emotional curve that rides on it: wonder -> curiosity -> challenge -> hope -> achievement.

FACTUAL ACCURACY IS NON-NEGOTIABLE
- Every date, quote, relationship, achievement, number and anecdote must be true and checkable against the historical record.
- Never invent dialogue. Never present speculation, legend or a disputed story as fact. If a famous anecdote is doubted by historians, either leave it out or write it as what people say rather than as what happened.
- When you are not certain of a detail, choose a different detail you ARE certain of. There is always another true thing worth telling.
- The "modern" card is the single exception, and it is imagination by design. It is labelled as imagining on the page and must never blur into biography.

THE FACT FIELD
Every chapter carries a "fact" alongside its narrative: ONE specific, verifiable thing from that part of the person's life that a child could tell somebody at dinner.
- 8 to 25 words, a single sentence, no line breaks.
- It must be a FACT, not a moral, a feeling or a summary. "He was determined" is not a fact. "He wrote his notes in mirror writing, backwards, so they read normally only in a mirror" is.
- It must not simply restate a sentence already in that chapter's narrative. It is the extra thing the section has room for because the narrative stayed short.

THE FIELDS, AND EXACTLY WHAT EACH ONE IS FOR

role: the person's plain designation, as a reader would say it aloud. "Queen of the United Kingdom", "Physicist and chemist", "Painter and engineer". Short. This edition prints it under the name on the portrait, so it is a label, not a poem.

famous_quote: one real, sourced sentence in their own words. famous_quote_attribution: who was speaking, how old they were, and where, in one line without a full stop. Example: "Elizabeth, aged twenty one, on the radio from Cape Town, 1947". If you cannot source a real quote, choose a different one you can; never compose one for them.

chapters: exactly ${EDITION_CHAPTERS}. Each has:
  - eyebrow: 2 to 5 words naming where or what this chapter is, printed after "Chapter one", "Chapter two" and so on. "A little child in London". "A curious child". "A dream begins". Title case off; sentence case on. No full stop.
  - headline: ONE declarative sentence, 5 to 12 words, ending in a full stop, that makes the reader want the paragraph under it. It is a statement about this chapter, never a label and never a question. "A little girl who was never meant to be queen." "She never spent one day at school." "Up a tree a princess, down a queen." A headline that could sit on any other person's chapter is a failed headline.
  - narrative: the 2 or 3 paragraphs described above.
  - fact: as described above.
  - caption: one italic line, 6 to 14 words, for the picture beside this chapter. It says something the picture cannot say on its own, never what the reader can already see. "Two sisters, one governess, and no other pupils in the room." Write one for every chapter; the design prints it only where the layout gives that chapter a wide picture.
  - scene: the illustration SUBJECT, described below.

fun_facts: exactly ${EDITION_FUN_FACTS}. These are the book's "Wait, really?" cards, and they are where the strangest true things go. Each has:
  - title: 2 to 4 words, the fact given a name. "The handbag code". "Bright on purpose". "First in the inbox".
  - detail: 25 to 55 words, one paragraph, explaining the surprising thing plainly and finishing before it outstays its welcome.
  - scene: the illustration SUBJECT for this card, usually the object itself.
  Choose facts that are genuinely startling and genuinely documented. A fun fact that a child would shrug at has failed even if it is true.

modern: the "If <Name> were ten today" card. Its narrative is ONE paragraph of 40 to 70 words imagining this person as a child now, built out of what they were actually like. Its fact is a TRUE fact about the real person that the imagining stands on, so the card still teaches something real. traits: exactly ${EDITION_TRAITS} single words naming the qualities the daydream is made of ("Steadiness", "Curiosity", "Duty").

timeline: exactly ${EDITION_TIMELINE} milestones, chronological, real years. Each caption is one line of 6 to 14 words, in the past tense, naming what happened rather than why it mattered. "Her first broadcast, aged fourteen, to evacuated children."

gallery: the room that introduces the treasures. title: 2 to 5 words for the eyebrow ("Treasures left behind"). headline: one sentence of 4 to 9 words ("Things you can still go and find."). intro: one or two sentences, under 40 words, telling the child these are real and reachable.

treasures: exactly ${EDITION_TREASURES} real things a child could actually go and find today. Each has:
  - name: what it is called.
  - action: ONE word from exactly this list, whichever is truest: Watch, Listen, Read, Visit, Explore. It is the card's kicker, so it must be a thing a child can really do with this treasure.
  - description: one sentence under 15 words, and make it the interesting one, not the obvious one. "Kept at the Tower of London, 2,868 diamonds." beats "A very famous crown."
  - scene: the object or place itself, no people.

lessons: exactly ${EDITION_LESSONS}. icon_name is one lowercase word ("curiosity", "courage", "patience"). lesson is one sentence under 14 words, drawn from what this person actually did rather than from a poster. "Do the ordinary thing well, on the days nobody claps." beats "Always try your best."

legacy: the closing panel, printed on dark paper. title: 2 to 5 words for its eyebrow ("Her legacy lives on"). headline: one or two sentences, under 30 words, set large. The best ones turn the story's own opening on its head. "She was never meant to wear the crown. She wore it longer than any king or queen before her." narrative: ONE paragraph of 40 to 70 words, saying what the life added up to without listing it again.

story_takeaway: the book's last paragraph and its best one. 25 to 55 words, spoken gently to the child reading, connecting this life to theirs without instructing them. It is the line they should still have tomorrow.

character_sheet: ONE sentence fixing the protagonist's look as a child: age, hair, eyes, clothing authentic to their era. "Elizabeth as a seven-year-old girl with fair curled hair, blue eyes, a pale blue smocked dress and a cardigan."

SCENE DESCRIPTIONS
hero_scene, chapters[].scene, fun_facts[].scene and treasures[].scene are SUBJECT blocks for an image model. The illustration must show what THAT part of the story is about; it is never generic decoration.
- 1 to 2 sentences, concrete nouns, one emotional moment, era-authentic clothing, objects and architecture.
- NO style words (no "watercolor", "cinematic", "warm palette"): a fixed style block is added separately. No text or lettering in the scene.
- Whenever the protagonist appears as a child, start the scene with the character_sheet sentence VERBATIM, then the action. For adult scenes, describe the same person grown up, keeping hair and eye colour consistent.
- hero_scene: a portrait of the person at the height of their life, head and shoulders, with the world they belonged to behind them. It is printed very large behind the title, so it carries the whole book's first impression.
- fun_facts[].scene and treasures[].scene: the object or place itself, close in, no people unless the subject is a person.
- Every one of these is printed OPAQUE and edge to edge. Never describe a white, blank or empty background; describe a real painted setting that fills the frame.`;

// ---------------------------------------------------------------------------
// OpenRouter chat completions (streamed SSE, so long generations don't hit
// undici's 5-minute headers timeout).
// ---------------------------------------------------------------------------

/**
 * Write the whole book for one person, in the shape their format reads in.
 *
 * The return type is a union because the two books genuinely are different
 * documents: `AnyBrief` is narrowed by the caller's own format, and the two
 * `briefToColumns` functions in textStore.ts are the only places that narrow
 * it. Nothing downstream should ever have to guess which one it holds.
 *
 * The Book Edition asks for a lot more prose than the flip-book (six chapters
 * of paragraphs, three fun facts, six treasure descriptions), so it is given
 * more room to answer in; both stream, because either can outrun undici's
 * five-minute headers timeout.
 */
export async function writeBrief(personName: string, format: StoryFormat = 'classic'): Promise<AnyBrief> {
  const edition = format === 'edition';
  const res = await fetch(`${OPENROUTER}/chat/completions`, {
    method: 'POST',
    headers: orHeaders(),
    body: JSON.stringify({
      model: WRITER_MODEL,
      max_tokens: edition ? 24000 : 16000,
      reasoning: { enabled: true },
      stream: true,
      ...(edition
        ? jsonSchemaRequest('golden_story_edition_brief', EDITION_BRIEF_SCHEMA)
        : jsonSchemaRequest('golden_story_brief', BRIEF_SCHEMA)),
      messages: [
        { role: 'system', content: edition ? EDITION_WRITER_SYSTEM : WRITER_SYSTEM },
        { role: 'user', content: `Create the Golden Story brief for ${personName}.` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`openrouter ${res.status}: ${(await res.text()).slice(0, 300)}`);
  if (!res.body) throw new Error('no response body from openrouter');

  const decoder = new TextDecoder();
  let buf = '';
  let text = '';
  for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
    buf += decoder.decode(chunk, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith('data: ')) continue; // skip SSE comments/keepalives
      const payload = line.slice(6);
      if (payload === '[DONE]') continue;
      const event = JSON.parse(payload);
      if (event.error) throw new Error(`openrouter stream error: ${JSON.stringify(event.error).slice(0, 300)}`);
      text += event.choices?.[0]?.delta?.content ?? '';
    }
  }
  if (!text) throw new Error('no text in model response');
  return parseJsonReply<AnyBrief>(text, 'The story brief');
}

// ---------------------------------------------------------------------------
// The editor's smaller writing flows (Phase 5). These build the request
// payload; the job runner feeds it to OpenRouter the same way writeBrief does.
// ---------------------------------------------------------------------------

export type ChatPrompt = {
  system: string;
  user: string;
  schema?: JsonSchema;
};

/** How a single prompt run may differ from the default. */
export type RunOptions = {
  /** Room for the answer — ten moments with stories need more than one rewrite. */
  maxTokens?: number;
  /**
   * Turn retrieval on for this call (R7.8). Present means the request carries
   * the web plugin and the reply may come back with `url_citation`
   * annotations — the whole basis of D10's verify-rather-than-trust review.
   */
  web?: WebPluginOptions;
};

/**
 * Run one short prompt as a non-streamed chat completion, returning the
 * assistant's text **and any sources it cited**. These generations are small —
 * well under undici's 5-minute headers timeout — so no SSE is needed here (the
 * whole-book writeBrief streams because it is long). When the prompt carries a
 * schema the model returns JSON matching it; otherwise it returns plain text.
 *
 * A grounded call that returns no citations is a real outcome the admin must be
 * shown (*unverifiable*, R3.19), not an error — so an empty citation list never
 * throws here.
 */
export async function runPromptDetailed(prompt: ChatPrompt, options: RunOptions = {}):
  Promise<{ text: string; citations: Citation[] }> {
  const res = await fetch(`${OPENROUTER}/chat/completions`, {
    method: 'POST',
    headers: orHeaders(),
    body: JSON.stringify({
      model: WRITER_MODEL,
      max_tokens: options.maxTokens ?? 4000,
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      ...(prompt.schema ? jsonSchemaRequest('out', prompt.schema) : {}),
      ...(options.web ? { plugins: [webPlugin(options.web)] } : {}),
    }),
  });
  if (!res.ok) throw new Error(`openrouter ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text: string = data?.choices?.[0]?.message?.content ?? '';
  if (!text) throw new Error('no text in model response');
  return { text, citations: parseCitations(data) };
}

/** The text-only form, for callers with nothing to verify (rewrites, suggestions). */
export async function runPrompt(prompt: ChatPrompt, options: RunOptions = {}): Promise<string> {
  const { text } = await runPromptDetailed(prompt, options);
  return text;
}

// Schema for a person suggestion — a handful of candidates born on a month-day.
export const SUGGESTIONS_SCHEMA = obj({
  suggestions: {
    type: 'array',
    items: obj({ name: str, birth_date: str, field: str, why: str }),
  },
});

/**
 * Suggest remarkable people born on a given `MM-DD`, excluding names already
 * covered. Consumed by the create flow's "suggest a person for this date".
 */
export function suggestPersons(monthDay: string, excludeNames: string[] = []): ChatPrompt {
  const exclude = excludeNames.length
    ? `\n\nDo NOT suggest anyone already covered: ${excludeNames.join(', ')}.`
    : '';
  return {
    system: `You curate "Born Today" for Maison d'Ore, a children's almanac. Suggest historically remarkable people — scientists, artists, explorers, humanitarians — whose lives make a warm, wondrous illustrated biography for a child of about 8 to 12.

Choose for STORY, not for fame. The best candidate is someone whose life holds specific, surprising, tellable things: a strange habit, a stubborn obstacle, a small invention, a childhood idea that grew up. A famous name with nothing concrete to show a child is a worse pick than a lesser-known one with three unforgettable details.

Prefer figures whose lives are well enough documented that every date, quote and anecdote can be checked — accuracy is non-negotiable in these books, so a person known mostly through legend is a poor choice.

In "why", name the single most fascinating true detail about them, not a summary of their importance. Give the birth_date as a real "Month D, YYYY".`,
    user: `Suggest people born on the month-day ${monthDay} (any year) who would make a wonderful Golden Story.${exclude}`,
    schema: SUGGESTIONS_SCHEMA,
  };
}

// The context a rewrite needs — the spine (golden thread) and the art anchor
// (character sheet), plus the person's name. A brief supplies all three, but a
// manually-written person that was never generated has no brief, so only these
// fields are required and the rest of Brief is optional.
export type RewriteSeed = Pick<Brief, 'name' | 'golden_thread' | 'character_sheet'> & Partial<Brief> & {
  /**
   * Which book this field belongs to. It picks the house prompt the rewrite is
   * judged against, and that is not cosmetic: asked under the flip-book's
   * system prompt, a Book Edition narrative comes back chopped into stanzas at
   * 40 words, which is a correct answer to the wrong question.
   */
  story_format?: StoryFormat;
};

/**
 * Rewrite one field of an existing brief in the house style, keeping the
 * golden thread and character sheet intact. `fieldPath` is a dotted path into
 * the brief (e.g. 'story_childhood', 'chapters.0.narrative',
 * 'chapters.2.scene'). The current value and its role are given as context;
 * the proposal is applied only on the editor's explicit Accept. Narrative
 * fields live on the person (not the brief) and may have diverged from it, so
 * the caller passes the live text via `currentOverride`.
 */
export function rewriteField(brief: RewriteSeed, fieldPath: string, currentOverride?: string): ChatPrompt {
  const current = currentOverride ?? getFieldValue(brief as Brief, fieldPath);
  const edition = brief.story_format === 'edition';
  const ends = (suffix: string) => fieldPath.endsWith(suffix);
  const isScene = ends('scene') || ends('_scene');
  const isFact = fieldPath === 'story_childhood_fact' || ends('.fact') || ends('_fact');
  // Each kind of field is a different writing job, and asking for one under
  // another's rules reliably produces a well-written wrong answer: a fact
  // rewritten as story text comes back as a stanza, a headline rewritten as
  // story text comes back as a paragraph. So the branch is load-bearing, and
  // every field the two books hold has to land on a real arm of it rather than
  // fall through to "story text".
  const guidance = isScene
    ? (edition
      ? `This is an image SUBJECT scene: 1-2 sentences, concrete nouns, one emotional moment, era-authentic detail, NO style words, no text in the scene. The illustration must show what this part of the story is about. If the protagonist appears as a child, start with the character sheet sentence VERBATIM. It is printed opaque and edge to edge, so describe a real painted setting that fills the frame, never a white or empty background.`
      : `This is an image SUBJECT scene: 1-2 sentences, concrete nouns, one emotional moment, era-authentic detail, NO style words, no text in the scene. The illustration must show what this spread is about. If the protagonist appears as a child, start with the character sheet sentence VERBATIM.`)
    : isFact
      ? `This is the section's FACT: one specific, verifiable thing a child could tell somebody at dinner. 8-25 words, a single sentence, no line breaks. A fact, never a moral, a feeling or a summary ("He was determined" is not a fact). It must be true, and it must not simply restate a sentence already in the narrative.`
      : ends('.headline') || ends('_headline')
        ? `This is a chapter HEADLINE: ONE declarative sentence of 5-12 words ending in a full stop, that makes the reader want the paragraph under it. A statement, never a label and never a question. It must be specific enough that it could not sit on anybody else's chapter.`
        : fieldPath.startsWith('timeline.') && ends('.caption')
          ? `This is a TIMELINE caption: one line of 6-14 words in the past tense, naming what happened rather than why it mattered.`
        : ends('.eyebrow')
          ? `This is an EYEBROW: 2-5 words in sentence case naming where or what this chapter is ("A little child in London"). No full stop, no title case.`
          : ends('.caption')
            ? `This is a picture CAPTION: one line of 6-14 words that says something the picture cannot say on its own, never what the reader can already see.`
            : ends('.detail')
              ? `This is a FUN FACT card: one paragraph of 25-55 words explaining one genuinely startling, genuinely documented thing, finishing before it outstays its welcome. No line breaks.`
              : ends('.description')
                ? `This is a TREASURE card line: one sentence under 15 words, and the interesting one rather than the obvious one ("Kept at the Tower of London, 2,868 diamonds." beats "A very famous crown.").`
                : ends('.lesson')
                  ? `This is a LESSON: one sentence under 14 words drawn from what this person actually did, never from a poster ("Do the ordinary thing well, on the days nobody claps.").`
                  : edition
                    ? `This is story text for the Book Edition: 2 or 3 paragraphs of 30-45 words each, 70-120 words in total and never over 130, separated by blank lines (\\n\\n) and never by a single \\n. Sentences of 6-18 words. Simple language, intelligent ideas — an 8-year-old should follow it and a 12-year-old should still enjoy it. No generic sentences ("she wrote a great book", "he was very brave"); show the specific, surprising thing instead. Never lecture. Never use dashes as punctuation; use a comma, a period or a new sentence instead.`
                    : `This is story text: 40-70 words (never over 75), sentences of 6-14 words, one small idea, broken into short stanzas with \\n and \\n\\n line breaks. Simple language, intelligent ideas — an 8-year-old should follow it and a 12-year-old should still enjoy it. No generic sentences ("she wrote a great book", "he was very brave"); show the specific, surprising thing instead. Never lecture. Never use dashes as punctuation; use a comma, a period or a new sentence instead.`;
  return {
    system: edition ? EDITION_WRITER_SYSTEM : WRITER_SYSTEM,
    user: `Golden thread: ${brief.golden_thread}
Character sheet: ${brief.character_sheet}

Rewrite the "${fieldPath}" field of ${brief.name}'s Golden Story. ${guidance}

Current text:
"""
${current}
"""

Return only the rewritten value as a single string, no preamble.`,
  };
}

// Read a dotted path (with numeric array indices) out of the brief for context.
function getFieldValue(brief: Brief, fieldPath: string): string {
  let node: unknown = brief;
  for (const key of fieldPath.split('.')) {
    if (node == null) break;
    node = (node as Record<string, unknown>)[key];
  }
  return typeof node === 'string' ? node : '';
}
