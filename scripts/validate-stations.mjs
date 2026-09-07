import { readFile } from 'node:fs/promises';

const sourcePath = new URL('../data/stations.json', import.meta.url);
const source = JSON.parse(await readFile(sourcePath, 'utf8'));
const failures = [];
const ids = new Set();
const slugs = new Set();
const requiredStrings = ['id', 'slug', 'name', 'area', 'district', 'city', 'citySlug', 'operator', 'type', 'access'];

if (!source.meta || typeof source.meta.refreshedAt !== 'string' || Number.isNaN(Date.parse(source.meta.refreshedAt))) failures.push('meta.refreshedAt must be a valid ISO date');
if (!Array.isArray(source.stations) || source.stations.length === 0) failures.push('stations must be a non-empty array');

for (const [index, station] of (source.stations ?? []).entries()) {
  const at = `stations[${index}]`;
  for (const field of requiredStrings) {
    if (typeof station[field] !== 'string' || station[field].trim() === '') failures.push(`${at}.${field} must be a non-empty string`);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(station.slug ?? '')) failures.push(`${at}.slug must be URL-safe`);
  if (!['AC', 'DC'].includes(station.type)) failures.push(`${at}.type must be AC or DC`);
  if (!['Halka açık', 'Özel erişim'].includes(station.access)) failures.push(`${at}.access is invalid`);
  if (!Number.isFinite(station.power) || station.power <= 0) failures.push(`${at}.power must be positive`);
  if (!Number.isInteger(station.sockets) || station.sockets <= 0) failures.push(`${at}.sockets must be a positive integer`);
  if (!Number.isFinite(station.lat) || station.lat < 35 || station.lat > 43) failures.push(`${at}.lat must be within Turkey's approximate bounds`);
  if (!Number.isFinite(station.lng) || station.lng < 25 || station.lng > 46) failures.push(`${at}.lng must be within Turkey's approximate bounds`);
  if (ids.has(station.id)) failures.push(`${at}.id duplicates ${station.id}`);
  if (slugs.has(station.slug)) failures.push(`${at}.slug duplicates ${station.slug}`);
  ids.add(station.id);
  slugs.add(station.slug);
}

if (failures.length) {
  console.error(`Station data validation failed:\n- ${failures.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log(`Validated ${source.stations.length} stations from ${sourcePath.pathname}`);
}
