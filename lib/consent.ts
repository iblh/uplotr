/**
 * Visitor consent for analytics storage.
 *
 * Analytics must not run before a visitor opts in: GA4 writes `_ga` cookies as
 * soon as it is configured, which GDPR/ePrivacy treat as storage requiring
 * prior consent. Nothing here touches `window` at module scope so the module
 * stays safe to import from server components.
 */

export type ConsentChoice = 'granted' | 'denied';

/** Persisted under this key so a returning visitor is not asked again. */
export const CONSENT_STORAGE_KEY = 'uplotr.analytics-consent';

/** Broadcast on the window when the choice changes, so listeners can react. */
export const CONSENT_CHANGE_EVENT = 'uplotr:analytics-consent-change';

/** The subset of the Storage API this module needs. */
export interface ConsentStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function isConsentChoice(value: unknown): value is ConsentChoice {
  return value === 'granted' || value === 'denied';
}

/**
 * Returns the stored choice, or `null` when the visitor has not decided yet.
 *
 * Storage access throws in some privacy modes, so failures are treated as
 * "no decision recorded" rather than propagating: a broken read must never
 * be mistaken for consent.
 */
export function readConsent(storage: ConsentStorage | undefined = defaultStorage()): ConsentChoice | null {
  if (!storage) return null;

  try {
    const stored = storage.getItem(CONSENT_STORAGE_KEY);
    return isConsentChoice(stored) ? stored : null;
  } catch {
    return null;
  }
}

/** Persists the choice. Storage failures are non-fatal; the banner still hides. */
export function writeConsent(
  choice: ConsentChoice,
  storage: ConsentStorage | undefined = defaultStorage(),
): void {
  if (!storage) return;

  try {
    storage.setItem(CONSENT_STORAGE_KEY, choice);
  } catch {
    // A visitor who blocks storage simply gets asked again next visit.
  }
}

/** True only for an explicit opt-in; absent or unreadable consent is never granted. */
export function hasGrantedConsent(storage?: ConsentStorage): boolean {
  return readConsent(storage) === 'granted';
}

function defaultStorage(): ConsentStorage | undefined {
  if (typeof window === 'undefined') return undefined;

  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
