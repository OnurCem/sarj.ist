import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = JSON.parse(await readFile(resolve(projectRoot, 'data/stations.json'), 'utf8'));
const outputRoot = resolve(projectRoot, 'public/data');
const regionsRoot = resolve(outputRoot, 'regions');
const grouped = Map.groupBy(source.stations, ({ citySlug }) => citySlug);

await rm(outputRoot, { recursive: true, force: true });
await mkdir(regionsRoot, { recursive: true });

const regions = [];
for (const [slug, stations] of [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  const latitudes = stations.map(({ lat }) => lat);
  const longitudes = stations.map(({ lng }) => lng);
  const bounds = {
    south: Math.min(...latitudes),
    west: Math.min(...longitudes),
    north: Math.max(...latitudes),
    east: Math.max(...longitudes),
  };
  const payload = {
    schemaVersion: 1,
    region: { slug, name: stations[0].city },
    meta: source.meta,
    stations: stations.map(({ citySlug: _citySlug, ...station }) => station),
  };
  const href = `/data/regions/${slug}.json`;
  await writeFile(resolve(regionsRoot, `${slug}.json`), JSON.stringify(payload));
  regions.push({
    slug,
    name: stations[0].city,
    href,
    count: stations.length,
    bounds,
    center: { lat: (bounds.south + bounds.north) / 2, lng: (bounds.west + bounds.east) / 2 },
  });
}

const manifest = { schemaVersion: 1, meta: source.meta, totalStations: source.stations.length, regions };
await writeFile(resolve(outputRoot, 'manifest.json'), JSON.stringify(manifest));
await writeFile(resolve(outputRoot, 'stations.json'), JSON.stringify({ schemaVersion: 1, meta: source.meta, stations: source.stations }));
console.log(`Built ${regions.length} regional bundle containing ${source.stations.length} stations`);
