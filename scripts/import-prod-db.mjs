/**
 * Replace the local database with a copy of production (Neon).
 *
 *   npm run import:prod-db                 # PRODUCTION_DATABASE_URL -> DATABASE_URL
 *   npm run import:prod-db -- --dry-run
 *   npm run import:prod-db -- --source <url> --target <url>
 *
 * This is a wipe-and-restore, not a merge: every non-system schema in the
 * target (`public` and drizzle's migrations schema) is dropped and rebuilt from
 * a fresh `pg_dump` of production. Local rows, local migrations and any admin
 * you seeded are gone afterwards — production's are what you get.
 *
 * For the opposite shape — topping one database up with rows the other has,
 * touching nothing that already exists — use scripts/sync-db.mjs instead.
 *
 * Options:
 *   --source <url>      production URL (default: $PRODUCTION_DATABASE_URL,
 *                       $NEON_DATABASE_URL, or $PROD_DATABASE_URL)
 *   --target <url>      local URL (default: $DATABASE_URL)
 *   --dry-run           connect, check versions, report sizes, write nothing
 *   --schema-only       structure without rows
 *   --data-only         rows into the schema already there — the local schema
 *                       is truncated, not dropped, and must already match
 *   --dump-file <path>  where to write the dump (default: a temp file)
 *   --keep-dump         don't delete the dump afterwards
 *   --from-dump <path>  restore an existing dump; production is not contacted
 *   --yes               skip the confirmation prompt (required when not a TTY)
 *   --allow-remote-target  permit a target that isn't on this machine
 *   --verbose           pass --verbose to pg_dump/pg_restore
 *
 * Safety rails, in the order they fire:
 *   1. source and target must differ;
 *   2. the target host must be local, unless --allow-remote-target — this
 *      script drops schemas, and a mistyped URL should not reach production;
 *   3. the source is opened read-only-in-spirit (only pg_dump touches it) and
 *      its server version must not be newer than the local pg_dump;
 *   4. you type the target database's name to confirm.
 *
 * Credentials never appear in the process list: the URLs are decomposed into
 * PG* environment variables for the child processes.
 */
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import pg from 'pg';

// Hosts we consider "this machine". A target anywhere else needs the flag.
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0', 'host.docker.internal']);

// libpq connection parameters that have an environment-variable spelling, so a
// URL's query string survives being taken apart. Anything else is reported and
// dropped — pg_dump would have ignored a Neon-proxy flag like `pgbouncer`
// anyway, but silently losing a parameter is worth a line of output.
const PARAM_ENV = {
  sslmode: 'PGSSLMODE',
  sslrootcert: 'PGSSLROOTCERT',
  sslcert: 'PGSSLCERT',
  sslkey: 'PGSSLKEY',
  channel_binding: 'PGCHANNELBINDING',
  connect_timeout: 'PGCONNECT_TIMEOUT',
  application_name: 'PGAPPNAME',
  options: 'PGOPTIONS',
};

/** An error the script anticipates — reported as a message, without a stack. */
function expected(message) {
  const err = new Error(message);
  err.expected = true;
  return err;
}

const quote = (id) => `"${id.replace(/"/g, '""')}"`;

// ── Arguments ────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const flags = {
    source: null, target: null, dumpFile: null, fromDump: null,
    dryRun: false, schemaOnly: false, dataOnly: false, keepDump: false,
    yes: false, allowRemoteTarget: false, verbose: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const eq = arg.indexOf('=');
    const name = eq === -1 ? arg : arg.slice(0, eq);
    const inline = eq === -1 ? null : arg.slice(eq + 1);
    const value = () => {
      if (inline !== null) return inline;
      if (i + 1 >= argv.length) throw expected(`${name} needs a value`);
      return argv[++i];
    };

    if (name === '--source') flags.source = value();
    else if (name === '--target') flags.target = value();
    else if (name === '--dump-file') flags.dumpFile = value();
    else if (name === '--from-dump') flags.fromDump = value();
    else if (name === '--dry-run') flags.dryRun = true;
    else if (name === '--schema-only') flags.schemaOnly = true;
    else if (name === '--data-only') flags.dataOnly = true;
    else if (name === '--keep-dump') flags.keepDump = true;
    else if (name === '--yes' || name === '-y') flags.yes = true;
    else if (name === '--allow-remote-target') flags.allowRemoteTarget = true;
    else if (name === '--verbose') flags.verbose = true;
    else throw expected(`Unknown option ${arg}`);
  }
  if (flags.schemaOnly && flags.dataOnly) throw expected('--schema-only and --data-only are opposites');
  return flags;
}

