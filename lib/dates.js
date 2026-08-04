/**
 * Formatting for the remarkable_person date columns. birth_date is a real
 * DATE (always "1879-03-14"); death_date is ISO text at known precision:
 * "1955-04-18" when the full date is known, "1955" when only the year is.
 * Null/empty means unknown (or, for death_date, living).
 */

/**
 * "1879-03-14" -> "March 14, 1879"; "1879" -> "1879"; null -> ''.
 * @param {string | null | undefined} partialIso
 */
export function formatDate(partialIso) {
  if (!partialIso) return '';
  const [y, m, d] = String(partialIso).split('-');
  if (!m) return y;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d ?? 1)));
  return date.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    ...(d ? { day: 'numeric' } : {}),
  });
}

/**
 * The year of a partial-ISO date: "1955-04-18" or "1955" -> "1955".
 * @param {string | null | undefined} partialIso
 */
export function formatYear(partialIso) {
  return partialIso ? String(partialIso).slice(0, 4) : '';
}
