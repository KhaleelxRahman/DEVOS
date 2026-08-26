// Cookie/consent handling.
//
// DEVOS itself is cookie-free: the API uses Authorization bearer tokens
// stored in localStorage, so no cookies are set and no consent banner is
// legally required by default.
//
// A consent banner appears ONLY when an optional analytics endpoint is
// configured (VITE_ANALYTICS_ENDPOINT), because that is the only feature
// that could perform cross-session tracking. Consent is stored in
// localStorage and can be revoked from the footer/preferences.

const CONSENT_KEY = 'devos_consent';

export type ConsentChoice = 'accepted' | 'rejected' | null;

// Browser-only APIs (localStorage) must never execute during build/SSR/test
// environments where they are undefined or can throw (e.g. privacy mode).
function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function isConsentRequired(): boolean {
  return Boolean(import.meta.env.VITE_ANALYTICS_ENDPOINT);
}

export function getConsent(): ConsentChoice {
  const v = storage()?.getItem(CONSENT_KEY) ?? null;
  return v === 'accepted' || v === 'rejected' ? v : null;
}

export function setConsent(choice: Exclude<ConsentChoice, null>): void {
  storage()?.setItem(CONSENT_KEY, choice);
}

export function hasAnalyticsConsent(): boolean {
  return !isConsentRequired() || getConsent() === 'accepted';
}
