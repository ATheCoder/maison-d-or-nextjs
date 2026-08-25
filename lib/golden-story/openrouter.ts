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
  /** Defaults to 'exa' — see `webPlugin` for why the engine is not left open. */
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
  // The engine is pinned rather than left to OpenRouter, because the two it
  // picks between are not interchangeable here. `exa` searches and injects the
  // results as text, and the reply comes back with `url_citation` annotations
  // — which is the whole basis of verify-rather-than-trust (D10): no
  // annotations means `verify()` returns false for every item and the admin is
  // shown a column of *unverifiable* claims. `native` runs the search as the
  // model's own tool, and returns no annotations at all. Left open, OpenRouter
  // chooses per request, so the same ask is checkable one run and not the next.
  const plugin: WebPlugin = { id: 'web', engine: options.engine ?? 'exa' };
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
 * Cross a claimed source against what the engine actually cited.
 *
 * A grounded reply carries two different things that are easy to mistake for
 * one: the source URL the *model* says it is reporting from, and the citation
 * list the *engine* recorded for the request. This crosses them, and it is what
 * separates "checked" from "said it checked" — a claim attributed to a page the
 * request never fetched is the failure mode worth catching, in retrieved news
 * (lib/daily-gold/retrieve.ts) and in a fact-checked biography
 * (lib/golden-story/factcheck.ts) alike.
 *
 * Matching is by origin + path, ignoring query strings and trailing slashes:
 * engines routinely append tracking parameters to the URL they hand the model,
 * and treating that as a different page would mark honest citations
 * unverifiable — which teaches the admin to ignore the flag.
 */
export function verify(claimed: string | null, citations: Citation[]): boolean {
  if (!claimed) return false;
  const key = (u: string) => {
    try {
      const p = new URL(u);
      return `${p.origin}${p.pathname.replace(/\/+$/, '')}`.toLowerCase();
    } catch { return u.toLowerCase(); }
  };
  const want = key(claimed);
  return citations.some((c) => key(c.url) === want);
}

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
 * Every complete JSON value in a string, in the order they appear, paired with
 * the text each was read from.
 *
 * A grounded reply is not reliably one value. When the search runs as the
 * model's own tool the answer arrives as several assistant segments
 * concatenated into a single `content` string — an empty `{"items": []}`
 * written before the results came back, then the real one — and either segment
 * may be wrapped in a ```json fence or introduced by a sentence of commentary
 * ("Looking at the sources, I'll select..."). Scanning for balanced values
 * finds the JSON whichever of those shapes the reply took, without a fence
 * rule, a preamble rule and a concatenation rule each guessing separately.
 */
function jsonValuesIn(text: string): { source: string; value: unknown }[] {
  const out: { source: string; value: unknown }[] = [];

  for (let i = 0; i < text.length; i++) {
    const open = text[i];
    if (open !== '{' && open !== '[') continue;
    const close = open === '{' ? '}' : ']';

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let j = i; j < text.length; j++) {
      const ch = text[j];

      // Braces inside a string are text, not structure — a headline may
      // legitimately contain one.
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') { inString = true; continue; }
      if (ch === open) { depth++; continue; }
      if (ch !== close) continue;

      depth--;
      if (depth > 0) continue;

      const source = text.slice(i, j + 1);
      try {
        out.push({ source, value: JSON.parse(source) });
        i = j; // Resume past it: what is nested inside a value is not its own answer.
      } catch {
        // Balanced but not JSON — let the outer scan try the next opening brace.
      }
      break;
    }
  }

  return out;
}

/**
 * Parse a model's JSON reply.
 *
 * Tolerant, because a schema is a request and not a guarantee — `jsonValuesIn`
 * above lists what a reply turns out to look like in practice. What is *not*
 * tolerated is a reply with no JSON in it at all: that throws with the opening
 * of what the model actually said, so the log reads as "it wrote prose"
 * instead of as a SyntaxError about a token 'L'.
 */
export function parseJsonReply<T>(text: string, what: string): T {
  const found = jsonValuesIn(text);
  if (!found.length) {
    throw new Error(`${what}: the model replied with prose, not JSON — ${JSON.stringify(text.trim().slice(0, 200))}`);
  }

  // The longest value is the answer. A multi-segment reply opens with the model
  // clearing its throat — an empty `{"items": []}` written before the search
  // came back — and taking the first would read as "found nothing", which this
  // desk treats as a legitimate result rather than as a failure. Silently
  // publishing an empty column is the one wrong answer here.
  return found.reduce((best, v) => (v.source.length >= best.source.length ? v : best)).value as T;
}