// ── Connection strings ───────────────────────────────────────────────────────

/**
 * A URL split into the PG* environment a child process needs, plus the pieces
 * this script prints and compares. Keeping the password out of argv is the
 * point: `ps` on a shared machine should not show production's credentials.
 */
function connection(url, label) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw expected(`${label} is not a valid connection URL`);
  }
  if (!/^postgres(ql)?:$/.test(parsed.protocol)) {
    throw expected(`${label} must be a postgres:// or postgresql:// URL, got ${parsed.protocol}//`);
  }

  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (!database) throw expected(`${label} has no database name`);

  const env = { PGHOST: parsed.hostname, PGDATABASE: database };
  if (parsed.port) env.PGPORT = parsed.port;
  if (parsed.username) env.PGUSER = decodeURIComponent(parsed.username);
  if (parsed.password) env.PGPASSWORD = decodeURIComponent(parsed.password);

  const dropped = [];
  for (const [key, val] of parsed.searchParams) {
    if (PARAM_ENV[key]) env[PARAM_ENV[key]] = val;
    else dropped.push(key);
  }
  // Neon refuses a plaintext connection; say so up front rather than letting
  // pg_dump fail with a bare "server does not support SSL".
  if (!env.PGSSLMODE && /\.neon\.tech$/i.test(parsed.hostname)) env.PGSSLMODE = 'require';

  return {
    url,
    env,
    // Handed to node-postgres field by field rather than as the URL. Letting
    // it re-parse the string earns a deprecation warning about how it reads
    // sslmode, and this way the inspecting client and the pg_* children are
    // configured from one decomposition instead of two.
    client: {
      host: parsed.hostname,
      port: Number(parsed.port) || 5432,
      user: env.PGUSER,
      password: env.PGPASSWORD,
      database,
      // node-postgres has no 'prefer'/'require'-without-verification mode, and
      // already verifies for all of them today — Neon's certificates are from
      // a public CA, so this is what was happening anyway, minus the warning.
      ssl: env.PGSSLMODE && env.PGSSLMODE !== 'disable' ? { rejectUnauthorized: true } : false,
    },
    host: parsed.hostname,
    port: parsed.port || '5432',
    database,
    user: env.PGUSER ?? '(default)',
    dropped,
    describe: `${env.PGUSER ?? ''}@${parsed.hostname}:${parsed.port || '5432'}/${database}`,
  };
}

const isLocal = (conn) => LOCAL_HOSTS.has(conn.host) || conn.host.endsWith('.localhost');

// ── Child processes ──────────────────────────────────────────────────────────

/**
 * Run a pg_* binary with the connection in the environment. stderr is shown as
 * it arrives and kept, so a failure can quote what the tool actually said.
 */
function run(command, args, env, { capture = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: { ...process.env, ...env },
      stdio: ['ignore', capture ? 'pipe' : 'inherit', 'pipe'],
    });

    let out = '';
    let err = '';
    if (capture) child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => {
      err += d;
      if (!capture) process.stderr.write(d);
    });

    child.on('error', (e) => reject(
      e.code === 'ENOENT'
        ? expected(`${command} is not installed (Arch: pacman -S postgresql-libs, Debian: apt install postgresql-client)`)
        : e,
    ));
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout: out, stderr: err });
      else reject(expected(`${command} exited with code ${code}${err.trim() ? `:\n${err.trim().split('\n').slice(-8).join('\n')}` : ''}`));
    });
  });
}

