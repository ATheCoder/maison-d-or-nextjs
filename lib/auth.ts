/**
 * Better Auth server instance — the identity core (docs/auth-plan.md §2–3).
 *
 * Owns signup/login/logout, password hashing, and DB-backed sessions on the
 * identity tables in src/db/schema.ts. Product-specific authorization
 * (roles, families, child profiles) lives in lib/dal.ts, not here.
 *
 * Requires BETTER_AUTH_SECRET (and BETTER_AUTH_URL in production) in the env.
 */
import { randomUUID } from 'node:crypto';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { db } from '@/src/db';
import { user, session, account, verification, family } from '@/src/db/schema';

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
      // Set by the databaseHooks below at signup, re-pointed when an invite
      // is accepted. Never client-writable.
      familyId: {
        type: 'string',
        required: false,
        input: false,
      },
    },
  },

  databaseHooks: {
    user: {
      create: {
        // Guardian signup creates user + family in one step (auth-plan §6):
        // the family row is inserted first and its id lands on the user row
        // itself, so a guardian can never exist without a family.
        before: async (newUser) => {
          if ((newUser as { role?: string }).role === 'admin') return;
          const familyId = randomUUID();
          const firstName = newUser.name?.trim().split(/\s+/)[0] || 'New';
          await db.insert(family).values({ id: familyId, name: `${firstName}'s Family` });
          return { data: { ...newUser, familyId } };
        },
      },
    },
  },

  // DB sessions with sliding expiry: 30-day lifetime, refreshed at most once
  // a day. Revocation is immediate because every request reads the DB row.
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    additionalFields: {
      // Child mode (auth-plan §4). Written only by app/profiles/actions.ts
      // after PIN verification — never by the client (input: false).
      activeChildProfileId: {
        type: 'string',
        required: false,
        input: false,
      },
    },
  },

  // Lets server actions set the session cookie (must stay the last plugin).
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
