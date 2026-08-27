// Privacy-conscious website analytics.
//
// DEVOS does NOT ship a third-party analytics tracker. This module buffers
// high-level, non-sensitive website events (page views of public pages, CTA
// clicks, form submissions) and forwards them ONLY when an analytics
// endpoint is explicitly configured via VITE_ANALYTICS_ENDPOINT.
//
// Hard rules (enforced here):
//  - never send when consent is required-but-not-given (see consent.ts)
//  - no payloads containing source code, file contents, terminal output,
//    AI conversation content, tokens, passwords, or project data
//  - allowlisted event names only

import { hasAnalyticsConsent, isConsentRequired } from './consent';

export type WebsiteEvent =
  | 'page_view'
  | 'cta_click'
  | 'waitlist_submitted'
  | 'contact_submitted'
  | 'signin_navigate'
  | 'register_navigate';

const ALLOWED_EVENTS = new Set<WebsiteEvent>([
  'page_view',
  'cta_click',
  'waitlist_submitted',
  'contact_submitted',
  'signin_navigate',
  'register_navigate',
]);

const ENDPOINT = import.meta.env.VITE_ANALYTICS_ENDPOINT as string | undefined;

function enabled(): boolean {
  if (!ENDPOINT) return false;
  if (isConsentRequired() && !hasAnalyticsConsent()) return false;
  return true;
}

export function track(event: WebsiteEvent, props: Record<string, string | number | boolean> = {}): void {
  if (!ALLOWED_EVENTS.has(event)) return;
  if (!enabled()) return;
  // Browser-only APIs (window/navigator) must never execute during
  // build/SSR/test environments where they are undefined.
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
  const safeProps: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(props)) {
    // Only short scalar identifiers; never free-text user content.
    if (typeof v === 'string' && v.length > 120) continue;
    safeProps[k] = v;
  }
  const payload = JSON.stringify({
    event,
    path: window.location.pathname,
    props: safeProps,
    ts: new Date().toISOString(),
  });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT!, new Blob([payload], { type: 'application/json' }));
    } else {
      void fetch(ENDPOINT!, { method: 'POST', body: payload, headers: { 'Content-Type': 'application/json' }, keepalive: true });
    }
  } catch {
    // Analytics must never break the product.
  }
}

export const analyticsConfigured = Boolean(ENDPOINT);
