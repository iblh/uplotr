import { describe, expect, it } from 'vitest';
import {
  CONSENT_STORAGE_KEY,
  type ConsentStorage,
  hasGrantedConsent,
  readConsent,
  writeConsent,
} from './consent';

function memoryStorage(initial: Record<string, string> = {}): ConsentStorage {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
  };
}

function throwingStorage(): ConsentStorage {
  return {
    getItem: () => {
      throw new Error('storage blocked');
    },
    setItem: () => {
      throw new Error('storage blocked');
    },
  };
}

describe('analytics consent', () => {
  it('reports no decision until the visitor chooses', () => {
    expect(readConsent(memoryStorage())).toBeNull();
    expect(hasGrantedConsent(memoryStorage())).toBe(false);
  });

  it('round-trips an explicit choice', () => {
    const storage = memoryStorage();

    writeConsent('granted', storage);
    expect(readConsent(storage)).toBe('granted');
    expect(hasGrantedConsent(storage)).toBe(true);

    writeConsent('denied', storage);
    expect(readConsent(storage)).toBe('denied');
    expect(hasGrantedConsent(storage)).toBe(false);
  });

  it('ignores values that are not a known choice', () => {
    const storage = memoryStorage({ [CONSENT_STORAGE_KEY]: 'yes-please' });

    expect(readConsent(storage)).toBeNull();
    expect(hasGrantedConsent(storage)).toBe(false);
  });

  it('never reports consent when storage is unreadable', () => {
    expect(readConsent(throwingStorage())).toBeNull();
    expect(hasGrantedConsent(throwingStorage())).toBe(false);
  });

  it('never reports consent when there is no storage at all', () => {
    expect(readConsent(undefined)).toBeNull();
    expect(hasGrantedConsent(undefined)).toBe(false);
  });

  it('does not throw when persisting to unavailable storage', () => {
    expect(() => writeConsent('granted', throwingStorage())).not.toThrow();
    expect(() => writeConsent('granted', undefined)).not.toThrow();
  });
});
