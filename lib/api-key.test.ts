import { describe, expect, it } from 'vitest';
import { apiKeyPrefix, generateApiKey, hashApiKey } from './api-key';

describe('API key security helpers', () => {
  it('generates unique high-entropy keys with the public prefix', () => {
    const first = generateApiKey();
    const second = generateApiKey();
    expect(first).toMatch(/^upl_[A-Za-z0-9_-]{43}$/);
    expect(second).not.toBe(first);
  });

  it('stores a deterministic SHA-256 digest and a non-secret display prefix', () => {
    const key = 'upl_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG';
    expect(hashApiKey(key)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashApiKey(key)).toBe(hashApiKey(key));
    expect(apiKeyPrefix(key)).toBe('upl_abc…DEFG');
    expect(apiKeyPrefix(key)).not.toContain(key);
  });
});
