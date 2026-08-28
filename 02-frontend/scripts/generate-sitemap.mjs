import { writeFile } from 'node:fs/promises';

const siteUrl = (process.env.VITE_SITE_URL || 'http://localhost:4173').replace(/\/+$/, '');
const routes = ['/', '/about', '/contact', '/faq', '/waitlist', '/thank-you', '/privacy', '/terms'];
const urls = routes.map((route) => `  <url><loc>${siteUrl}${route}</loc></url>`).join('\n');
await writeFile(
  new URL('../public/sitemap.xml', import.meta.url),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
);
