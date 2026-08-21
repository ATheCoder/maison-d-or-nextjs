/**
 * Shared OpenRouter client bits — base URL, models, request headers, and the
 * retrieval plugin every factual generation goes through.
 *
 * Both the writer (brief.ts) and the image renderer (images.ts) use one key
 * (OPENROUTER_API_KEY).
 */

export const OPENROUTER = 'https://openrouter.ai/api/v1';
export const WRITER_MODEL = 'anthropic/claude-opus-4.8';

/**
 * The image model, used against POST /images (see images.ts).
 *
 * Do not "fix" this by grepping GET /api/v1/models — that listing only covers
 * chat-completion models and does not include `openai/gpt-image-2`, which is an
 * Images-API-only model. A 2026-07-25 change read that absence as the id having
 * been renamed and swapped in `openai/gpt-5.4-image-2`; that is a *chat* model
 * (`text+image+file->text+image`) which emits images through
 * /chat/completions, so it does not belong behind the images endpoint. Reverted
 * 2026-07-26.
 *
 * To check this id, query the model directly — it reports 100% uptime and
 * `text+image->image`:
 *   curl https://openrouter.ai/api/v1/models/openai/gpt-image-2/endpoints
 */
export const IMAGE_MODEL = 'openai/gpt-image-2';

export function orHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://maisondore.com',
    'X-Title': "Maison d'Ore Golden Story",
  };
}

// ── Retrieval ────────────────────────────────────────────────────────────────
// No training corpus contains a dated event from this week, so ungrounded
// generation of "today's good news" is confabulation by construction (D7). The
// AI retrieves its own sources and every item stores its citations, which is
// what turns the admin's review into verification rather than a rubber stamp
// (D10).
//
// Web search bills per request on top of tokens, and the rate depends on the
// engine — so the desk's credit balance is a fact about spend, not a forecast
// of it (R6.5).

export type WebEngine = 'native' | 'exa' | 'firecrawl' | 'parallel' | 'perplexity';

export type WebPluginOptions = {
  /** Leave undefined to let OpenRouter pick based on model support. */
  engine?: WebEngine;
  /** Result count; OpenRouter defaults to 5. */
  maxResults?: number;
  /** Extra instruction attached to the search results. */
  searchPrompt?: string;
  /** Curated outlet allowlist — good news is scoped to one (R3.20). Wildcards allowed. */
  includeDomains?: string[];
  excludeDomains?: string[];
};

export type WebPlugin = {
  id: 'web';
  engine?: WebEngine;
  max_results?: number;
  search_prompt?: string;
  include_domains?: string[];
  exclude_domains?: string[];
};

/**
 * Build the `plugins` entry that turns retrieval on for a request. Omitted
 * fields are left off entirely rather than sent as null, so OpenRouter applies
 * its own defaults.
 */
export function webPlugin(options: WebPluginOptions = {}): WebPlugin {
  const plugin: WebPlugin = { id: 'web' };
  if (options.engine) plugin.engine = options.engine;
  if (typeof options.maxResults === 'number') plugin.max_results = options.maxResults;
  if (options.searchPrompt?.trim()) plugin.search_prompt = options.searchPrompt.trim();
  if (options.includeDomains?.length) plugin.include_domains = options.includeDomains;
  if (options.excludeDomains?.length) plugin.exclude_domains = options.excludeDomains;
  return plugin;
}

/** One retrieved source, in the shape the provenance columns store. */
export type Citation = {
  url: string;
  title: string | null;
  /** The excerpt the model was shown — what the claim is checkable against. */
  content: string | null;
};

/**
 * Pull `url_citation` annotations out of a chat completion.
 *
 * Tolerant by design: an item with no usable citation is a real outcome that
 * the admin must be shown as *unverifiable* (R3.19), so a malformed or missing
 * annotations array yields an empty list rather than an exception. Losing the
 * whole generation because a citation was malformed would be the worse failure.
 *
 * Duplicate URLs are collapsed — engines commonly cite one page several times
 * for different sentences, and the admin wants the source list, not the
 * sentence map.
 */
export function parseCitations(completion: unknown): Citation[] {
  const message = (completion as {
    choices?: { message?: { annotations?: unknown } }[];
  })?.choices?.[0]?.message;

  const annotations = message?.annotations;
  if (!Array.isArray(annotations)) return [];

  const seen = new Set<string>();
  const out: Citation[] = [];

  for (const a of annotations) {
    if (!a || typeof a !== 'object') continue;
    const entry = a as { type?: unknown; url_citation?: unknown };
    if (entry.type !== 'url_citation') continue;

    const c = entry.url_citation as { url?: unknown; title?: unknown; content?: unknown } | undefined;
    const url = typeof c?.url === 'string' ? c.url.trim() : '';
    if (!url || seen.has(url)) continue;
    seen.add(url);

    out.push({
      url,
      title: typeof c?.title === 'string' && c.title.trim() ? c.title.trim() : null,
      content: typeof c?.content === 'string' && c.content.trim() ? c.content.trim() : null,
    });
  }

  return out;
}

/** The assistant's text from a chat completion, or '' when there is none. */
export function completionText(completion: unknown): string {
  const content = (completion as {
    choices?: { message?: { content?: unknown } }[];
  })?.choices?.[0]?.message?.content;
  return typeof content === 'string' ? content : '';
}

// ── Asking for JSON ──────────────────────────────────────────────────────────

/**
 * The request fields that ask for a JSON answer **and** keep the request on a
 * provider that will honour the ask.
 *
 * `response_format` on its own is not enough. One model id is served by many
 * endpoints, and they do not all support the same parameters: of the ten that
 * serve `anthropic/claude-opus-4.8`, the three Google Vertex ones do not list
 * `structured_outputs`. When the load balancer routes there the schema is
 * dropped silently — the model answers in prose, the call returns 200, and the
 * caller's `JSON.parse` dies on `Unexpected token 'L', "Looking at"...`. It is
 * intermittent by construction: the same prompt succeeds on the other seven.
 *
 * `provider.require_parameters` is the fix — it routes only to endpoints that
 * support every parameter sent. The cost is that a JSON ask fails outright
 * ("No endpoints found") if every schema-capable endpoint is down, which is the
 * better failure: an error that names itself rather than a reply that cannot be
 * read.
 *
 * The routing table is public, if this ever needs re-checking:
 *   curl https://openrouter.ai/api/v1/models/anthropic/claude-opus-4.8/endpoints
 */
export function jsonSchemaRequest(name: string, schema: unknown) {
  return {
    response_format: { type: 'json_schema', json_schema: { name, strict: true, schema } },
    provider: { require_parameters: true },
  };
}

/**
 * Parse a model's JSON reply.
 *
 * Tolerant twice over, because a schema is a request and not a guarantee: the
 * fence some models wrap the object in is stripped, and a reply that leads with
 * a sentence before the object is salvaged from its outermost braces. What is
 * *not* tolerated is a reply with no object in it — that throws with the
 * opening of what the model actually said, so the log reads as "it wrote prose"
 * instead of as a SyntaxError about a token 'L'.
 */
export function parseJsonReply<T>(text: string, what: string): T {
  let s = text.trim();
  if (s.startsWith('```')) s = s.replace(/^```[a-z]*\n?/i, '').replace(/```\s*$/, '').trim();

  try {
    return JSON.parse(s) as T;
  } catch {
    // Fall through to the salvage.
  }

  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(s.slice(start, end + 1)) as T;
    } catch {
      // Not JSON either — report it as prose below.
    }
  }

  throw new Error(`${what}: the model replied with prose, not JSON — ${JSON.stringify(s.slice(0, 200))}`);
}
