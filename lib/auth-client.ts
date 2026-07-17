/**
 * Better Auth client for client components (login/signup forms, sign-out).
 * The inferAdditionalFields plugin types the extra `role` field on user.
 */
import { createAuthClient } from 'better-auth/react';
import { inferAdditionalFields } from 'better-auth/client/plugins';
import type { auth } from '@/lib/auth';

export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>()],
});
