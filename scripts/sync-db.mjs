/**
 * Copy rows that exist in one database but not another, for every table.
 *
 *   node scripts/sync-db.mjs <SOURCE_URL> <TARGET_URL> [options]
 *   npm run sync:db -- <SOURCE_URL> <TARGET_URL> [options]
 *
 * This is scripts/sync-remarkable-people.mjs generalised: instead of one table
 * matched on `slug`, every base table in the schema is matched on a key
 * discovered from its unique indexes. Only rows whose key is missing from the
 * target are inserted — existing target rows are never updated or deleted, so
 * re-running is safe and never overwrites edits made on the target.
 *
 * Options:
 *   --dry-run           list what would be inserted, change nothing
 *   --tables a,b        only these tables (default: all)
 *   --exclude a,b       skip these tables
 *   --key t=c1+c2       match table `t` on these columns instead of the
 *                       discovered key (repeatable)
 *   --list              print the plan (order, keys, id handling) and exit
 *
 * How a table's key is chosen:
 *   1. a --key override, if given;
 *   2. the primary key, unless it is a single auto-generated column
 *      (serial/identity) — two databases assign those independently, so id 7
 *      on the source is not the same row as id 7 on the target;
 *   3. for such a table, a natural unique index instead (e.g. good_news_item's
 *      (date, position)), with `id` left out of the INSERT so the target's own
 *      sequence assigns it;
 *   4. except when another table's foreign key points at that generated column,
 *      in which case the ids have to be preserved and the primary key is used
 *      after all — the sequence is bumped past them afterwards.
 * A table with no usable key is skipped with a warning; pass --key to sync it.
 *
 * Tables are inserted parents-first, ordered by their foreign keys, and the
 * whole run is one transaction on the target: any failure rolls all of it back.
 *
 * Columns are discovered from information_schema and intersected between the
 * two databases, so a schema that has drifted on one side still syncs the
 * columns they share (with a warning for the ones it skips).
 */
import pg from 'pg';

// Copy dates and timestamps as the raw strings Postgres sends. Parsing them
// into JS Dates would shift a `date` by a day (it is parsed in the local
// timezone) and truncate timestamps to milliseconds, since a JS Date can't hold
// Postgres's microseconds. It also keeps key comparison textual on both sides.
pg.types.setTypeParser(1082, (v) => v); // date
pg.types.setTypeParser(1114, (v) => v); // timestamp
pg.types.setTypeParser(1184, (v) => v); // timestamptz

const JSON_TYPES = new Set(['json', 'jsonb']);

// Drizzle's bookkeeping lives in its own schema, but exclude it by name too in
// case a project ever points it at the public one.
const ALWAYS_SKIP = new Set(['__drizzle_migrations']);

// Rows per INSERT statement. Large enough to keep the round-trips down, small
// enough to stay under Postgres's 65535-parameter ceiling on wide tables.
const CHUNK_ROWS = 100;

function parseArgs(argv) {
  const flags = { dryRun: false, list: false, tables: null, exclude: new Set(), keys: new Map() };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    // `--opt value` consumes the next argv entry, `--opt=value` carries its own.
    const eq = arg.indexOf('=');
    const name = eq === -1 ? arg : arg.slice(0, eq);
    const inline = eq === -1 ? null : arg.slice(eq + 1);
    const value = () => {
      if (inline !== null) return inline;
      if (i + 1 >= argv.length) throw expected(`${name} needs a value`);
      return argv[++i];
    };

    if (name === '--dry-run') flags.dryRun = true;
    else if (name === '--list') flags.list = true;
    else if (name === '--tables') flags.tables = new Set(splitList(value(), '--tables'));
    else if (name === '--exclude') for (const t of splitList(value(), '--exclude')) flags.exclude.add(t);
    else if (name === '--key') addKey(flags.keys, value());
    else if (arg.startsWith('--')) throw expected(`Unknown option ${arg}`);
    else positional.push(arg);
  }
  return { flags, positional };
}

function splitList(value, option) {
  const items = String(value ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!items.length) throw expected(`${option} needs a comma-separated list`);
  return items;
}

function addKey(keys, spec) {
  const [table, cols] = String(spec ?? '').split('=');
  const columns = (cols ?? '').split('+').map((s) => s.trim()).filter(Boolean);
  if (!table || !columns.length) throw expected('--key wants table=col or table=col1+col2');
  keys.set(table.trim(), columns);
}

