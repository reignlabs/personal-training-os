/**
 * FNV-1a hashing (32-bit and 64-bit), and the Hash64 digest used throughout the
 * contracts (APP_DATA_CONTRACTS_V0.md §1.2 Hash64: 16 lowercase hex chars, FNV-1a 64
 * over canonical JSON). Synchronous, shared with the seed code (ENGINE §21 ECR-02).
 */

import { canonicalJson } from './canonicalJson';

const FNV32_OFFSET_BASIS = 0x811c9dc5;
const FNV32_PRIME = 0x01000193;

const FNV64_OFFSET_BASIS = 0xcbf29ce484222325n;
const FNV64_PRIME = 0x100000001b3n;
const MASK64 = 0xffffffffffffffffn;

/** FNV-1a over a UTF-8 string, returning an unsigned 32-bit integer. */
export function fnv1a32(input: string): number {
  let hash = FNV32_OFFSET_BASIS;
  const bytes = new TextEncoder().encode(input);
  for (const byte of bytes) {
    hash ^= byte;
    // 32-bit unsigned multiply by the FNV prime, kept within uint32 via >>> 0.
    hash = Math.imul(hash, FNV32_PRIME) >>> 0;
  }
  return hash >>> 0;
}

/** FNV-1a 32, as 8 lowercase hex digits. */
export function fnv1a32Hex(input: string): string {
  return fnv1a32(input).toString(16).padStart(8, '0');
}

/** FNV-1a over a UTF-8 string, returning an unsigned 64-bit BigInt. */
export function fnv1a64(input: string): bigint {
  let hash = FNV64_OFFSET_BASIS;
  const bytes = new TextEncoder().encode(input);
  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash = (hash * FNV64_PRIME) & MASK64;
  }
  return hash;
}

/** FNV-1a 64, as 16 lowercase hex digits — the contracts' `Hash64` type. */
export function fnv1a64Hex(input: string): string {
  return fnv1a64(input).toString(16).padStart(16, '0');
}

/** Hash64 of the canonical JSON of `value` (state digest, config hash, order hash). */
export function canonicalHash64(value: unknown): string {
  return fnv1a64Hex(canonicalJson(value));
}
