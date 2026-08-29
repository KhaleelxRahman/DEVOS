import { useEffect } from 'react';

const SITE = 'DEVOS v1.0.0';
const SITE_URL = 'https://devos-ebon.vercel.app';
const OG_IMAGE = `${SITE_URL}/favicon.svg`;

export interface SeoOptions {
  title: string;
  description?: string;
  canonicalPath?: string;
  noindex?: boolean;
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/** Sets a unique document title + meta description/OG/Twitter/canonical per page. */
export function useSeo({ title, description, canonicalPath, noindex }: SeoOptions) {
  useEffect(() => {
    const fullTitle = title.includes(SITE) ? title : `${SITE} — ${title}`;
    const path = canonicalPath || window.location.pathname;
    document.title = fullTitle;
    upsertMeta('name', 'description', description || '');
    upsertMeta('property', 'og:description', description || '');
    upsertMeta('name', 'twitter:description', description || '');
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('property', 'og:url', `${SITE_URL}${path}`);
    upsertMeta('property', 'og:image', OG_IMAGE);
    upsertMeta('name', 'twitter:image', OG_IMAGE);
    upsertMeta('name', 'robots', noindex ? 'noindex,nofollow' : 'index,follow');
    upsertCanonical(`${SITE_URL}${path}`);
  }, [title, description, canonicalPath, noindex]);
}