/** The major version of the local pg_dump, e.g. 18. */
async function pgDumpMajor() {
  const { stdout } = await run('pg_dump', ['--version'], {}, { capture: true });
  const match = stdout.match(/(\d+)(?:\.\d+)?/);
  if (!match) throw expected(`could not read pg_dump's version from "${stdout.trim()}"`);
  return Number(match[1]);
}

/**
 * Schema names the dump creates itself. `public` is the interesting one: some
 * server versions dump a CREATE SCHEMA for it and some assume it exists, and
 * we have to know which before deciding whether to recreate it after the drop.
 */
async function schemasInDump(dumpFile) {
  const { stdout } = await run('pg_restore', ['-l', dumpFile], {}, { capture: true });
  const names = new Set();
  for (const line of stdout.split('\n')) {
    const match = line.match(/^\d+;\s+\S+\s+\S+\s+SCHEMA\s+-\s+(\S+)/);
    if (match) names.add(match[1]);
  }
  return names;
}

// ── Inspecting a database ────────────────────────────────────────────────────

async function withClient(conn, fn) {
  const client = new pg.Client(conn.client);
  try {
    await client.connect();
  } catch (err) {
    throw expected(`cannot connect to ${conn.describe} — ${err.message}`);
  }
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

const userSchemas = async (client) => (await client.query(
  `SELECT nspname FROM pg_namespace
    WHERE nspname NOT LIKE 'pg\\_%' AND nspname <> 'information_schema'
    ORDER BY nspname`,
)).rows.map((r) => r.nspname);

/** Exact row counts per table, keyed "schema.table". */
async function rowCounts(client) {
  const { rows: tables } = await client.query(
    `SELECT table_schema AS s, table_name AS t
       FROM information_schema.tables
      WHERE table_type = 'BASE TABLE'
        AND table_schema NOT LIKE 'pg\\_%' AND table_schema <> 'information_schema'
      ORDER BY table_schema, table_name`,
  );
  if (!tables.length) return new Map();

  const counts = new Map();
  // One statement rather than one per table: 18 tables is 18 round-trips to
  // Neon otherwise, and this runs twice.
  const sql = tables
    .map(({ s, t }) => `SELECT '${s}.${t}' AS name, count(*)::bigint AS n FROM ${quote(s)}.${quote(t)}`)
    .join(' UNION ALL ');
  const { rows } = await client.query(sql);
  for (const r of rows) counts.set(r.name, Number(r.n));
  return counts;
}

async function serverInfo(client) {
  const { rows } = await client.query(
    `SELECT current_setting('server_version') AS version,
            current_setting('server_version_num')::int AS num,
            pg_size_pretty(pg_database_size(current_database())) AS size`,
  );
  return rows[0];
}

// ── Steps ────────────────────────────────────────────────────────────────────

async function confirm(target, mode) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(
      `\nThis ${mode} everything in ${target.describe}.\nType the database name (${target.database}) to continue: `,
    );
    if (answer.trim() !== target.database) throw expected('Cancelled.');
  } finally {
    rl.close();
  }
}

/** Drop every user schema, then recreate the ones the dump won't create itself. */
async function resetSchemas(client, dumpCreates) {
  const schemas = await userSchemas(client);
  for (const schema of schemas) await client.query(`DROP SCHEMA ${quote(schema)} CASCADE`);
  console.log(`  dropped schema(s): ${schemas.join(', ') || '(none)'}`);

  // A dump taken from a server that omits CREATE SCHEMA public would otherwise
  // restore into nothing; one that includes it would collide with ours.
  const recreate = schemas.filter((s) => !dumpCreates.has(s) && s === 'public');
  for (const schema of recreate) await client.query(`CREATE SCHEMA ${quote(schema)}`);
  if (recreate.length) console.log(`  recreated (not in the dump): ${recreate.join(', ')}`);
}

