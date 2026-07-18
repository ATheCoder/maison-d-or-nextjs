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
    story_takeaway: brief.story_takeaway,
    modern: {
      page_span: 'both',
      blend: 'normal',
      title: brief.modern.title,
      narrative: brief.modern.narrative,
      image_url: img('modern.png'),
    },
    chapters: brief.chapters.map((c, i) => (i === last
      ? {
          number: i + 1,
          page_span: 'image',
          blend: 'normal',
          image_url: img(`chapter-${i + 1}.png`),
        }
      : {
          number: i + 1,
          page_span: 'single',
          title: c.title,
          narrative: c.narrative,
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
