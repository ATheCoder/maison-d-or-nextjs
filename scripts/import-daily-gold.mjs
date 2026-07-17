#!/usr/bin/env node
/**
 * Import Base44 "DailyGoldEdition" records into the local Postgres table.
 *
 * Usage:
 *   node --env-file=.env scripts/import-daily-gold.mjs <export.csv>
 *   node --env-file=.env scripts/import-daily-gold.mjs <export.json>
 *   node --env-file=.env scripts/import-daily-gold.mjs --from-api
 *
 * A `.csv` file is Base44's CSV export (the array columns hold JSON strings).
 * A JSON file accepts a top-level array, or an object wrapping the array under
 * `records`, `data`, `items`, or `DailyGoldEdition`.
 *
 * With --from-api, it pages through the Base44 REST API using
 * NEXT_PUBLIC_BASE44_APP_ID / NEXT_PUBLIC_BASE44_API_KEY (or BASE44_APP_ID /
 * BASE44_API_KEY) from the environment.
 *
 * Re-running is safe: rows upsert on the Base44 `id`.
 */
import { readFile } from 'node:fs/promises';
import pg from 'pg';

const STATUSES = new Set(['generating', 'ready', 'fallback']);

function arr(v) {
  return Array.isArray(v) ? v : [];
}

function normalizeStatus(v) {
  return STATUSES.has(v) ? v : 'generating';
}

function toTimestamp(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// Map a raw Base44 record onto the daily_gold_edition column order.
function toRow(rec) {
  const editionDate = rec.edition_date || rec.editionDate;
  if (!editionDate) return null; // edition_date is required
  const id = String(rec.id || rec._id || editionDate);
  return [
    id,
    editionDate,
    rec.destination_country ?? null,
    rec.destination_description ?? null,
    rec.destination_image_url ?? null,
    rec.taste_of_day ?? null,
    rec.sound_of_day ?? null,
    rec.nature_detail ?? null,
    rec.tiny_phrase ?? null,
    rec.tiny_phrase_language ?? null,
    rec.tiny_phrase_translation ?? null,
    toTimestamp(rec.generated_at),
    normalizeStatus(rec.status),
  ];
}

const COLUMNS = [
  'id', 'edition_date', 'destination_country', 'destination_description',
  'destination_image_url', 'taste_of_day', 'sound_of_day', 'nature_detail',
  'tiny_phrase', 'tiny_phrase_language', 'tiny_phrase_translation',
  'generated_at', 'status',
];

const UPSERT_SQL = `
INSERT INTO daily_gold_edition (${COLUMNS.join(', ')})
VALUES (${COLUMNS.map((_, i) => `$${i + 1}`).join(', ')})
ON CONFLICT (id) DO UPDATE SET
  ${COLUMNS.slice(1).map(c => `${c} = EXCLUDED.${c}`).join(',\n  ')},
  updated_at = now()
`;

async function loadFromJson(path) {
  const parsed = JSON.parse(await readFile(path, 'utf8'));
  if (Array.isArray(parsed)) return parsed;
  for (const key of ['records', 'data', 'items', 'DailyGoldEdition', 'daily_gold_edition']) {
    if (Array.isArray(parsed?.[key])) return parsed[key];
  }
  if (parsed && typeof parsed === 'object') return [parsed]; // single record
  throw new Error('Could not find an array of records in the export file.');
}

// RFC-4180 CSV parser (handles quoted fields, embedded newlines, "" escapes).
function parseCsv(str) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (inQ) {
      if (c === '"') { if (str[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// The repeated content groups now live in their own tables (good_news_item,
// on_this_day_event, greatest_moment); no jsonb columns remain on the edition.
const JSON_COLUMNS = new Set();

async function loadFromCsv(path) {
  const rows = parseCsv(await readFile(path, 'utf8'));
  if (rows.length < 2) return [];
  const header = rows[0];
  const out = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    if (cells.length === 1 && cells[0] === '') continue; // trailing blank line
    const rec = {};
    header.forEach((h, i) => {
      const v = cells[i] ?? '';
      if (JSON_COLUMNS.has(h)) {
        try { rec[h] = v.trim() ? JSON.parse(v) : []; }
        catch { rec[h] = []; }
      } else {
        rec[h] = v === '' ? undefined : v;
      }
    });
    out.push(rec);
  }
  return out;
}

function loadFromFile(path) {
  return path.toLowerCase().endsWith('.csv') ? loadFromCsv(path) : loadFromJson(path);
}

async function loadFromApi() {
  const appId = process.env.NEXT_PUBLIC_BASE44_APP_ID || process.env.BASE44_APP_ID;
  const apiKey = process.env.NEXT_PUBLIC_BASE44_API_KEY || process.env.BASE44_API_KEY;
  if (!appId || !apiKey) {
    throw new Error('Set NEXT_PUBLIC_BASE44_APP_ID and NEXT_PUBLIC_BASE44_API_KEY to import from the API.');
  }
  const base = `https://app.base44.com/api/apps/${appId}/entities/DailyGoldEdition`;
  const limit = 100;
  let skip = 0;
  const all = [];
  for (;;) {
    const url = `${base}?limit=${limit}&skip=${skip}&sort=-edition_date`;
    const res = await fetch(url, { headers: { api_key: apiKey } });
    if (!res.ok) throw new Error(`Base44 API ${res.status}: ${await res.text()}`);
    const page = await res.json();
    if (!Array.isArray(page) || page.length === 0) break;
    all.push(...page);
    if (page.length < limit) break;
    skip += limit;
  }
  return all;
}

async function main() {
  const args = process.argv.slice(2);
  const fromApi = args.includes('--from-api');
  const file = args.find(a => !a.startsWith('--'));

  if (!fromApi && !file) {
    console.error('Usage: node --env-file=.env scripts/import-daily-gold.mjs <export.json> | --from-api');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Run with: node --env-file=.env scripts/import-daily-gold.mjs ...');
    process.exit(1);
  }

  const records = fromApi ? await loadFromApi() : await loadFromFile(file);
  console.log(`Loaded ${records.length} record(s) from ${fromApi ? 'the Base44 API' : file}.`);

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  let ok = 0, skipped = 0;
  try {
    await client.query('BEGIN');
    for (const rec of records) {
      const row = toRow(rec);
      if (!row) { skipped++; continue; }
      await client.query(UPSERT_SQL, row);
      ok++;
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }

  console.log(`Imported/updated ${ok} edition(s).${skipped ? ` Skipped ${skipped} without edition_date.` : ''}`);
}

main().catch(err => {
  console.error('Import failed:', err.message);
  process.exit(1);
});
