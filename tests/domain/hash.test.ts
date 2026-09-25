import { describe, expect, it } from 'vitest';
import { canonicalHash64, fnv1a32Hex, fnv1a64Hex } from '../../src/domain/hash';
import { canonicalJson } from '../../src/domain/canonicalJson';

// Known-answer vectors published at http://www.isthe.com/chongo/tech/comp/fnv/,
// reproduced against this implementation (APP_BUILD_SEQUENCE_V0.md B1 exit criteria).
describe('fnv1a32Hex', () => {
  it('matches published FNV-1a 32 test vectors', () => {
    expect(fnv1a32Hex('')).toBe('811c9dc5');
    expect(fnv1a32Hex('a')).toBe('e40c292c');
    expect(fnv1a32Hex('foobar')).toBe('bf9cf968');
  });
});

describe('fnv1a64Hex', () => {
  it('matches published FNV-1a 64 test vectors', () => {
    expect(fnv1a64Hex('')).toBe('cbf29ce484222325');
    expect(fnv1a64Hex('a')).toBe('af63dc4c8601ec8c');
    expect(fnv1a64Hex('foobar')).toBe('85944171f73967e8');
  });

  it('is 16 lowercase hex characters (Hash64)', () => {
    expect(fnv1a64Hex('anything')).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe('canonicalJson', () => {
  it('sorts keys and drops undefined values', () => {
    expect(canonicalJson({ b: 1, a: 2, c: undefined })).toBe('{"a":2,"b":1}');
  });

  it('is stable regardless of input key order', () => {
    expect(canonicalJson({ z: 1, a: { y: 2, x: 3 } })).toBe(canonicalJson({ a: { x: 3, y: 2 }, z: 1 }));
  });

  it('sorts array contents in place without reordering the array itself', () => {
    expect(canonicalJson([{ b: 1, a: 2 }, 3])).toBe('[{"a":2,"b":1},3]');
  });
});

describe('canonicalHash64', () => {
  it('is deterministic for equal values regardless of key order', () => {
    const h1 = canonicalHash64({ a: 1, b: [1, 2, 3] });
    const h2 = canonicalHash64({ b: [1, 2, 3], a: 1 });
    expect(h1).toBe(h2);
  });

  it('changes when the value changes', () => {
    expect(canonicalHash64({ a: 1 })).not.toBe(canonicalHash64({ a: 2 }));
  });
});
