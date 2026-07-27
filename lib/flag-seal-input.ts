/**
 * Pure validation/normalisation for the flag-seal earn action
 * (docs/flag-seal-spec.md §5.1). Kept out of app/passport/actions.ts so the
 * decision logic is unit-testable without a DB or a session.
 */
import { countryByCode } from './countries';

export const FLAG_SOURCES = ['born_today', 'on_this_day', 'destination', 'good_news'] as const;
export type FlagSource = (typeof FLAG_SOURCES)[number];

export function isFlagSource(value: unknown): value is FlagSource {
  return typeof value === 'string' && (FLAG_SOURCES as readonly string[]).includes(value);
}

/** 'YYYY-MM-DD' and a day that actually exists on the calendar. */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  // Date normalises an overflowing day, so a value that survives the round
  // trip unchanged is a day that actually exists.
  return parsed.toISOString().slice(0, 10) === value;
}

export type EarnInput = {
  countryCode?: unknown;
  countryName?: unknown;
  source?: unknown;
  editionDate?: unknown;
};

export type NormalisedEarn =
  | {
      ok: true;
      code: string;           // uppercase ISO2, present in COUNTRIES
      canonicalName: string;  // from COUNTRIES — never the caller's string
      displayName: string;    // caller's label, canonical when absent
      source: FlagSource;
      editionDate: string;    // 'YYYY-MM-DD'
    }
  | { ok: false; reason: 'invalid_code' | 'invalid_source' | 'invalid_date' };

/**
 * Validate an earn request. Rejection carries a reason for logging, but the
 * action maps every rejection to `{ status: 'noop' }` — earns are
 * fire-and-forget and must never surface a failure to the child.
 */
export function normaliseEarnInput(input: EarnInput, today: string): NormalisedEarn {
  const rawCode = typeof input.countryCode === 'string' ? input.countryCode.trim().toUpperCase() : '';
  const country = /^[A-Z]{2}$/.test(rawCode) ? countryByCode(rawCode) : undefined;
  if (!country) return { ok: false, reason: 'invalid_code' };

  if (!isFlagSource(input.source)) return { ok: false, reason: 'invalid_source' };

  let editionDate = today;
  if (input.editionDate !== undefined && input.editionDate !== null && input.editionDate !== '') {
    if (!isIsoDate(input.editionDate)) return { ok: false, reason: 'invalid_date' };
    editionDate = input.editionDate;
  }

  const callerName = typeof input.countryName === 'string' ? input.countryName.trim() : '';
  return {
    ok: true,
    code: country.code,
    canonicalName: country.name,
    displayName: (callerName || country.name).slice(0, 120),
    source: input.source,
    editionDate,
  };
}
