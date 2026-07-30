/**
 * Location normalization.
 *
 * Locations are aisle-bay: `A12-4`. Vista sometimes prefixes the facility
 * ("SARDIS-A12-4", "SRD_A12-4"), so the pattern is anchored to the END of the
 * string -- that strips any prefix without needing to enumerate facility tokens.
 *
 * Client-side twin of floor.normalize_location(text). Keep the two in step.
 */

const LOCATION = /([A-Z]{1,3}\d{1,3}-\d{1,3})$/;

/** Canonical `A12-4`, or null if the input does not end in a location. */
export function normalizeLocation(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const compact = raw.toUpperCase().replace(/\s+/g, '');
  return LOCATION.exec(compact)?.[1] ?? null;
}

/**
 * The aisle portion: `A12` from `A12-4`. This is the join key to
 * floor.locations, which maps an aisle to its UniFi camera.
 */
export function locationPrefix(location: string | null | undefined): string | null {
  const normalized = normalizeLocation(location);
  if (!normalized) return null;
  return normalized.split('-')[0] ?? null;
}

/** The bay portion: `4` from `A12-4`. */
export function locationBay(location: string | null | undefined): string | null {
  const normalized = normalizeLocation(location);
  if (!normalized) return null;
  return normalized.split('-')[1] ?? null;
}
