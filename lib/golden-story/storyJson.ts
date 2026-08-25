/**
 * Assemble the story.json shape <GoldenStory> consumes from a brief — ported
 * from scripts/generate-story-openrouter.mjs with the image-URL resolver
 * injected. The CLI's default resolver points at the local PNGs
 * (`/stories/<slug>/<file>`); the editor passes a resolver returning R2 URLs.
 * Layout fields (page_span / blend / fade) mirror public/stories/leonardo/story.json.
 */
import type { Brief } from './brief.ts';

export type StoryJson = ReturnType<typeof toStoryJson>;

export function toStoryJson(
  brief: Brief,
  slug: string,
  imageUrlFor: (file: string) => string = (file) => `/stories/${slug}/${file}`,
) {
  const img = imageUrlFor;
  const last = brief.chapters.length - 1;
  return {
    name: brief.name,
    role: brief.role,
    field: brief.field,
    country: brief.country,
    birth_date: brief.birth_date,
    death_year: brief.death_year,
    story_title: brief.name,
    famous_quote: brief.famous_quote,
    image_url: img('cover.png'),
    story_childhood_title: brief.story_childhood_title,
    childhood_image_url: img('strip-childhood.png'),
    story_childhood: brief.story_childhood,
    story_childhood_fact: brief.story_childhood_fact,
    story_takeaway: brief.story_takeaway,
    modern: {
      page_span: 'both',
      blend: 'normal',
      title: brief.modern.title,
      narrative: brief.modern.narrative,
      fact: brief.modern.fact,
      image_url: img('modern.png'),
    },
    // The last chapter is the book's most dramatic painting, and it used to be
    // WORDLESS: page_span 'image', its narrative written by the model and then
    // never displayed. docs/golden-stories-bible.md retired that exception
    // (Standing decision 3) — a spread that carries nothing a child could tell
    // somebody afterwards is the failure the bible exists to prevent. It keeps
    // the full-bleed opaque art (blend 'normal', so the painting is shown as
    // itself) and now lays its title, narrative and fact over it behind the
    // legibility wash, exactly like any other single-leaf chapter. Pagination
    // is untouched: 'image' and 'single' are both single-leaf, so the
    // two-per-spread pairing in GoldenStory pairs them the same way.
    //
    // Stories generated before that ruling still hold page_span 'image' in the
    // database and still render wordless. That is Standing decision 1, not a
    // bug — do not migrate them.
    chapters: brief.chapters.map((c, i) => ({
      number: i + 1,
      page_span: 'single',
      // The final plate is opaque full-bleed art; the rest are painted on
      // white and multiply into the parchment.
      ...(i === last ? { blend: 'normal', fade: true } : {}),
      title: c.title,
      narrative: c.narrative,
      fact: c.fact,
      image_url: img(`chapter-${i + 1}.png`),
    })),
    timeline: brief.timeline.map((t, i) => ({
      year: t.year,
      caption: t.caption,
      image_url: img(`timeline-${i + 1}.png`),
      blend: 'multiply',
    })),
    after_treasures: {
      page_span: 'single',
      title: brief.after_treasures.title,
      narrative: brief.after_treasures.narrative,
      fact: brief.after_treasures.fact,
      image_url: img('after-treasures.png'),
      fade: false,
    },
    treasures: brief.treasures.map((t, i) => ({
      name: t.name,
      image_url: img(`treasure-${i + 1}.png`),
    })),
    lessons: brief.lessons.map((l) => ({ icon_name: l.icon_name, lesson: l.lesson })),
  };
}