const quote = (id) => `"${id.replace(/"/g, '""')}"`;

/** An error the script anticipates — reported as a message, without a stack. */
function expected(message) {
  const err = new Error(message);
  err.expected = true;
  return err;
}

// ── Schema discovery ─────────────────────────────────────────────────────────

async function tablesOf(client) {
  const { rows } = await client.query(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = current_schema() AND table_type = 'BASE TABLE'
      ORDER BY table_name`,
  );
  return rows.map((r) => r.table_name).filter((t) => !ALWAYS_SKIP.has(t));
}

/** Column name -> { type, generated }, for one table. */
async function columnsOf(client, table) {
  const { rows } = await client.query(
    `SELECT column_name, data_type, is_identity, column_default
       FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = $1
      ORDER BY ordinal_position`,
    [table],
  );
  return new Map(rows.map((r) => [r.column_name, {
    type: r.data_type,
    // serial columns are a nextval() default; identity columns say so outright.
    generated: r.is_identity === 'YES' || /^nextval\(/i.test(r.column_default ?? ''),
  }]));
}

/**
 * Every usable unique index on a table, as { name, primary, columns }.
 * Partial and expression indexes are left out — neither can serve as a match
 * key or as an ON CONFLICT target for arbitrary rows.
 */
async function uniqueIndexesOf(client, table) {
  const { rows } = await client.query(
    `SELECT i.relname AS name,
            ix.indisprimary AS "primary",
            (SELECT array_agg(a.attname::text ORDER BY k.ord)
               FROM unnest(ix.indkey) WITH ORDINALITY AS k(attnum, ord)
               JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum) AS columns
       FROM pg_index ix
       JOIN pg_class t ON t.oid = ix.indrelid
       JOIN pg_class i ON i.oid = ix.indexrelid
      WHERE ix.indisunique
        AND ix.indpred IS NULL
        AND 0 <> ALL (ix.indkey)
        AND t.relname = $1
        AND t.relnamespace = current_schema()::regnamespace
      ORDER BY ix.indisprimary DESC, i.relname`,
    [table],
  );
  return rows.map((r) => ({ name: r.name, primary: r.primary, columns: r.columns }));
}

/** Foreign keys as { child, childColumns, parent, parentColumns }. */
async function foreignKeysOf(client) {
  const { rows } = await client.query(
    `SELECT src.relname AS child,
            tgt.relname AS parent,
            (SELECT array_agg(a.attname::text ORDER BY k.ord)
               FROM unnest(con.conkey) WITH ORDINALITY AS k(attnum, ord)
               JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = k.attnum) AS child_columns,
            (SELECT array_agg(a.attname::text ORDER BY k.ord)
               FROM unnest(con.confkey) WITH ORDINALITY AS k(attnum, ord)
               JOIN pg_attribute a ON a.attrelid = con.confrelid AND a.attnum = k.attnum) AS parent_columns
       FROM pg_constraint con
       JOIN pg_class src ON src.oid = con.conrelid
       JOIN pg_class tgt ON tgt.oid = con.confrelid
      WHERE con.contype = 'f'
        AND src.relnamespace = current_schema()::regnamespace`,
  );
  return rows.map((r) => ({
    child: r.child,
    parent: r.parent,
    childColumns: r.child_columns,
    parentColumns: r.parent_columns,
  }));
}

// ── Planning ─────────────────────────────────────────────────────────────────

/**
 * Parents before children, so a row never lands before the row it references.
 * A self-reference is not an ordering problem between tables; a cycle between
 * two tables is, and there is nothing this script can do about it beyond
 * saying so — every insert happens in one transaction, but a non-deferrable
 * constraint is still checked per statement.
 */
function topoSort(tables, foreignKeys) {
  const set = new Set(tables);
  const parentsOf = new Map(tables.map((t) => [t, new Set()]));
  for (const fk of foreignKeys) {
    if (fk.child === fk.parent) continue;
    if (set.has(fk.child) && set.has(fk.parent)) parentsOf.get(fk.child).add(fk.parent);
  }

  const ordered = [];
  const done = new Set();
  let remaining = [...tables];
  while (remaining.length) {
    const ready = remaining.filter((t) => [...parentsOf.get(t)].every((p) => done.has(p)));
    if (!ready.length) {
      console.warn(`  ! foreign-key cycle among: ${remaining.join(', ')} — inserting in name order`);
      ordered.push(...remaining);
      break;
    }
    for (const t of ready) { ordered.push(t); done.add(t); }
    remaining = remaining.filter((t) => !done.has(t));
  }
  return ordered;
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
  return shared;
}

/**
 * Decide how one table is matched and whether its generated id travels with
 * the row. Returns null when there is no safe way to tell two rows apart.
 */
function planTable(table, { sourceCols, targetCols, sourceIndexes, targetIndexes, referencedColumns, override }) {
  const columns = sharedColumns(sourceCols, targetCols, table);
  if (!columns.length) {
    console.warn(`  ! ${table}: source and target share no columns — skipped`);
    return null;
  }
  const usable = (cols) => cols.every((c) => columns.includes(c));

  if (override) {
    const missing = override.filter((c) => !columns.includes(c));
    if (missing.length) throw expected(`${table}: --key column(s) not in both databases: ${missing.join(', ')}`);
    // An override may name columns with no unique index behind them, so this
    // path can't rely on ON CONFLICT; the in-memory key set does the work.
    const hasIndex = targetIndexes.some((ix) => sameColumns(ix.columns, override));
    return { table, columns, key: override, conflictTarget: hasIndex ? override : null, preserveIds: true, note: 'key from --key' };
  }

  // A key has to be unique on both sides to mean the same thing on both sides.
  const shared = targetIndexes.filter((ix) => sourceIndexes.some((s) => sameColumns(s.columns, ix.columns)) && usable(ix.columns));
  const primary = shared.find((ix) => ix.primary);
  const generatedPk = primary && primary.columns.length === 1 && sourceCols.get(primary.columns[0])?.generated
    ? primary.columns[0]
    : null;

  if (primary && !generatedPk) {
    return { table, columns, key: primary.columns, conflictTarget: primary.columns, preserveIds: true, note: 'primary key' };
  }

  if (generatedPk) {
    // Another table points at this id, so renumbering would break that link:
    // the id has to travel with the row. That is only sound if the two
    // databases agree about what each id means, which `verifyIds` checks
    // before anything is written.
    if (referencedColumns.has(generatedPk)) {
      return {
        table,
        columns,
        key: primary.columns,
        conflictTarget: primary.columns,
        preserveIds: true,
        resetSequence: generatedPk,
        verifyIds: true,
        note: `generated ${generatedPk} preserved — referenced by a foreign key`,
      };
    }
    const natural = shared.find((ix) => !ix.primary && !ix.columns.includes(generatedPk));
    if (natural) {
      return {
        table,
        columns: columns.filter((c) => c !== generatedPk),
        key: natural.columns,
        conflictTarget: natural.columns,
        preserveIds: false,
        note: `matched on ${natural.columns.join(' + ')}; ${generatedPk} reassigned by the target`,
      };
    }
    console.warn(`  ! ${table}: only key is the generated column "${generatedPk}", which the two databases assign independently — skipped (pass --key ${table}=<cols> to sync it)`);
    return null;
  }

  const any = shared[0];
  if (any) return { table, columns, key: any.columns, conflictTarget: any.columns, preserveIds: true, note: `unique index ${any.name}` };

  console.warn(`  ! ${table}: no unique key shared by both databases — skipped (pass --key ${table}=<cols> to sync it)`);
  return null;
}

const sameColumns = (a, b) => a.length === b.length && a.every((c, i) => c === b[i]);

// ── Copying ──────────────────────────────────────────────────────────────────

/**
 * node-postgres renders a JS array as a Postgres array literal, which a
 * json/jsonb column rejects — stringify those values ourselves.
 */
function toParam(value, type) {
  return JSON_TYPES.has(type) && value !== null && value !== undefined ? JSON.stringify(value) : value;
}

/**
 * JSON with object keys in a fixed order, so two jsonb values that differ only
 * in the order Postgres happened to return their keys compare equal.
 */
function stable(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
}

/**
 * A row's identity as a comparable string. Values arrive as the same
 * primitives from both databases (dates and timestamps stay raw text), so
 * JSON of the tuple is a faithful equality test.
 */
const keyOf = (row, key) => stable(key.map((c) => row[c] ?? null));

/**
 * Guard for the one case where a row carries its generated id across: some
 * other table's foreign key points at that id, so the id cannot be reassigned.
 * Preserving it is only correct if both databases mean the same row by the
 * same number — if the target grew its own id 1 independently, inserting the
 * source's id 1 would be skipped as a conflict and every child row pointing at
 * 1 would silently attach to the target's unrelated row.
 *
 * There is no way to tell that apart from a legitimate edit, and a mislinked
 * foreign key is far worse than a refusal, so any disagreement stops the run.
 */
function verifyIds(table, key, columns, sourceRows, targetRows) {
  const targetByKey = new Map(targetRows.map((r) => [keyOf(r, key), r]));
  const clashes = [];
  for (const row of sourceRows) {
    const other = targetByKey.get(keyOf(row, key));
    if (!other) continue;
    const differing = columns.filter((c) => stable(row[c]) !== stable(other[c]));
    if (differing.length) clashes.push({ key: key.map((c) => row[c]).join(', '), differing });
  }
  if (!clashes.length) return;

  const examples = clashes.slice(0, 3)
    .map((c) => `      ${key.join(', ')} = ${c.key} — differs on ${c.differing.join(', ')}`)
    .join('\n');
  throw expected(
    `${table}: ${clashes.length} row(s) share an id with a different row in the target.\n`
    + `    "${key.join(', ')}" is generated by each database independently and cannot be reassigned here, `
    + `because another table's foreign key points at it. Copying these rows would attach their children to the wrong target rows.\n`
    + `${examples}\n`
    + `    Reconcile the ids by hand, or pass --exclude ${table} to leave this table (and re-check anything referencing it) alone.`,
  );
}

