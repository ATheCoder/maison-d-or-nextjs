/**
 * Copy remarkable_person rows that exist in one database but not another.
 *
 *   node scripts/sync-remarkable-people.mjs <SOURCE_URL> <TARGET_URL> [options]
 *   npm run sync:remarkable-people -- <SOURCE_URL> <TARGET_URL> [options]
 *
 * Rows are matched on `slug` (the primary key). Only slugs missing from the
 * target are inserted — existing target rows are never touched, so this is safe
 * to re-run and will not overwrite edits made on the target.
 *
 * Options:
 *   --dry-run          list what would be inserted, change nothing
 *   --with-briefs      also copy each new person's story_brief row
 *   --only a,b,c       restrict to these slugs
 *   --published-only   only consider source rows with published = true
 *
 * Columns are discovered from information_schema and intersected between the
 * two databases, so a schema that has drifted on one side still syncs the
 * columns they share (with a warning for the ones it skips).
 */
import pg from 'pg';

// Copy dates and timestamps as the raw strings Postgres sends. Parsing them
// into JS Dates would shift birth_date by a day (a `date` is parsed in the
// local timezone) and truncate created_at/updated_at to milliseconds, since a
// JS Date can't hold Postgres's microseconds.
pg.types.setTypeParser(1082, (v) => v); // date
pg.types.setTypeParser(1114, (v) => v); // timestamp
pg.types.setTypeParser(1184, (v) => v); // timestamptz

const JSON_TYPES = new Set(['json', 'jsonb']);

function parseArgs(argv) {
  const flags = { dryRun: false, withBriefs: false, publishedOnly: false, only: null };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') flags.dryRun = true;
    else if (arg === '--with-briefs') flags.withBriefs = true;
    else if (arg === '--published-only') flags.publishedOnly = true;
    else if (arg === '--only') flags.only = splitSlugs(argv[++i]);
    else if (arg.startsWith('--only=')) flags.only = splitSlugs(arg.slice('--only='.length));
    else if (arg.startsWith('--')) throw new Error(`Unknown option ${arg}`);
    else positional.push(arg);
  }
  return { flags, positional };
}

function splitSlugs(value) {
  const slugs = String(value ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!slugs.length) throw new Error('--only needs a comma-separated list of slugs');
  return slugs;
}

/** Column name -> data_type, for one table. */
async function columnsOf(client, table) {
  const { rows } = await client.query(
    `SELECT column_name, data_type
       FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = $1
      ORDER BY ordinal_position`,
    [table],
  );
  return new Map(rows.map((r) => [r.column_name, r.data_type]));
}

/**
 * Columns present in both databases. Ones only on the source are dropped (the
 * target has nowhere to put them); ones only on the target keep their default.
 */
function sharedColumns(sourceCols, targetCols, table) {
  const shared = [...sourceCols.keys()].filter((c) => targetCols.has(c));
  const sourceOnly = [...sourceCols.keys()].filter((c) => !targetCols.has(c));
  const targetOnly = [...targetCols.keys()].filter((c) => !sourceCols.has(c));
  if (sourceOnly.length) console.warn(`  ! ${table}: source-only columns skipped: ${sourceOnly.join(', ')}`);
  if (targetOnly.length) console.warn(`  ! ${table}: target-only columns left at default: ${targetOnly.join(', ')}`);
  if (!shared.length) throw new Error(`${table}: source and target share no columns`);
  return shared;
}

const quote = (c) => `"${c}"`;

/**
 * node-postgres renders a JS array as a Postgres array literal, which a
 * json/jsonb column rejects — stringify those values ourselves.
 */
function toParams(row, columns, types) {
  return columns.map((c) => {
    const v = row[c];
    return JSON_TYPES.has(types.get(c)) && v !== null && v !== undefined ? JSON.stringify(v) : v;
  });
}

function insertSql(table, columns) {
  return `INSERT INTO ${table} (${columns.map(quote).join(', ')})
          VALUES (${columns.map((_, i) => `$${i + 1}`).join(', ')})
          ON CONFLICT (slug) DO NOTHING`;
}

