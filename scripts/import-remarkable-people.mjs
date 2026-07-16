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

/**
 * Normalize a story.json date to ISO at its known precision:
 * "March 14, 1879" -> "1879-03-14"; "1879" (or a bare number) -> "1879";
 * already-ISO values pass through; anything else -> null.
 */
function toPartialIso(value) {
  const s = value != null ? String(value).trim() : '';
  if (!s) return null;
  if (/^\d{4}(-\d{2}(-\d{2})?)?$/.test(s)) return s;
  const m = /^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{1,4})$/.exec(s);
  const month = m && MONTHS[m[1].toLowerCase()];
  if (month) return `${m[3].padStart(4, '0')}-${month}-${m[2].padStart(2, '0')}`;
  console.warn(`  Unparseable date "${s}" — storing null.`);
  return null;
}

/**
 * birth_date is a real DATE column and the Born Today lookup key, so it
 * must be full precision; year-only values are rejected with a warning.
 */
function toFullIso(value, slug) {
  const iso = toPartialIso(value);
  if (iso && !/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    console.warn(`  ${slug}: birth_date "${value}" has no month-day — storing null (person won't appear in Born Today).`);
    return null;
  }
  return iso;
}

const COLUMNS = [
  'slug', 'name', 'role', 'field', 'country',
  'birth_date', 'death_date',
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
    birth_date: toFullIso(story.birth_date, slug),
    death_date: toPartialIso(story.death_date ?? story.death_year),
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
      console.log(`${slug}: ${row.name} (born ${row.birth_date ?? 'unknown'})`);
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
