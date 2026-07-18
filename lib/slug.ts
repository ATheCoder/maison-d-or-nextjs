/**
 * Slugify a person's name into the folder-style slug used as the
 * remarkable_person primary key — identical to the CLI's slugify
 * (scripts/generate-story-openrouter.mjs) so a name maps to the same slug
 * whether created here or generated there. Pure, so the create form can
 * preview the slug live on the client.
 */
export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// A slug the editor/DB will accept: lowercase words joined by single dashes.
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
