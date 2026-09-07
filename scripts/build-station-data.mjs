import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = JSON.parse(await readFile(resolve(projectRoot, 'data/stations.sample.json'), 'utf8'));
const outputRoot = resolve(projectRoot, 'public/data');
const regionsRoot = resolve(outputRoot, 'regions');
const grouped = Map.groupBy(source.stations, ({ citySlug }) => citySlug);

await rm(outputRoot, { recursive: true, force: true });
await mkdir(regionsRoot, { recursive: true });

const regions = [];
for (const [slug, stations] of [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  const payload = {
    schemaVersion: 1,
    region: { slug, name: stations[0].city },
    meta: source.meta,
    stations: stations.map(({ citySlug: _citySlug, ...station }) => station),
  };
  const href = `/data/regions/${slug}.json`;
  await writeFile(resolve(regionsRoot, `${slug}.json`), JSON.stringify(payload));
  regions.push({ slug, name: stations[0].city, href, count: stations.length });
}

const manifest = { schemaVersion: 1, meta: source.meta, totalStations: source.stations.length, regions };
await writeFile(resolve(outputRoot, 'manifest.json'), JSON.stringify(manifest));
console.log(`Built ${regions.length} regional bundle containing ${source.stations.length} stations`);
