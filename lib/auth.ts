/**
 * Better Auth server instance — the identity core (docs/auth-plan.md §2–3).
 *
 * Owns signup/login/logout, password hashing, and DB-backed sessions on the
 * identity tables in src/db/schema.ts. Product-specific authorization
 * (roles, families, child profiles) lives in lib/dal.ts, not here.
 *
 * Requires BETTER_AUTH_SECRET (and BETTER_AUTH_URL in production) in the env.
 */
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { db } from '@/src/db';
import { user, session, account, verification } from '@/src/db/schema';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { user, session, account, verification },
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },

  user: {
    additionalFields: {
      // input: false — clients can never choose a role; every signup is a
      // guardian. Admins exist only via scripts/seed-admin.mjs.
      role: {
        type: 'string',
        defaultValue: 'guardian',
        input: false,
      },
    },
  },

  // DB sessions with sliding expiry: 30-day lifetime, refreshed at most once
  // a day. Revocation is immediate because every request reads the DB row.
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },

  // Lets server actions set the session cookie (must stay the last plugin).
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
