import type { APIRoute } from 'astro';
import { dataset, stations } from '../data/stations';
import { buildHealthDocument } from '../../scripts/lib/deployment-health.mjs';

export const prerender = true;

export const GET: APIRoute = () => {
  const health = buildHealthDocument({
    meta: dataset,
    stations,
    commit: process.env.GITHUB_SHA ?? 'local',
  });

  return new Response(JSON.stringify(health, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
