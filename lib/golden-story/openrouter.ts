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
 * The image model.
 *
 * Was `openai/gpt-image-2` until a live query of GET /api/v1/models on
 * 2026-07-25 returned no such id — the model had been renamed underneath the
 * repo, and since `renderImage` throws on a non-OK response, **every render in
 * the product was failing** (spec R7.15). The catalogue's OpenAI image models
 * are `openai/gpt-5.4-image-2`, `openai/gpt-5-image` and
 * `openai/gpt-5-image-mini`; this is the direct successor by name.
 *
 * The POST /images endpoint and its `{model, prompt, size, quality}` body were
 * verified against the live API at the same time and are unchanged — the
 * endpoint validated the body and only then asked for credentials, so the call
 * shape in images.ts is right. The model id was the whole defect.
 */
export const IMAGE_MODEL = 'openai/gpt-5.4-image-2';

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