async function main() {
  const { flags, positional } = parseArgs(process.argv.slice(2));
  const [sourceUrl, targetUrl] = positional;
  if (!sourceUrl || !targetUrl) {
    console.error('Usage: node scripts/sync-remarkable-people.mjs <SOURCE_URL> <TARGET_URL> [--dry-run] [--with-briefs] [--only a,b] [--published-only]');
    process.exit(1);
  }
  if (sourceUrl === targetUrl) {
    console.error('Source and target URLs are identical — refusing to run.');
    process.exit(1);
  }

  const source = new pg.Client({ connectionString: sourceUrl });
  const target = new pg.Client({ connectionString: targetUrl });
  await source.connect();
  await target.connect();

  try {
    const personCols = sharedColumns(
      await columnsOf(source, 'remarkable_person'),
      await columnsOf(target, 'remarkable_person'),
      'remarkable_person',
    );
    const personTypes = await columnsOf(source, 'remarkable_person');

    // Which slugs the target already has, so we only pull the missing ones.
    const existing = new Set((await target.query('SELECT slug FROM remarkable_person')).rows.map((r) => r.slug));

    const where = ['TRUE'];
    const params = [];
    if (flags.only) { params.push(flags.only); where.push(`slug = ANY($${params.length})`); }
    if (flags.publishedOnly) where.push('published = TRUE');

    const { rows: sourceRows } = await source.query(
      `SELECT ${personCols.map(quote).join(', ')} FROM remarkable_person WHERE ${where.join(' AND ')} ORDER BY slug`,
      params,
    );

    if (flags.only) {
      const found = new Set(sourceRows.map((r) => r.slug));
      const missing = flags.only.filter((s) => !found.has(s));
      if (missing.length) console.warn(`  ! not in source: ${missing.join(', ')}`);
    }

    const toInsert = sourceRows.filter((r) => !existing.has(r.slug));
    const skipped = sourceRows.length - toInsert.length;

    // Same person under a different slug would slip through the slug check.
    const targetNames = new Map(
      (await target.query('SELECT slug, name FROM remarkable_person')).rows.map((r) => [r.name?.toLowerCase(), r.slug]),
    );
    for (const row of toInsert) {
      const clash = targetNames.get(row.name?.toLowerCase());
      if (clash) console.warn(`  ! "${row.name}" already in target as slug "${clash}" — inserting "${row.slug}" anyway`);
    }

    console.log(`Source: ${sourceRows.length} row(s), target already has ${skipped} of them.`);
    if (!toInsert.length) {
      console.log('Nothing to insert — target is up to date.');
      return;
    }

    let briefCols = null;
    let briefTypes = null;
    let briefs = [];
    if (flags.withBriefs) {
      briefTypes = await columnsOf(source, 'story_brief');
      briefCols = sharedColumns(briefTypes, await columnsOf(target, 'story_brief'), 'story_brief');
      const slugs = toInsert.map((r) => r.slug);
      briefs = (await source.query(
        `SELECT ${briefCols.map(quote).join(', ')} FROM story_brief WHERE slug = ANY($1)`,
        [slugs],
      )).rows;
    }

    if (flags.dryRun) {
      for (const row of toInsert) console.log(`  + ${row.slug} — ${row.name}`);
      if (flags.withBriefs) console.log(`  + ${briefs.length} story_brief row(s)`);
      console.log(`\nDry run — ${toInsert.length} person(s) would be inserted. Re-run without --dry-run to apply.`);
      return;
    }

    const personSql = insertSql('remarkable_person', personCols);
    let inserted = 0;
    await target.query('BEGIN');
    try {
      for (const row of toInsert) {
        const res = await target.query(personSql, toParams(row, personCols, personTypes));
        if (res.rowCount) {
          inserted++;
          console.log(`  + ${row.slug} — ${row.name}`);
        } else {
          console.log(`  = ${row.slug} — appeared in target mid-run, left alone`);
        }
      }
      if (flags.withBriefs && briefs.length) {
        const briefSql = insertSql('story_brief', briefCols);
        for (const brief of briefs) await target.query(briefSql, toParams(brief, briefCols, briefTypes));
        console.log(`  + ${briefs.length} story_brief row(s)`);
      }
      await target.query('COMMIT');
    } catch (err) {
      await target.query('ROLLBACK');
      throw err;
    }

    console.log(`\nInserted ${inserted} person(s); ${skipped} already present.`);
    if (!flags.withBriefs) console.log('story_brief rows were not copied (pass --with-briefs to include them).');
  } finally {
    await source.end();
    await target.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
