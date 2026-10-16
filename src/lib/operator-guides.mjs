import { slugify } from '../../scripts/lib/epdk-adapter.mjs';

// Thresholds keep thin pages out of the index and the static file count bounded.
export const MIN_OPERATOR_STATIONS = 5;
export const MIN_OPERATOR_CITY_STATIONS = 10;

export const operatorSlug = (name) => slugify(String(name ?? '').normalize('NFC').trim());
export const operatorPath = (slug) => `/operator/${slug}/`;
export const operatorCityPath = (slug, citySlug) => `/operator/${slug}/${citySlug}/`;

const byName = (a, b) => a.name.localeCompare(b.name, 'tr') || a.slug.localeCompare(b.slug);

// EPDK spells some operators inconsistently ("Ecojet"/"ecojet"); variants that
// share a slug are one operator, displayed with the most frequent spelling.
export function buildOperatorGroups(stations, { minStations = MIN_OPERATOR_STATIONS, minCityStations = MIN_OPERATOR_CITY_STATIONS } = {}) {
  const operators = new Map();
  for (const station of stations) {
    const slug = operatorSlug(station.operator);
    if (!slug) continue;
    if (!operators.has(slug)) operators.set(slug, { slug, spellings: new Map(), stations: [] });
    const operator = operators.get(slug);
    operator.spellings.set(station.operator, (operator.spellings.get(station.operator) ?? 0) + 1);
    operator.stations.push(station);
  }
  const result = [];
  for (const operator of operators.values()) {
    if (operator.stations.length < minStations) continue;
    const spellings = [...operator.spellings.entries()].sort(([a, countA], [b, countB]) => countB - countA || a.localeCompare(b, 'tr'));
    operator.name = spellings[0][0].trim();
    operator.variants = spellings.map(([name]) => name);
    delete operator.spellings;
    operator.stations.sort((a, b) => a.name.localeCompare(b.name, 'tr') || a.slug.localeCompare(b.slug));
    const cities = new Map();
    for (const station of operator.stations) {
      if (!cities.has(station.citySlug)) cities.set(station.citySlug, { name: station.city, slug: station.citySlug, stations: [] });
      cities.get(station.citySlug).stations.push(station);
    }
    operator.cities = [...cities.values()]
      .map((city) => ({ ...city, hasPage: city.stations.length >= minCityStations }))
      .sort((a, b) => b.stations.length - a.stations.length || a.name.localeCompare(b.name, 'tr'));
    result.push(operator);
  }
  return result.sort(byName);
}

export function operatorCityPages(groups) {
  return groups.flatMap((operator) => operator.cities.filter(({ hasPage }) => hasPage).map((city) => ({ operator, city, path: operatorCityPath(operator.slug, city.slug) })));
}

export function operatorPaths(groups) {
  return ['/operator/', ...groups.map(({ slug }) => operatorPath(slug)), ...operatorCityPages(groups).map(({ path }) => path)];
}

// Most specific operator guide for a station or guide context, if one exists.
export function operatorLinker(groups) {
  const bySlug = new Map(groups.map((group) => [group.slug, group]));
  return (operatorName, citySlug) => {
    const operator = bySlug.get(operatorSlug(operatorName));
    if (!operator) return undefined;
    const city = citySlug && operator.cities.find(({ slug }) => slug === citySlug);
    return city?.hasPage
      ? { name: operator.name, path: operatorCityPath(operator.slug, citySlug), cityName: city.name }
      : { name: operator.name, path: operatorPath(operator.slug) };
  };
}

// Operators present in a set of stations, merged by slug and linked where a guide exists.
export function operatorsIn(stations, linkFor, citySlug) {
  const operators = new Map();
  for (const { operator } of stations) {
    const slug = operatorSlug(operator);
    if (!slug) continue;
    if (!operators.has(slug)) operators.set(slug, { slug, name: operator.trim(), count: 0 });
    operators.get(slug).count += 1;
  }
  return [...operators.values()].map((operator) => {
    const link = linkFor(operator.name, citySlug);
    return { ...operator, name: link?.name ?? operator.name, path: link?.path };
  }).sort(byName);
}
