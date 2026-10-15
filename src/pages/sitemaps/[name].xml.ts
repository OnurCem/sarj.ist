import type { APIRoute, GetStaticPaths } from 'astro';
import { stations, districtGroups } from '../../data/stations';
import { SITEMAP_NAMES, sitemapPaths, urlsetXml } from '../../lib/sitemaps.mjs';

export const getStaticPaths: GetStaticPaths = () => SITEMAP_NAMES.map((name) => ({ params: { name } }));

export const GET: APIRoute = ({ params, site }) => new Response(urlsetXml(sitemapPaths(params.name, stations, districtGroups), site ?? new URL('https://sarj.ist')), { headers: { 'Content-Type': 'application/xml' } });
