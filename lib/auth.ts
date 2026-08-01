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
import { sendEmail, brandedEmail } from '@/lib/email';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { user, session, account, verification },
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,

    /**
     * Password reset (auth-plan §9.4). Better Auth builds `url` as
     * `<baseURL>/reset-password/<token>?callbackURL=<redirectTo>`; opening it
     * validates the token and forwards to our /reset-password page with the
     * token in the query. So the email carries this URL verbatim — never a
     * hand-built one — and the client must pass `redirectTo`, since the
     * callback refuses an empty one.
     *
     * A guardian is the only key to the family's whole history, so this path
     * has to exist; sendEmail never throws, so a mail outage degrades to a
     * logged failure rather than a 500 on the form.
     */
    sendResetPassword: async ({ user: recipient, url }) => {
      const firstName = recipient.name?.trim().split(/\s+/)[0];
      await sendEmail({
        to: recipient.email,
        subject: "Reset your Maison d'Ore password",
        ...brandedEmail({
          heading: 'Set a new password',
          body: [
            `${firstName ? `${firstName}, s` : 'S'}omeone asked to reset the password for this account.`,
            'Choose a new one and your family, your readers and every treasure they have saved are exactly where you left them.',
          ],
          action: { label: 'Choose a new password', url },
          footnote: 'This link works once and expires in an hour. If you did not ask for it, you can safely ignore this message — nothing has changed.',
        }),
      });
    },
  },

  /**
   * Email verification is a nudge, not a gate: `requireEmailVerification` stays
   * unset on purpose, so an unverified guardian can still sign in and read with
   * their child. /family shows a dismissable note instead (auth-plan §9.4).
   */
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user: recipient, url }) => {
      await sendEmail({
        to: recipient.email,
        subject: "Confirm your email — Maison d'Ore",
        ...brandedEmail({
          heading: 'Welcome to the house',
          body: [
            'Confirming your address is what lets us send you a way back in if you ever forget your password.',
            'It takes one click, and nothing in the app is waiting on it.',
          ],
          action: { label: 'Confirm my email', url },
          footnote: 'If you did not create a Maison d\'Ore account, simply ignore this message.',
        }),
      });
    },
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
