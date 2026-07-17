/**
 * Seed (or update) the admin account. There is no self-serve admin signup —
 * this script is the only way an admin comes to exist (docs/auth-plan.md §5).
 *
 *   node --env-file=.env --env-file-if-exists=.env.local scripts/seed-admin.mjs --email admin@example.com --password 'secret'
 *
 * Also reads ADMIN_EMAIL / ADMIN_PASSWORD from the environment when the
 * flags are omitted. Re-running updates the password and keeps the role.
 * The password hash uses better-auth's own scrypt (better-auth/crypto), so
 * the seeded account logs in through the normal /login flow.
 */
import { hashPassword } from 'better-auth/crypto';
import { randomBytes } from 'node:crypto';
import pg from 'pg';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] : undefined;
};

const email = (flag('email') || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = flag('password') || process.env.ADMIN_PASSWORD;
const name = flag('name') || process.env.ADMIN_NAME || 'Admin';

if (!email || !password) {
  console.error('Usage: node --env-file=.env --env-file-if-exists=.env.local scripts/seed-admin.mjs --email <email> --password <password> [--name <name>]');
  process.exit(1);
}
if (password.length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Run with --env-file=.env --env-file-if-exists=.env.local');
  process.exit(1);
}

const newId = () => randomBytes(16).toString('hex');

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const hash = await hashPassword(password);
    await client.query('BEGIN');

    const existing = await client.query('select id, role from "user" where email = $1', [email]);
    let userId;
    if (existing.rows[0]) {
      userId = existing.rows[0].id;
      await client.query(
        `update "user" set role = 'admin', name = $2, email_verified = true, updated_at = now() where id = $1`,
        [userId, name],
      );
      console.log(`Updated existing user ${email} -> admin${existing.rows[0].role !== 'admin' ? ` (was ${existing.rows[0].role})` : ''}.`);
    } else {
      userId = newId();
      await client.query(
        `insert into "user" (id, name, email, email_verified, role) values ($1, $2, $3, true, 'admin')`,
        [userId, name, email],
      );
      console.log(`Created admin user ${email}.`);
    }

    // Better Auth stores email/password credentials as an account row with
    // providerId 'credential' and accountId = user id.
    const account = await client.query(
      `select id from account where user_id = $1 and provider_id = 'credential'`,
      [userId],
    );
    if (account.rows[0]) {
      await client.query(
        `update account set password = $2, updated_at = now() where id = $1`,
        [account.rows[0].id, hash],
      );
      console.log('Updated credential password.');
    } else {
      await client.query(
        `insert into account (id, account_id, provider_id, user_id, password) values ($1, $2, 'credential', $2, $3)`,
        [newId(), userId, hash],
      );
      console.log('Created credential account.');
    }

    await client.query('COMMIT');
    console.log('Done. The admin can log in at /login.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
