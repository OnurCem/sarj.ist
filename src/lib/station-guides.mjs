import { createHash } from 'node:crypto';
import { slugify } from '../../scripts/lib/epdk-adapter.mjs';
import { distanceKm, districtIdentity } from './station-presentation.mjs';
export { districtIdentity } from './station-presentation.mjs';

export const PAGE_SIZE = 50;
export const districtPath = (group, page = 1) => `/sehir/${group.citySlug}/${group.slug}/${page === 1 ? '' : `sayfa/${page}/`}`;

export function buildDistrictGroups(stations) {
  const cities = new Map();
  for (const station of stations) {
    if (!cities.has(station.citySlug)) cities.set(station.citySlug, new Map());
    const groups = cities.get(station.citySlug);
    const identity = districtIdentity(station.district);
    if (!groups.has(identity)) groups.set(identity, { identity, name: station.district?.trim() || 'İlçe belirtilmemiş', city: station.city, citySlug: station.citySlug, stations: [] });
    groups.get(identity).stations.push(station);
  }
  const result = [];
  for (const groups of cities.values()) {
    const bySlug = new Map();
    for (const group of groups.values()) {
      group.slug = group.identity ? slugify(group.identity) || 'ilce' : 'ilce-belirtilmemis';
      if (!bySlug.has(group.slug)) bySlug.set(group.slug, []);
      bySlug.get(group.slug).push(group);
    }
    for (const collisions of bySlug.values()) {
      if (collisions.length > 1) for (const group of collisions) group.slug += `-${createHash('sha256').update(group.identity).digest('hex').slice(0, 12)}`;
    }
    const slugs = new Set();
    for (const group of groups.values()) {
      if (slugs.has(group.slug)) throw new Error(`District slug collision in ${group.citySlug}: ${group.slug}`);
      slugs.add(group.slug);
      group.stations.sort((a, b) => a.name.localeCompare(b.name, 'tr') || a.slug.localeCompare(b.slug));
      group.pageCount = Math.ceil(group.stations.length / PAGE_SIZE);
      result.push(group);
    }
  }
  return result.sort((a, b) => a.city.localeCompare(b.city, 'tr') || a.name.localeCompare(b.name, 'tr'));
}

export function guidePages(groups) {
  return groups.flatMap((group) => Array.from({ length: group.pageCount }, (_, index) => ({
    group, page: index + 1, path: districtPath(group, index + 1),
    stations: group.stations.slice(index * PAGE_SIZE, (index + 1) * PAGE_SIZE),
  })));
}

export function guideSummary(stations) {
  return {
    total: stations.length,
    public: stations.filter(({ access }) => access === 'Halka açık').length,
    private: stations.filter(({ access }) => access === 'Özel erişim').length,
    ac: stations.filter(({ type }) => type === 'AC').length,
    dc: stations.filter(({ type }) => type === 'DC').length,
    operators: [...new Set(stations.map(({ operator }) => operator))].sort((a, b) => a.localeCompare(b, 'tr')),
    minPower: Math.min(...stations.map(({ power }) => power)),
    maxPower: Math.max(...stations.map(({ power }) => power)),
  };
}

// A balanced 3D k-d tree on the unit sphere. Chord distance and great-circle
// distance have the same ordering, including across longitude boundaries.
function point(station) {
  const lat = station.lat * Math.PI / 180;
  const lng = station.lng * Math.PI / 180;
  return { station, xyz: [Math.cos(lat) * Math.cos(lng), Math.cos(lat) * Math.sin(lng), Math.sin(lat)] };
}

export function buildNearbyIndex(stations) {
  function build(points, depth = 0) {
    if (!points.length) return null;
    const axis = depth % 3;
    points.sort((a, b) => a.xyz[axis] - b.xyz[axis]);
    const middle = Math.floor(points.length / 2);
    return { ...points[middle], axis, left: build(points.slice(0, middle), depth + 1), right: build(points.slice(middle + 1), depth + 1) };
  }
  const root = build(stations.map(point));
  return (station, limit = 5) => {
    if (limit <= 0) return [];
    const target = point(station).xyz;
    const best = [];
    function search(node) {
      if (!node) return;
      const squared = node.xyz.reduce((sum, value, axis) => sum + (value - target[axis]) ** 2, 0);
      if (node.station.id !== station.id) {
        best.push({ station: node.station, squared });
        best.sort((a, b) => a.squared - b.squared || a.station.slug.localeCompare(b.station.slug));
        if (best.length > limit) best.pop();
      }
      const delta = target[node.axis] - node.xyz[node.axis];
      search(delta < 0 ? node.left : node.right);
      if (best.length < limit || delta ** 2 <= best.at(-1).squared) search(delta < 0 ? node.right : node.left);
    }
    search(root);
    return best.map(({ station: alternative }) => ({ station: alternative, distance: distanceKm(station, alternative) }));
  };
}
