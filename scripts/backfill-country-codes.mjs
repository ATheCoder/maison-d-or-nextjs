/**
 * Backfill remarkable_person.country_code from the free-text `country` column.
 *
 *   node --env-file=.env scripts/backfill-country-codes.mjs            # report only
 *   node --env-file=.env scripts/backfill-country-codes.mjs --apply    # write
 *
 * **Unambiguous hits only** (flag-seal spec R4.12 / plan R5.4). The rest are
 * left null for a human to pick in the person editor, where the resolver's
 * guess is offered but visibly marked as a guess.
 *
 * This is deliberately *more conservative than* `resolveNationality`. That
 * function resolves compounds by first-part-wins — "Italian-French" → IT —
 * which is the right rule for a live reader that must either show a flag or
 * show nothing. It is the wrong rule for a backfill: writing IT into the column
 * makes a judgment call permanent and indistinguishable from a confirmed one.
 * So a string whose parts disagree is reported and skipped.
 *
 * Imports lib/countries.ts directly (Node strips the types), so the backfill,
 * the admin UI and the reader all resolve through one table by construction.
 */
import pg from 'pg';
import { COUNTRIES, countryByCode, flagEmoji, resolveNationality } from '../lib/countries.ts';

const APPLY = process.argv.includes('--apply');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Try: node --env-file=.env scripts/backfill-country-codes.mjs');
  process.exit(1);
}

/**
 * The unambiguous code for a free-text country, or a reason it is not.
 *
 * Unambiguous means one of:
 *   - the whole string resolves (e.g. "Italy", "American", "Soviet Union"), or
 *   - exactly one distinct code is reachable from its parts.
 *
 * Two parts resolving to different countries ("Italian-French", "Polish-French")
 * is precisely the case a human should decide.
 */
function unambiguousCode(country) {
  const whole = resolveNationality(country);

  // Which distinct countries does any single part point at?
  const parts = String(country)
    .split(/[-,/()]+|\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const partCodes = new Set(parts.map((p) => resolveNationality(p)).filter(Boolean));

  if (partCodes.size > 1) {
    const names = [...partCodes].map((c) => countryByCode(c)?.name ?? c).join(' / ');
    return { code: null, reason: `ambiguous — could be ${names}` };
  }
  if (whole) return { code: whole, reason: null };
  if (partCodes.size === 1) return { code: [...partCodes][0], reason: null };
  return { code: null, reason: 'no match' };
}

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

try {
  const { rows } = await client.query(`
    select slug, name, country, country_code
    from remarkable_person
    order by name
  `);

  const resolved = [];
  const ambiguous = [];
  const unmatched = [];
  const already = [];

  for (const row of rows) {
    if (row.country_code && row.country_code.trim()) {
      already.push(row);
      continue;
    }
    if (!row.country || !row.country.trim()) {
      unmatched.push({ ...row, reason: 'no country text' });
      continue;
    }
    const { code, reason } = unambiguousCode(row.country);
    if (code) resolved.push({ ...row, code });
    else if (reason?.startsWith('ambiguous')) ambiguous.push({ ...row, reason });
    else unmatched.push({ ...row, reason });
  }

  const pad = (s, n) => String(s).padEnd(n);
  console.log(`\n${rows.length} people · ${COUNTRIES.length} countries in the table\n`);

  if (resolved.length) {
    console.log(`── Unambiguous (${resolved.length}) ${APPLY ? '— writing' : '— would write'}`);
    for (const r of resolved) {
      console.log(`   ${pad(r.name, 28)} ${pad(r.country, 30)} → ${flagEmoji(r.code)} ${r.code}`);
    }
  }
  if (ambiguous.length) {
    console.log(`\n── Left null, needs a human (${ambiguous.length})`);
    for (const r of ambiguous) console.log(`   ${pad(r.name, 28)} ${pad(r.country, 30)} — ${r.reason}`);
  }
  if (unmatched.length) {
    console.log(`\n── Left null, no match (${unmatched.length})`);
    for (const r of unmatched) console.log(`   ${pad(r.name, 28)} ${pad(r.country ?? '—', 30)} — ${r.reason}`);
  }
  if (already.length) console.log(`\n── Already set, untouched (${already.length})`);

  if (!APPLY) {
    console.log(`\nReport only. Re-run with --apply to write ${resolved.length} code(s).\n`);
  } else if (resolved.length) {
    // One statement, one transaction — a partial backfill is harder to reason
    // about than none, and the table is tens of rows.
    await client.query('begin');
    for (const r of resolved) {
      await client.query(
        'update remarkable_person set country_code = $1, updated_at = now() where slug = $2 and country_code is null',
        [r.code, r.slug],
      );
    }
    await client.query('commit');
    console.log(`\nWrote ${resolved.length} country code(s). ${ambiguous.length + unmatched.length} left null.\n`);
  } else {
    console.log('\nNothing to write.\n');
  }
} catch (err) {
  await client.query('rollback').catch(() => {});
  throw err;
} finally {
  await client.end();
}
