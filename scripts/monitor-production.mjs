import { appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { validateHealthDocument } from './lib/deployment-health.mjs';

async function fetchChecked(url, type) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return type === 'json' ? response.json() : response.text();
}

export async function checkCanonicalRedirects(target, request = fetch) {
  const base = new URL(target);
  // workers.dev remains a standalone deployment smoke-test target.
  if (base.hostname !== 'sarj.ist') return { checked: false };
  const paths = ['/', '/sehir/istanbul/?test=1'];
  for (const origin of ['http://sarj.ist', 'http://www.sarj.ist', 'https://www.sarj.ist']) {
    for (const path of paths) for (const method of ['GET', 'HEAD']) {
      const url = new URL(path, origin);
      const response = await request(url, { method, redirect: 'manual', signal: AbortSignal.timeout(30_000) });
      const location = response.headers.get('location');
      await response.body?.cancel();
      if (![301, 308].includes(response.status) || location !== new URL(path, base).href) {
        throw new Error(`${method} ${url} must permanently redirect directly to ${new URL(path, base)}; got ${response.status} ${location}`);
      }
    }
  }
  for (const path of paths) for (const method of ['GET', 'HEAD']) {
    const response = await request(new URL(path, base), { method, redirect: 'manual', signal: AbortSignal.timeout(30_000) });
    await response.body?.cancel();
    if (response.status !== 200) throw new Error(`Canonical ${method} ${path} returned ${response.status}`);
  }
  const missing = '/search-monitor-missing-page/';
  const redirected = await request(new URL(missing, 'https://www.sarj.ist'), { redirect: 'manual', signal: AbortSignal.timeout(30_000) });
  await redirected.body?.cancel();
  if (![301, 308].includes(redirected.status) || redirected.headers.get('location') !== new URL(missing, base).href) throw new Error('Missing-page canonical redirect is invalid');
  const response = await request(new URL(missing, base), { redirect: 'manual', signal: AbortSignal.timeout(30_000) });
  await response.body?.cancel();
  if (response.status !== 404) throw new Error(`Canonical missing page returned ${response.status}; expected 404`);
  return { checked: true };
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

  const canonicalRedirects = await checkCanonicalRedirects(base);

  return { url: base.origin, canonicalRedirects, ...validateHealthDocument(health, { manifest, maxDataAgeHours }) };
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
