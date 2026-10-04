import type { APIRoute } from 'astro';
import { stations, districtGroups } from '../data/stations';

import { guidePages } from '../lib/station-guides.mjs';

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL('https://sarj.ist');
  const paths = ['/', '/sehir/', '/privacy/', '/licenses/', ...new Set(stations.map(({ citySlug }) => `/sehir/${citySlug}/`)), ...guidePages(districtGroups).map(({ path }) => path), ...stations.map(({ slug }) => `/istasyon/${slug}/`)];
  const urls = paths.map((path) => `<url><loc>${new URL(path, base).href}</loc></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, { headers: { 'Content-Type': 'application/xml' } });
};
