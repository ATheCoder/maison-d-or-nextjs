/**
 * The writer: the "Golden Story" brief schema, the house-style system prompt,
 * and the streamed OpenRouter call that produces a brief — ported verbatim
 * from scripts/generate-story-openrouter.mjs. Also the prompt builders for the
 * editor's two smaller writing flows (suggest a person, rewrite one field),
 * consumed in Phase 5.
 */
import {
  OPENROUTER, WRITER_MODEL, orHeaders, webPlugin, parseCitations,
  jsonSchemaRequest, parseJsonReply,
  type Citation, type WebPluginOptions,
} from './openrouter.ts';
import { CHAPTERS, TIMELINE, TREASURES, LESSONS } from './prompts.ts';

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
  chapters: { title: string; narrative: string; scene: string }[];
  modern: { title: string; narrative: string; scene: string };
  timeline: { year: string; caption: string; scene: string }[];
  after_treasures: { title: string; narrative: string; scene: string };
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
  childhood_scene: str,
  story_takeaway: str,
  chapters: { type: 'array', items: obj({ title: str, narrative: str, scene: str }) },
  modern: obj({ title: str, narrative: str, scene: str }),
  timeline: { type: 'array', items: obj({ year: str, caption: str, scene: str }) },
  after_treasures: obj({ title: str, narrative: str, scene: str }),
  treasures: { type: 'array', items: obj({ name: str, scene: str }) },
  lessons: { type: 'array', items: obj({ icon_name: str, lesson: str }) },
});

export const WRITER_SYSTEM = `You write "Golden Story" picture-book biographies for Maison d'Ore (ages 5-10, read aloud at bedtime).

Writing rules (from the house specification):
- Every story page is 40-70 words, never more than 75. Sentences of 6-9 words, never more than 12. One small idea per page, never two.
- Break narratives into short stanzas with \\n and \\n\\n line breaks, like a picture book (see rhythm example below).
- Vocabulary a 6-8 year old understands; explain any hard word naturally.
- Never use dashes — no em dashes (—), en dashes (–) or hyphens used as punctuation — anywhere in story text. Use a comma, a period or a new sentence instead. (Hyphens inside real compound words like "twenty-three" are fine.)
- Never lecture, never "you should". Invite wonder instead.
- Pick one "golden thread" — a single defining human quality (Leonardo: curiosity; Curie: perseverance) — and let it quietly shape every page.
- Emotional curve across the chapters: wonder → curiosity → challenge → hope → achievement.
- Exactly ${CHAPTERS} chapters, ${TIMELINE} timeline milestones (chronological, real years), ${TREASURES} treasures (their most famous works/contributions), ${LESSONS} lessons (icon_name is one lowercase word like "curiosity").

Rhythm example (a chapter narrative):
"Leonardo noticed things\\nothers did not see.\\n\\nThe patterns in leaves.\\nThe shape of clouds.\\n\\nSometimes people thought\\nhe was strange.\\nHe didn't mind."

Field meanings:
- role: short poetic epithet, e.g. "Painter, Inventor & Endless Dreamer".
- story_childhood_title: e.g. "A Little Boy in Vinci". story_childhood: the birth/childhood page.
- story_takeaway: one line, e.g. "Stay curious, and the whole world becomes your workshop."
- modern: "If {Name} Were 10 Today" page — 2 short paragraphs imagining them as a child now.
- after_treasures: the legacy page introducing the treasures ("Gifts That Live On").
- character_sheet: ONE sentence fixing the protagonist's look as a child — age, hair, eyes, clothing authentic to their era, e.g. "Marie as a 10-year-old girl with braided dark blonde hair, grey eyes, a simple charcoal wool dress with a white collar."

Scene descriptions (cover_scene, childhood_scene, chapters[].scene, modern.scene, timeline[].scene, after_treasures.scene, treasures[].scene) are SUBJECT blocks for an image model:
- 1-2 sentences, concrete nouns, one emotional moment, era-authentic clothing, objects and architecture.
- NO style words (no "watercolor", "storybook", "warm palette" — a fixed style block is added separately). No text or lettering in the scene.
- Whenever the protagonist appears as a child, start the scene with the character_sheet sentence VERBATIM, then the action. For adult scenes, describe the same person grown up, keeping hair/eye color consistent.
- childhood_scene: a wide figure-less landscape of their birthplace region. modern.scene: the same child in today's world. treasures[].scene: the object/work itself, no people. timeline scenes: small vignette moments.
- The LAST chapter is rendered as a wordless full-page painting (its narrative is written but not displayed): make its scene the single most dramatic, emotional image of the story, carrying the challenge-into-hope turn on from the chapter before it.`;

// ---------------------------------------------------------------------------
// OpenRouter chat completions (streamed SSE, so long generations don't hit
// undici's 5-minute headers timeout).
// ---------------------------------------------------------------------------

export async function writeBrief(personName: string): Promise<Brief> {
  const res = await fetch(`${OPENROUTER}/chat/completions`, {
    method: 'POST',
    headers: orHeaders(),
    body: JSON.stringify({
      model: WRITER_MODEL,
      max_tokens: 16000,
      reasoning: { enabled: true },
      stream: true,
      ...jsonSchemaRequest('golden_story_brief', BRIEF_SCHEMA),
      messages: [
        { role: 'system', content: WRITER_SYSTEM },
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
  return parseJsonReply<Brief>(text, 'The story brief');
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
    system: `You curate "Born Today" for Maison d'Ore, a children's almanac (ages 5-10). Suggest historically remarkable people — scientists, artists, explorers, humanitarians — whose lives make a warm, wondrous bedtime biography. Prefer widely documented figures with a clear "golden thread". Give the birth_date as a real "Month D, YYYY".`,
    user: `Suggest people born on the month-day ${monthDay} (any year) who would make a wonderful Golden Story.${exclude}`,
    schema: SUGGESTIONS_SCHEMA,
  };
}

// The context a rewrite needs — the spine (golden thread) and the art anchor
// (character sheet), plus the person's name. A brief supplies all three, but a
// manually-written person that was never generated has no brief, so only these
// fields are required and the rest of Brief is optional.
export type RewriteSeed = Pick<Brief, 'name' | 'golden_thread' | 'character_sheet'> & Partial<Brief>;

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
  const isScene = fieldPath.endsWith('scene') || fieldPath.endsWith('_scene');
  const guidance = isScene
    ? `This is an image SUBJECT scene: 1-2 sentences, concrete nouns, one emotional moment, era-authentic detail, NO style words, no text in the scene. If the protagonist appears as a child, start with the character sheet sentence VERBATIM.`
    : `This is story text: 40-70 words (never over 75), short 6-9 word sentences, one small idea, broken into short stanzas with \\n and \\n\\n line breaks, vocabulary a 6-8 year old understands. Never lecture. Never use dashes as punctuation; use a comma, a period or a new sentence instead.`;
  return {
    system: WRITER_SYSTEM,
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
