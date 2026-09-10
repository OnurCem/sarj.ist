import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fetchDeploymentSnapshot } from './smoke-deployment.mjs';

async function writeJsonAtomic(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temporaryPath, path);
}

export function buildBootstrapState(nationwide) {
  const ids = nationwide.stations.map(({ id }) => id);
  if (ids.some((id) => typeof id !== 'string' || id.length === 0)) throw new Error('Deployment contains a station without an ID');
  if (new Set(ids).size !== ids.length) throw new Error('Deployment contains duplicate station IDs');
  const updatedAt = nationwide.meta.refreshedAt;
  if (!updatedAt || Number.isNaN(Date.parse(updatedAt))) throw new Error('Deployment refresh timestamp is invalid');

  const dataset = { meta: nationwide.meta, stations: nationwide.stations };
  const state = {
    schemaVersion: 1,
    updatedAt,
    missing: {},
    socketDecreases: {},
    lastReport: {
      rawCount: ids.length,
      acceptedCount: ids.length,
      publishedCount: ids.length,
      added: ids,
      changed: [],
      retainedMissing: [],
      removed: [],
      retainedSocketCounts: [],
      confirmedSocketDecreases: [],
      rejected: [],
    },
  };
  return { dataset, state };
}

async function main() {
  const target = process.argv[2];
  if (!target) throw new Error('Usage: node scripts/bootstrap-state-from-deployment.mjs https://deployment.example');
  const { base, nationwide, health } = await fetchDeploymentSnapshot(target);
  const { dataset, state } = buildBootstrapState(nationwide);
  await writeJsonAtomic(resolve('data/stations.json'), dataset);
  await writeJsonAtomic(resolve('data/import-state.json'), state);
  console.log(JSON.stringify({ status: 'recovered', url: base.origin, ...health }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`Deployment state recovery failed: ${error.message}`);
    process.exitCode = 1;
  });
}
