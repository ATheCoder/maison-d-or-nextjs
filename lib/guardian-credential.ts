/**
 * Verify a guardian's grown-up-gate credential: their 4-digit guardian PIN
 * when one is set, or their account password (auth-plan §4). Server-only —
 * hashes never leave this module.
 */
import 'server-only';
import { and, eq } from 'drizzle-orm';
import { verifyPassword } from 'better-auth/crypto';
import { db } from '@/src/db';
import { account, user } from '@/src/db/schema';

export async function verifyGuardianCredential(userId: string, credential: string): Promise<boolean> {
  if (typeof credential !== 'string' || !credential) return false;

  // 4 digits → guardian PIN (passwords are 8+ chars, so no overlap).
  if (/^\d{4}$/.test(credential)) {
    const rows = await db.select({ pinHash: user.pinHash }).from(user).where(eq(user.id, userId)).limit(1);
    const pinHash = rows[0]?.pinHash;
    if (!pinHash) return false;
    return verifyPassword({ hash: pinHash, password: credential });
  }

  const rows = await db
    .select({ password: account.password })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, 'credential')))
    .limit(1);
  const hash = rows[0]?.password;
  if (!hash) return false;
  return verifyPassword({ hash, password: credential });
}
