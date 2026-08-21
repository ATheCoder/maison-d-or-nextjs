import { describe, it, expect } from 'vitest';
import { completionText, jsonSchemaRequest, parseCitations, parseJsonReply, webPlugin } from './openrouter';

describe('webPlugin', () => {
  it('omits unset fields so OpenRouter applies its own defaults', () => {
    expect(webPlugin()).toEqual({ id: 'web' });
  });

  it('carries an outlet allowlist for good-news retrieval (R3.20)', () => {
    expect(webPlugin({ includeDomains: ['positive.news', '*.bbc.co.uk'], maxResults: 8 })).toEqual({
      id: 'web',
      max_results: 8,
      include_domains: ['positive.news', '*.bbc.co.uk'],
    });
  });

  it('drops empty domain lists rather than sending an empty allowlist', () => {
    // An empty include_domains could be read as "allow nothing".
    expect(webPlugin({ includeDomains: [], excludeDomains: [] })).toEqual({ id: 'web' });
  });

  it('trims a blank search prompt away', () => {
    expect(webPlugin({ searchPrompt: '   ' })).toEqual({ id: 'web' });
    expect(webPlugin({ searchPrompt: ' find good news ' })).toEqual({
      id: 'web', search_prompt: 'find good news',
    });
  });
});

describe('parseCitations', () => {
  const completion = (annotations: unknown) => ({ choices: [{ message: { annotations } }] });

  it('extracts url, title and content', () => {
    expect(parseCitations(completion([
      {
        type: 'url_citation',
        url_citation: {
          url: 'https://example.com/a',
          title: 'A good thing happened',
          content: 'On 25 July, ...',
          start_index: 0,
          end_index: 10,
        },
      },
    ]))).toEqual([
      { url: 'https://example.com/a', title: 'A good thing happened', content: 'On 25 July, ...' },
    ]);
  });

  it('collapses duplicate urls, keeping the first', () => {
    const out = parseCitations(completion([
      { type: 'url_citation', url_citation: { url: 'https://example.com/a', title: 'First' } },
      { type: 'url_citation', url_citation: { url: 'https://example.com/a', title: 'Second' } },
    ]));
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe('First');
  });

  it('ignores annotations of other types', () => {
    expect(parseCitations(completion([
      { type: 'file_citation', file_citation: { file_id: 'x' } },
    ]))).toEqual([]);
  });

  it('nulls a missing or blank title and content rather than empty-stringing them', () => {
    expect(parseCitations(completion([
      { type: 'url_citation', url_citation: { url: 'https://example.com/a', title: '  ' } },
    ]))).toEqual([{ url: 'https://example.com/a', title: null, content: null }]);
  });

  it('returns [] for every malformed shape instead of throwing', () => {
    // An unverifiable item is a real outcome the admin gets shown (R3.19);
    // losing the whole generation to a bad annotation would be worse.
    expect(parseCitations(null)).toEqual([]);
    expect(parseCitations({})).toEqual([]);
    expect(parseCitations({ choices: [] })).toEqual([]);
    expect(parseCitations(completion(undefined))).toEqual([]);
    expect(parseCitations(completion('not an array'))).toEqual([]);
    expect(parseCitations(completion([null, 42, 'x']))).toEqual([]);
    expect(parseCitations(completion([{ type: 'url_citation' }]))).toEqual([]);
    expect(parseCitations(completion([{ type: 'url_citation', url_citation: { url: '' } }]))).toEqual([]);
  });
});

describe('completionText', () => {
  it('reads the first choice message content', () => {
    expect(completionText({ choices: [{ message: { content: 'hello' } }] })).toBe('hello');
  });

  it('returns an empty string for anything else', () => {
    expect(completionText(null)).toBe('');
    expect(completionText({ choices: [{ message: {} }] })).toBe('');
    expect(completionText({ choices: [{ message: { content: [{ type: 'text' }] } }] })).toBe('');
  });
});

describe('jsonSchemaRequest', () => {
  const schema = { type: 'object', properties: { a: { type: 'string' } } };

  it('asks for the schema strictly', () => {
    expect(jsonSchemaRequest('out', schema).response_format).toEqual({
      type: 'json_schema',
      json_schema: { name: 'out', strict: true, schema },
    });
  });

  it('pins routing to endpoints that honour the schema', () => {
    // Without this, OpenRouter may route to an endpoint that does not support
    // structured outputs, drop the schema, and return prose.
    expect(jsonSchemaRequest('out', schema).provider).toEqual({ require_parameters: true });
  });
});

describe('parseJsonReply', () => {
  it('reads a plain object', () => {
    expect(parseJsonReply('{"a":1}', 'The reply')).toEqual({ a: 1 });
  });

  it('strips a fence', () => {
    expect(parseJsonReply('```json\n{"a":1}\n```', 'The reply')).toEqual({ a: 1 });
  });

  it('salvages an object written after a sentence of preamble', () => {
    const reply = 'Looking at the request, here is the edition:\n{"a":1}\nHope that helps.';
    expect(parseJsonReply(reply, 'The reply')).toEqual({ a: 1 });
  });

  it('names the prose when there is no object at all', () => {
    // The failure this replaces read "Unexpected token 'L'", which said
    // nothing about what had gone wrong.
    expect(() => parseJsonReply('Looking at the request, I would rather chat.', 'The day draft'))
      .toThrow(/The day draft: the model replied with prose.*Looking at the request/);
  });
});
