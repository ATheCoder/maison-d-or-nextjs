import { readFile } from 'node:fs/promises';
import path from 'node:path';
import GoldenStory from '@/components/dailygold/GoldenStory';

/**
 * Example Golden Story served straight from static files.
 *
 * The text lives in public/stories/leonardo/story.json and the illustrations
 * are the .png files sitting beside it (referenced by the story.json's
 * image_url fields, e.g. "/stories/leonardo/cover.png"). We read the JSON at
 * request time and hand it to <GoldenStory> exactly as the Drizzle-backed
 * storybook page does — no database involved.
 *
 * Visit /stories/leonardo to flip through it.
 */
export default async function LeonardoStoryPage() {
  const file = path.join(
    process.cwd(),
    'public',
    'stories',
    'leonardo',
    'story.json',
  );
  const story = JSON.parse(await readFile(file, 'utf8'));

  return <GoldenStory story={story} />;
}
