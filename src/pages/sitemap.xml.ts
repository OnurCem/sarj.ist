import type { APIRoute } from 'astro';
import { sitemapIndexXml } from '../lib/sitemaps.mjs';

export const GET: APIRoute = ({ site }) => new Response(sitemapIndexXml(site ?? new URL('https://sarj.ist')), { headers: { 'Content-Type': 'application/xml' } });
