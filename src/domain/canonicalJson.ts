/**
 * Canonical JSON (APP_DATA_CONTRACTS_V0.md §1.3): keys sorted by code point, no
 * insignificant whitespace, shortest round-trip numbers (JS's own number->string),
 * UTF-8. Used to compute Hash64 values (state digest, config hash) and, in Node only,
 * the datapack tool's content hash.
 */

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

function sortValue(value: unknown): Json {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.map(sortValue);
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const sortedKeys = Object.keys(obj).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const out: Record<string, Json> = {};
    for (const k of sortedKeys) {
      const v = obj[k];
      if (v === undefined) continue; // omitted, like JSON.stringify does
      out[k] = sortValue(v);
    }
    return out;
  }
  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
  throw new TypeError(`Value not representable in canonical JSON: ${typeof value}`);
}

/** Serializes `value` as canonical JSON: sorted keys, no whitespace. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}
