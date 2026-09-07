import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { assertRequestInterval, EMPTY_STATION_FILTER, EPDK_STATIONS_URL, fetchEpdkStations, validateEpdkServiceResponse } from './lib/epdk-client.mjs';

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

const options = parseArgs(process.argv.slice(2));
const outputPath = resolve(options.output ?? 'data/raw/epdk-latest.json');
const statePath = resolve(options.state ?? 'data/raw/fetch-state.json');
const filters = options.filters ? JSON.parse(options.filters) : process.env.EPDK_FILTER_JSON ? JSON.parse(process.env.EPDK_FILTER_JSON) : EMPTY_STATION_FILTER;
const url = options.url ?? process.env.EPDK_STATIONS_URL ?? EPDK_STATIONS_URL;

async function readState() {
  try { return JSON.parse(await readFile(statePath, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return {}; throw error; }
}

async function writeJsonAtomic(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temporaryPath, path);
}

try {
  const attemptedAt = new Date().toISOString();
  const state = await readState();
  assertRequestInterval(state, { now: Date.parse(attemptedAt) });
  await writeJsonAtomic(statePath, { ...state, lastAttemptAt: attemptedAt });
  const payload = validateEpdkServiceResponse(await fetchEpdkStations({ url, filters }));
  await writeJsonAtomic(outputPath, payload);
  await writeJsonAtomic(statePath, { lastAttemptAt: attemptedAt, lastSuccessAt: new Date().toISOString(), numRows: payload.numRows });
  console.log(`Fetched ${payload.numRows} EPDK stations to ${outputPath} in ${payload.elapsedTime ?? 'unknown'}ms service time`);
} catch (error) {
  console.error(`EPDK fetch failed; no snapshot was published. ${error.message}`);
  process.exitCode = 1;
}
