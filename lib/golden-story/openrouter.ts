/**
 * Shared OpenRouter client bits — base URL, models and request headers.
 * Both the writer (brief.ts) and the image renderer (images.ts) go through
 * OpenRouter with one key (OPENROUTER_API_KEY).
 */

export const OPENROUTER = 'https://openrouter.ai/api/v1';
export const WRITER_MODEL = 'anthropic/claude-opus-4.8';
export const IMAGE_MODEL = 'openai/gpt-image-2';

export function orHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://maisondore.com',
    'X-Title': "Maison d'Ore Golden Story",
  };
}
