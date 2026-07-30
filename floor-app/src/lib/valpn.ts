/**
 * VALPN normalization.
 *
 * Canonical form is `VALPN-` followed by 5 or more digits.
 *
 * This is the client-side twin of floor.normalize_valpn(text) in
 * supabase/migrations/20260730000200_floor_core_tables.sql. It exists separately,
 * and duplicates the logic on purpose: a scan has to resolve against the
 * IndexedDB cache with zero network, so normalization cannot require a round
 * trip. The database keeps its own copy so nothing malformed can be written even
 * by a caller that skips this. If you change one, change both.
 */

const CANONICAL = /^VALPN-\d{5,}$/;

/**
 * Turn messy scanner or keyboard input into a canonical VALPN.
 *
 * Handles, because all of these show up in practice:
 *   "VALPN-12345678"    already canonical
 *   "valpn-12345678"    lowercase
 *   "12345678"          bare digits, keyed in by hand
 *   "VALPN- 1234567"    stray whitespace inside the token
 *   " VALPN-1234567 "   surrounding whitespace
 *   "VALPNVALPN-123456" doubled prefix from a double read
 *   "VALPN_1234567"     wrong separator off a damaged label
 *
 * Returns null for anything unreadable. Null is a real answer, not a failure:
 * an unparseable scan still gets logged to scan_events with hit = false, which is
 * how a bad lens or a run of damaged labels becomes visible.
 */
export function normalizeValpn(raw: string | null | undefined): string | null {
  if (!raw) return null;

  // Uppercase, then drop everything that is not a letter or digit. That absorbs
  // whitespace, hyphens, underscores and any punctuation a bad read introduces.
  let token = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');

  // Shed a leading VALPN prefix however many times it got stuck on.
  token = token.replace(/^(?:VALPN)+/, '');

  if (!/^\d{5,}$/.test(token)) return null;

  return `VALPN-${token}`;
}

/** True if the string is already in canonical form. */
export function isCanonicalValpn(value: string): boolean {
  return CANONICAL.test(value);
}

/**
 * Format a VALPN for display at arm's length: digits grouped in fours so someone
 * can read one off a screen and compare it to a label without losing their place.
 * Grouping is cosmetic only -- never store or compare this form.
 */
export function formatValpnForDisplay(valpn: string): string {
  const digits = valpn.replace(/^VALPN-/, '');
  const grouped = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  return `VALPN-${grouped}`;
}
