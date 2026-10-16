import { guidePages } from './station-guides.mjs';
import { buildOperatorGroups, operatorPaths } from './operator-guides.mjs';

// Separate sitemaps let Search Console report indexing per page type.
export const SITEMAP_NAMES = ['guides', 'operators', 'stations-public', 'stations-private'];

export function sitemapPaths(name, stations, districtGroups) {
  if (name === 'guides') return ['/', '/sehir/', '/privacy/', '/licenses/', ...new Set(stations.map(({ citySlug }) => `/sehir/${citySlug}/`)), ...guidePages(districtGroups).map(({ path }) => path)];
  if (name === 'operators') return operatorPaths(buildOperatorGroups(stations));
  const access = { 'stations-public': 'Halka açık', 'stations-private': 'Özel erişim' }[name];
  if (!access) throw new Error(`Unknown sitemap: ${name}`);
  return stations.filter((station) => station.access === access).map(({ slug }) => `/istasyon/${slug}/`);
}

export const urlsetXml = (paths, base) => `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<url><loc>${new URL(path, base).href}</loc></url>`).join('')}</urlset>`;

export const sitemapIndexXml = (base) => `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${SITEMAP_NAMES.map((name) => `<sitemap><loc>${new URL(`/sitemaps/${name}.xml`, base).href}</loc></sitemap>`).join('')}</sitemapindex>`;
