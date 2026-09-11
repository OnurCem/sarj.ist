import { appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { validateHealthDocument } from './lib/deployment-health.mjs';

async function fetchChecked(url, type) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return type === 'json' ? response.json() : response.text();
}

export async function monitorProduction(target, { maxDataAgeHours = 48 } = {}) {
  const base = new URL(target);
  if (base.protocol !== 'https:') throw new Error('Production monitoring requires an HTTPS URL');

  const [html, manifest, health] = await Promise.all([
    fetchChecked(new URL('/', base), 'text'),
    fetchChecked(new URL('/data/manifest.json', base), 'json'),
    fetchChecked(new URL('/health.json', base), 'json'),
  ]);
  if (!html.includes('şarj.ist')) throw new Error('Home page does not contain the expected application identity');

  return { url: base.origin, ...validateHealthDocument(health, { manifest, maxDataAgeHours }) };
}

async function writeSummary(result, error) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;
  const lines = error
    ? ['## Production monitor failed', '', `- Error: ${error.message}`, '']
    : [
        '## Production monitor passed',
        '',
        `- URL: ${result.url}`,
        `- Stations: ${result.stationCount}`,
        `- Provinces: ${result.regionCount}`,
        `- EPDK data refreshed: ${result.refreshedAt}`,
        `- Deployment commit: ${result.commit}`,
        '',
      ];
  await appendFile(summaryPath, `${lines.join('\n')}\n`);
}

function parseArguments(args) {
  const maxAgeIndex = args.indexOf('--max-age-hours');
  const maxAgeValue = maxAgeIndex === -1 ? undefined : args[maxAgeIndex + 1];
  const target = args.find((argument) => !argument.startsWith('--') && argument !== maxAgeValue) ?? process.env.DEPLOYMENT_URL ?? 'https://sarj.ist';
  const maxDataAgeHours = maxAgeIndex === -1 ? 48 : Number(args[maxAgeIndex + 1]);
  if (!Number.isFinite(maxDataAgeHours) || maxDataAgeHours <= 0) throw new Error('--max-age-hours must be a positive number');
  return { target, maxDataAgeHours };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  try {
    const result = await monitorProduction(options.target, options);
    console.log(JSON.stringify({ status: 'healthy', ...result }, null, 2));
    await writeSummary(result);
  } catch (error) {
    await writeSummary(undefined, error);
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`Production monitor failed: ${error.message}`);
    process.exitCode = 1;
  });
}