function insertSql(table, columns, conflictTarget, startParam = 1, rowCount = 1) {
  const values = [];
  let n = startParam;
  for (let r = 0; r < rowCount; r++) values.push(`(${columns.map(() => `$${n++}`).join(', ')})`);
  const conflict = conflictTarget ? ` ON CONFLICT (${conflictTarget.map(quote).join(', ')}) DO NOTHING` : '';
  return `INSERT INTO ${quote(table)} (${columns.map(quote).join(', ')}) VALUES ${values.join(', ')}${conflict}`;
}

async function copyTable(source, target, plan, sourceCols, dryRun) {
  const { table, columns, key, conflictTarget } = plan;

  const { rows: sourceRows } = await source.query(
    `SELECT ${columns.map(quote).join(', ')} FROM ${quote(table)}`,
  );
  // Only the key is needed to tell which rows are missing; the full row is
  // read back as well when preserved ids have to be checked for disagreement.
  const probe = plan.verifyIds ? columns : key;
  const { rows: targetRows } = await target.query(
    `SELECT ${probe.map(quote).join(', ')} FROM ${quote(table)}`,
  );
  if (plan.verifyIds) verifyIds(table, key, columns, sourceRows, targetRows);

  const existing = new Set(targetRows.map((r) => keyOf(r, key)));
  const toInsert = [];
  const seen = new Set();
  let nullKeys = 0;
  let dupes = 0;
  for (const row of sourceRows) {
    // Postgres treats NULLs in a unique index as distinct, so such a row can
    // neither be matched nor safely deduped. Leave it out and say how many.
    if (key.some((c) => row[c] === null || row[c] === undefined)) { nullKeys++; continue; }
    const k = keyOf(row, key);
    if (existing.has(k)) continue;
    if (seen.has(k)) { dupes++; continue; }
    seen.add(k);
    toInsert.push(row);
  }

  const skipped = sourceRows.length - toInsert.length - nullKeys - dupes;
  if (nullKeys) console.warn(`  ! ${table}: ${nullKeys} source row(s) have a NULL in the key ${key.join(' + ')} — not copied`);
  if (dupes) console.warn(`  ! ${table}: ${dupes} source row(s) share a key with another source row — first one only`);

  if (!toInsert.length || dryRun) {
    return { inserted: 0, candidates: toInsert.length, skipped, total: sourceRows.length };
  }

  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += CHUNK_ROWS) {
    const chunk = toInsert.slice(i, i + CHUNK_ROWS);
    const params = chunk.flatMap((row) => columns.map((c) => toParam(row[c], sourceCols.get(c).type)));
    const res = await target.query(insertSql(table, columns, conflictTarget, 1, chunk.length), params);
    inserted += res.rowCount;
  }

  // Explicit ids leave the target's sequence behind the rows now in the table;
  // without this the next insert by the app would collide on the primary key.
  if (plan.resetSequence) {
    await target.query(
      `SELECT setval(pg_get_serial_sequence($1, $2),
                     GREATEST((SELECT COALESCE(MAX(${quote(plan.resetSequence)}), 0) FROM ${quote(table)}), 1))`,
      [table, plan.resetSequence],
    );
  }

  return { inserted, candidates: toInsert.length, skipped, total: sourceRows.length };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { flags, positional } = parseArgs(process.argv.slice(2));
  const [sourceUrl, targetUrl] = positional;
  if (!sourceUrl || !targetUrl) {
    console.error('Usage: node scripts/sync-db.mjs <SOURCE_URL> <TARGET_URL> [--dry-run] [--list] [--tables a,b] [--exclude a,b] [--key t=c1+c2]');
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
    const sourceTables = await tablesOf(source);
    const targetTables = new Set(await tablesOf(target));

    const missingInTarget = sourceTables.filter((t) => !targetTables.has(t));
    if (missingInTarget.length) console.warn(`  ! tables absent from the target: ${missingInTarget.join(', ')}`);
    if (flags.tables) {
      const unknown = [...flags.tables].filter((t) => !sourceTables.includes(t));
      if (unknown.length) throw expected(`--tables names table(s) not in the source: ${unknown.join(', ')}`);
    }

    const selected = sourceTables.filter((t) => (
      targetTables.has(t) && !flags.exclude.has(t) && (!flags.tables || flags.tables.has(t))
    ));
    if (!selected.length) {
      console.log('No tables to sync.');
      return;
    }

    // Which columns other tables point at, per table — the reason an id may
    // have to keep its value instead of being reassigned by the target.
    const foreignKeys = await foreignKeysOf(source);
    const referenced = new Map(selected.map((t) => [t, new Set()]));
    for (const fk of foreignKeys) {
      if (!referenced.has(fk.parent)) continue;
      for (const c of fk.parentColumns) referenced.get(fk.parent).add(c);
    }

    const order = topoSort(selected, foreignKeys);

    const columnsByTable = new Map();
    const plans = [];
    for (const table of order) {
      const sourceCols = await columnsOf(source, table);
      const plan = planTable(table, {
        sourceCols,
        targetCols: await columnsOf(target, table),
        sourceIndexes: await uniqueIndexesOf(source, table),
        targetIndexes: await uniqueIndexesOf(target, table),
        referencedColumns: referenced.get(table),
        override: flags.keys.get(table),
      });
      if (!plan) continue;
      columnsByTable.set(table, sourceCols);
      plans.push(plan);
    }

    const unknownKeys = [...flags.keys.keys()].filter((t) => !plans.some((p) => p.table === t));
    if (unknownKeys.length) console.warn(`  ! --key given for table(s) not being synced: ${unknownKeys.join(', ')}`);

    console.log(`\nPlan — ${plans.length} table(s), parents first:`);
    for (const p of plans) console.log(`  ${p.table} — key ${p.key.join(' + ')} (${p.note})`);
    if (flags.list) return;

    console.log('');
    if (!flags.dryRun) await target.query('BEGIN');
    try {
      let totalInserted = 0;
      for (const plan of plans) {
        const res = await copyTable(source, target, plan, columnsByTable.get(plan.table), flags.dryRun);
        totalInserted += res.inserted;
        const verb = flags.dryRun ? 'would insert' : 'inserted';
        const count = flags.dryRun ? res.candidates : res.inserted;
        console.log(`  ${plan.table}: ${res.total} source row(s), ${res.skipped} already present, ${verb} ${count}`);
      }
      if (!flags.dryRun) await target.query('COMMIT');

      if (flags.dryRun) {
        console.log('\nDry run — nothing was written. Re-run without --dry-run to apply.');
      } else {
        console.log(`\nInserted ${totalInserted} row(s) across ${plans.length} table(s).`);
      }
    } catch (err) {
      if (!flags.dryRun) await target.query('ROLLBACK');
      throw err;
    }
  } finally {
    await source.end();
    await target.end();
  }
}

main().catch((err) => {
  console.error(err.expected ? `\nError: ${err.message}` : err);
  process.exit(1);
});
