/**
 * Import Golden Story people from public/stories/<slug>/story.json into the
 * remarkable_person table. Upserts on slug, so re-running after editing a
 * story.json refreshes the row.
 *
 *   npm run import:remarkable-people             # every folder with a story.json
 *   npm run import:remarkable-people -- leonardo # just these slugs
 */
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const ROOT = 'public/stories';

const MONTHS = {
  january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
};

/** "March 14, 1879" -> "03-14"; year-only dates ("1452") -> null. */
function toMonthDay(birthDate) {
  const m = /^([A-Za-z]+)\s+(\d{1,2}),?\s+\d{1,4}$/.exec(birthDate?.trim() ?? '');
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  if (!month) return null;
  return `${month}-${String(m[2]).padStart(2, '0')}`;
}

const COLUMNS = [
  'slug', 'name', 'role', 'field', 'country',
  'birth_date', 'birth_month_day', 'death_year',
  'story_title', 'famous_quote', 'image_url',
  'story_childhood_title', 'childhood_image_url', 'story_childhood', 'story_takeaway',
  'modern', 'chapters', 'timeline', 'after_treasures', 'treasures', 'lessons',
];
const JSON_COLUMNS = new Set(['modern', 'chapters', 'timeline', 'after_treasures', 'treasures', 'lessons']);

function toRow(slug, story) {
  return {
    slug,
    name: story.name,
    role: story.role ?? null,
    field: story.field ?? null,
    country: story.country ?? null,
    birth_date: story.birth_date ?? null,
    birth_month_day: toMonthDay(story.birth_date),
    death_year: story.death_year != null ? String(story.death_year) : null,
    story_title: story.story_title ?? null,
    famous_quote: story.famous_quote ?? null,
    image_url: story.image_url ?? null,
    story_childhood_title: story.story_childhood_title ?? null,
    childhood_image_url: story.childhood_image_url ?? null,
    story_childhood: story.story_childhood ?? null,
    story_takeaway: story.story_takeaway ?? null,
    modern: story.modern ?? null,
    chapters: story.chapters ?? [],
    timeline: story.timeline ?? [],
    after_treasures: story.after_treasures ?? null,
    treasures: story.treasures ?? [],
    lessons: story.lessons ?? [],
  };
}

const UPSERT = `
INSERT INTO remarkable_person (${COLUMNS.join(', ')})
VALUES (${COLUMNS.map((_, i) => `$${i + 1}`).join(', ')})
ON CONFLICT (slug) DO UPDATE SET
  ${COLUMNS.filter((c) => c !== 'slug').map((c) => `${c} = EXCLUDED.${c}`).join(',\n  ')},
  updated_at = now()
`;

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Run via `npm run import:remarkable-people`.');
    process.exit(1);
  }

  const slugArgs = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const allSlugs = (await readdir(ROOT, { withFileTypes: true }))
    .filter((d) => d.isDirectory() && existsSync(path.join(ROOT, d.name, 'story.json')))
    .map((d) => d.name);

  const unknown = slugArgs.filter((s) => !allSlugs.includes(s));
  if (unknown.length) {
    console.error(`No story.json for: ${unknown.join(', ')}. Available: ${allSlugs.join(', ')}`);
    process.exit(1);
  }
  const slugs = slugArgs.length ? slugArgs : allSlugs;

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  let ok = 0;
  try {
    for (const slug of slugs) {
      const story = JSON.parse(await readFile(path.join(ROOT, slug, 'story.json'), 'utf8'));
      if (!story.name) {
        console.warn(`Skipping ${slug}: story.json has no name.`);
        continue;
      }
      const row = toRow(slug, story);
      const values = COLUMNS.map((c) => (JSON_COLUMNS.has(c) && row[c] !== null ? JSON.stringify(row[c]) : row[c]));
      await pool.query(UPSERT, values);
      console.log(`${slug}: ${row.name} (born ${row.birth_month_day ?? 'month-day unknown'})`);
      ok++;
    }
  } finally {
    await pool.end();
  }
  console.log(`Imported/updated ${ok} person(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
