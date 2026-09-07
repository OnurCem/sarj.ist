import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { normalizeEpdkSnapshot } from './lib/epdk-adapter.mjs';
import { reconcileStations } from './lib/reconcile-stations.mjs';

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new Error('Arguments must be --name value pairs');
    options[key.slice(2)] = value;
  }
  return options;
}

async function readJson(path, fallback) {
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
}

async function writeJsonAtomic(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temporaryPath, path);
}

const options = parseArgs(process.argv.slice(2));
if (!options.input) {
  console.error('Usage: npm run import:epdk -- --input path/to/response.json [--min-count 10000]');
  process.exit(2);
}

const outputPath = resolve(options.output ?? 'data/stations.json');
const statePath = resolve(options.state ?? 'data/import-state.json');
const previousPath = resolve(options.previous ?? 'data/history/stations.previous.json');
const retrievedAt = options['retrieved-at'] ?? new Date().toISOString();

try {
  const payload = JSON.parse(await readFile(resolve(options.input), 'utf8'));
  const current = await readJson(outputPath, null);
  const state = await readJson(statePath, {});
  const normalized = normalizeEpdkSnapshot(payload, { retrievedAt });
  const result = reconcileStations({
    current,
    incoming: normalized.dataset,
    state,
    importReport: normalized.report,
    confirmationRuns: Number(options['confirmation-runs'] ?? 2),
    minCount: Number(options['min-count'] ?? 10000),
    maxDropRate: Number(options['max-drop-rate'] ?? 0.15),
    maxInvalidRate: Number(options['max-invalid-rate'] ?? 0.01),
    now: retrievedAt,
  });

  if (current) await writeJsonAtomic(previousPath, current);
  await writeJsonAtomic(outputPath, result.dataset);
  await writeJsonAtomic(statePath, result.state);
  console.log(JSON.stringify({ status: 'accepted', outputPath, previousPath, statePath, ...result.report }, null, 2));
} catch (error) {
  console.error(`EPDK import rejected; current dataset was preserved. ${error.message}`);
  process.exitCode = 1;
}
