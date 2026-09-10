import { pathToFileURL } from 'node:url';

export function validateDeployment({ html, manifest, nationwide }) {
  if (!html.includes('şarj.ist')) throw new Error('Home page does not contain the expected application identity');
  if (manifest?.schemaVersion !== 1 || !Array.isArray(manifest.regions) || manifest.regions.length !== 81) throw new Error('Deployment manifest is invalid');
  if (!Number.isInteger(manifest.totalStations) || manifest.totalStations < 10_000) throw new Error('Deployment manifest contains a suspicious station count');
  if (nationwide?.schemaVersion !== 1 || nationwide?.meta?.isSample !== false || !Array.isArray(nationwide.stations)) throw new Error('Nationwide deployment bundle is invalid or contains sample data');
  if (nationwide.stations.length !== manifest.totalStations) throw new Error('Nationwide bundle count does not match the deployment manifest');
  return { stationCount: manifest.totalStations, regionCount: manifest.regions.length, refreshedAt: nationwide.meta.refreshedAt };
}

async function fetchChecked(url, type) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return type === 'json' ? response.json() : response.text();
}

async function main() {
  const target = process.argv[2] ?? process.env.DEPLOYMENT_URL;
  if (!target) throw new Error('Usage: node scripts/smoke-deployment.mjs https://deployment.example');
  const base = new URL(target);
  if (base.protocol !== 'https:') throw new Error('Deployment smoke tests require an HTTPS URL');
  const [html, manifest, nationwide] = await Promise.all([
    fetchChecked(new URL('/', base), 'text'),
    fetchChecked(new URL('/data/manifest.json', base), 'json'),
    fetchChecked(new URL('/data/stations.json', base), 'json'),
  ]);
  console.log(JSON.stringify({ status: 'healthy', url: base.origin, ...validateDeployment({ html, manifest, nationwide }) }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`Deployment smoke test failed: ${error.message}`);
    process.exitCode = 1;
  });
}
