import { pathToFileURL } from 'node:url';
import { validateHealthDocument } from './lib/deployment-health.mjs';

export function validateDeployment({ html, manifest, nationwide, health }, { maxDataAgeHours = Infinity, now = Date.now(), requireHealth = true } = {}) {
  if (!html.includes('şarj.ist')) throw new Error('Home page does not contain the expected application identity');
  if (manifest?.schemaVersion !== 1 || !Array.isArray(manifest.regions) || manifest.regions.length !== 81) throw new Error('Deployment manifest is invalid');
  if (!Number.isInteger(manifest.totalStations) || manifest.totalStations < 10_000) throw new Error('Deployment manifest contains a suspicious station count');
  if (nationwide?.schemaVersion !== 1 || nationwide?.meta?.isSample !== false || !Array.isArray(nationwide.stations)) throw new Error('Nationwide deployment bundle is invalid or contains sample data');
  if (nationwide.stations.length !== manifest.totalStations) throw new Error('Nationwide bundle count does not match the deployment manifest');
  if (nationwide.meta.refreshedAt !== manifest.meta?.refreshedAt) throw new Error('Nationwide refresh time does not match the manifest');
  if (!requireHealth) return { stationCount: manifest.totalStations, regionCount: manifest.regions.length, refreshedAt: nationwide.meta.refreshedAt };
  return validateHealthDocument(health, { manifest, maxDataAgeHours, now });
}

async function fetchChecked(url, type) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return type === 'json' ? response.json() : response.text();
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function fetchDeploymentSnapshot(target, { attempts = 6, initialDelayMs = 1_000, maxDataAgeHours = Infinity, requireHealth = false } = {}) {
  const base = new URL(target);
  if (base.protocol !== 'https:') throw new Error('Deployment smoke tests require an HTTPS URL');
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const requests = [
        fetchChecked(new URL('/', base), 'text'),
        fetchChecked(new URL('/data/manifest.json', base), 'json'),
        fetchChecked(new URL('/data/stations.json', base), 'json'),
      ];
      if (requireHealth) requests.push(fetchChecked(new URL('/health.json', base), 'json'));
      const [html, manifest, nationwide, health] = await Promise.all(requests);
      const result = validateDeployment({ html, manifest, nationwide, health }, { maxDataAgeHours, requireHealth });
      return { base, html, manifest, nationwide, health: result };
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      const delayMs = Math.min(initialDelayMs * (2 ** (attempt - 1)), 10_000);
      console.warn(`Deployment not ready (attempt ${attempt}/${attempts}): ${error.message}; retrying in ${delayMs}ms`);
      await wait(delayMs);
    }
  }

  throw lastError;
}

async function main() {
  const args = process.argv.slice(2);
  const maxAgeIndex = args.indexOf('--max-age-hours');
  const maxAgeValue = maxAgeIndex === -1 ? undefined : args[maxAgeIndex + 1];
  const target = args.find((argument) => !argument.startsWith('--') && argument !== maxAgeValue) ?? process.env.DEPLOYMENT_URL;
  const maxDataAgeHours = maxAgeIndex === -1 ? 48 : Number(args[maxAgeIndex + 1]);
  if (!target) throw new Error('Usage: node scripts/smoke-deployment.mjs https://deployment.example [--max-age-hours 48]');
  if (!Number.isFinite(maxDataAgeHours) || maxDataAgeHours <= 0) throw new Error('--max-age-hours must be a positive number');
  const { base, health } = await fetchDeploymentSnapshot(target, { maxDataAgeHours, requireHealth: true });
  console.log(JSON.stringify({ status: 'healthy', url: base.origin, ...health }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`Deployment smoke test failed: ${error.message}`);
    process.exitCode = 1;
  });
}