/** For --data-only: empty every table instead, since the schema has to stay. */
async function truncateTables(client) {
  const { rows } = await client.query(
    `SELECT table_schema AS s, table_name AS t
       FROM information_schema.tables
      WHERE table_type = 'BASE TABLE'
        AND table_schema NOT LIKE 'pg\\_%' AND table_schema <> 'information_schema'`,
  );
  if (!rows.length) throw expected('--data-only needs an existing schema in the target; run `npm run db:migrate` first');
  const list = rows.map(({ s, t }) => `${quote(s)}.${quote(t)}`).join(', ');
  // One statement so foreign keys never see a half-empty database, RESTART
  // IDENTITY so the restored serial ids and the sequences agree.
  await client.query(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
  console.log(`  truncated ${rows.length} table(s)`);
}

/**
 * What landed, table by table. With production's counts to hand every row is
 * also an assertion — a table that came up short is the failure mode worth
 * catching, and pg_restore will not have said a word about it.
 */
function reportCounts(sourceCounts, targetCounts, compare) {
  const names = [...new Set([...sourceCounts.keys(), ...targetCounts.keys()])].sort();
  const width = Math.max(...names.map((n) => n.length), 10);
  let mismatched = 0;
  for (const name of names) {
    const from = sourceCounts.get(name);
    const to = targetCounts.get(name);
    const ok = !compare || from === to;
    if (!ok) mismatched++;
    console.log(`  ${name.padEnd(width)}  ${String(to ?? '—').padStart(7)}${ok ? '' : `   ! production has ${from ?? '—'}`}`);
  }
  return mismatched;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const flags = parseArgs(process.argv.slice(2));

  const targetUrl = flags.target ?? process.env.DATABASE_URL;
  if (!targetUrl) throw expected('No target. Set DATABASE_URL (run via `npm run import:prod-db`) or pass --target <url>.');
  const target = connection(targetUrl, 'The target URL');

  const restoreOnly = Boolean(flags.fromDump);
  let source = null;
  if (!restoreOnly) {
    const sourceUrl = flags.source
      ?? process.env.PRODUCTION_DATABASE_URL ?? process.env.NEON_DATABASE_URL ?? process.env.PROD_DATABASE_URL;
    if (!sourceUrl) {
      throw expected(
        'No production URL. Put PRODUCTION_DATABASE_URL in .env.local (Neon dashboard -> Connection string,\n'
        + '  the direct endpoint, not the -pooler one), or pass --source <url>.',
      );
    }
    source = connection(sourceUrl, 'The source URL');
    if (source.url === target.url) throw expected('Source and target are the same database — refusing to run.');
  }

  if (!isLocal(target) && !flags.allowRemoteTarget) {
    throw expected(
      `The target ${target.describe} is not on this machine, and this script drops schemas.\n`
      + '  Pass --allow-remote-target if you really mean it.',
    );
  }
  for (const conn of [source, target]) {
    if (conn?.dropped.length) console.warn(`  ! ignoring unsupported URL parameter(s) on ${conn.host}: ${conn.dropped.join(', ')}`);
  }
  if (source && /-pooler\./i.test(source.host)) {
    console.warn(`  ! ${source.host} is Neon's pooled endpoint; dumps are more reliable from the direct one (drop "-pooler" from the host)`);
  }

  // ── Look before touching anything ──
  const dumpMajor = await pgDumpMajor();
  const targetInfo = await withClient(target, serverInfo);
  console.log(`\nTarget      ${target.describe}  (PostgreSQL ${targetInfo.version}, ${targetInfo.size})`);

  let sourceCounts = new Map();
  if (source) {
    const info = await withClient(source, async (client) => {
      const i = await serverInfo(client);
      sourceCounts = await rowCounts(client);
      return i;
    });
    console.log(`Source      ${source.describe}  (PostgreSQL ${info.version}, ${info.size})`);

    const sourceMajor = Math.floor(info.num / 10000);
    if (sourceMajor > dumpMajor) {
      throw expected(
        `production runs PostgreSQL ${sourceMajor} but the local pg_dump is ${dumpMajor}; `
        + 'a dump has to be taken by a pg_dump at least as new as the server. Upgrade the postgresql client package.',
      );
    }
    const rows = [...sourceCounts.values()].reduce((a, b) => a + b, 0);
    console.log(`            ${sourceCounts.size} table(s), ${rows.toLocaleString('en-US')} row(s)`);
  } else {
    console.log(`Source      ${flags.fromDump} (existing dump)`);
  }

  const mode = flags.dataOnly ? 'replaces the data in' : flags.schemaOnly ? 'replaces the schema of' : 'replaces';
  if (flags.dryRun) {
    console.log(`\nDry run — nothing was written. Without --dry-run this ${mode} ${target.describe}.`);
    return;
  }
  if (!flags.yes) {
    if (!process.stdin.isTTY) throw expected('Not a terminal, so there is nobody to confirm with — pass --yes.');
    await confirm(target, mode);
  }

  // ── Dump ──
  let dumpFile = flags.fromDump;
  let tempDir = null;
  if (!restoreOnly) {
    if (flags.dumpFile) {
      dumpFile = path.resolve(flags.dumpFile);
    } else {
      tempDir = await mkdtemp(path.join(tmpdir(), 'maison-dor-prod-'));
      dumpFile = path.join(tempDir, 'production.dump');
    }

    console.log(`\nDumping production -> ${dumpFile}`);
    await run('pg_dump', [
      '--format=custom',
      // Production's roles and grants do not exist locally, and Neon's
      // neon_superuser certainly does not; restore everything as whoever we
      // connect as instead.
      '--no-owner', '--no-privileges', '--no-tablespaces',
      ...(flags.schemaOnly ? ['--schema-only'] : []),
      ...(flags.dataOnly ? ['--data-only'] : []),
      ...(flags.verbose ? ['--verbose'] : []),
      '--file', dumpFile,
    ], source.env);
    const { size } = await stat(dumpFile);
    console.log(`  ${(size / 1024 / 1024).toFixed(1)} MiB written`);
  }

  try {
    // ── Clear the target ──
    console.log('\nClearing the local database');
    const dumpCreates = flags.dataOnly ? new Set() : await schemasInDump(dumpFile);
    await withClient(target, (client) => (flags.dataOnly ? truncateTables(client) : resetSchemas(client, dumpCreates)));

    // ── Restore ──
    console.log('\nRestoring');
    await run('pg_restore', [
      '--dbname', target.database,
      '--no-owner', '--no-privileges',
      // The schemas were just dropped, so a failure here leaves an empty
      // database either way; --exit-on-error at least stops at the first real
      // problem instead of burying it under a hundred cascading ones.
      '--exit-on-error',
      ...(flags.dataOnly ? ['--data-only', '--disable-triggers'] : []),
      ...(flags.verbose ? ['--verbose'] : []),
      dumpFile,
    ], target.env);

    // The restored tables have no statistics until something looks at them,
    // and a planner working from nothing makes local queries behave unlike
    // production's for no reason.
    await withClient(target, (client) => client.query('ANALYZE'));

    // ── Verify ──
    const targetCounts = await withClient(target, rowCounts);
    let mismatched = 0;
    if (!flags.schemaOnly) {
      console.log('\nRows now in the local database:');
      mismatched = reportCounts(sourceCounts, targetCounts, !restoreOnly);
    }

    if (flags.schemaOnly) {
      console.log(`\nDone — ${targetCounts.size} table(s), no rows. \`npm run seed:admin\` to get back in.`);
    } else if (restoreOnly) {
      console.log(`\nDone — ${targetCounts.size} table(s) restored into ${target.describe} from ${flags.fromDump}.`);
    } else if (mismatched) {
      console.log(`\nDone, but ${mismatched} table(s) differ from production — see the marked rows above.`);
    } else {
      console.log(`\nDone — ${target.describe} now matches production.`);
    }
    if (!flags.schemaOnly) {
      console.log('Sign in with a production account — whatever `seed:admin` created locally went with the old rows.');
    }
  } finally {
    if (tempDir && !flags.keepDump) await rm(tempDir, { recursive: true, force: true });
    else if (dumpFile && !restoreOnly) console.log(`Dump kept at ${dumpFile}`);
  }
}

main().catch((err) => {
  console.error(err.expected ? `\nError: ${err.message}` : err);
  process.exit(1);
});
