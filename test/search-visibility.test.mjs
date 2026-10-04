import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDistrictGroups, buildNearbyIndex, districtPath, guidePages, guideSummary } from '../src/lib/station-guides.mjs';
import { distanceKm, shouldAutoLocate } from '../src/lib/station-presentation.mjs';
import { retainSlugAliases, stationRedirects } from '../scripts/lib/station-aliases.mjs';
import { reconcileStations } from '../scripts/lib/reconcile-stations.mjs';
import { normalizeRecord } from '../scripts/lib/epdk-adapter.mjs';
import { checkCanonicalRedirects } from '../scripts/monitor-production.mjs';

const station = (id, district = 'Kadıköy', overrides = {}) => ({ id: String(id), slug: `station-${id}`, name: `Station ${id}`, city: 'İstanbul', citySlug: 'istanbul', district, type: 'AC', power: 22, sockets: 1, operator: 'Example', access: 'Halka açık', lat: 41, lng: 29, ...overrides });

test('district identities normalize Turkish case, whitespace and Unicode while keeping slug collisions distinct', () => {
  const groups = buildDistrictGroups([station(1, '  KADIKÖY '), station(2, 'Kadıköy'), station(3, 'Şile'), station(4, 'Sile'), station(5, ''), station(6, 'İlçe belirtilmemiş'), station(7, 'Kadıköy', { city: 'İzmir', citySlug: 'izmir' })]);
  assert.equal(groups.length, 6);
  assert.equal(groups.find(({ identity, citySlug }) => identity === 'kadıköy' && citySlug === 'istanbul').stations.length, 2);
  const paths = groups.map((group) => districtPath(group));
  assert.equal(new Set(paths).size, paths.length);
  assert.ok(paths.every((path) => /^\/sehir\/[a-z-]+\/[a-z0-9-]+\/$/.test(path)));
  assert.deepEqual(buildDistrictGroups([station(3, 'Şile'), station(4, 'Sile')]).map((group) => group.slug), buildDistrictGroups([station(4, 'Sile'), station(3, 'Şile')]).map((group) => group.slug));
});

test('pagination bounds every district page to 50 rows and reaches each station exactly once', () => {
  const source = Array.from({ length: 123 }, (_, id) => station(id));
  const pages = guidePages(buildDistrictGroups(source));
  assert.deepEqual(pages.map(({ stations }) => stations.length), [50, 50, 23]);
  assert.equal(pages[0].path, '/sehir/istanbul/kadikoy/');
  assert.equal(pages[1].path, '/sehir/istanbul/kadikoy/sayfa/2/');
  assert.equal(new Set(pages.flatMap(({ stations }) => stations.map(({ id }) => id))).size, source.length);
});

test('summary measures station classifications and access rather than connector totals', () => {
  const summary = guideSummary([station(1), station(2, '', { type: 'DC', power: 180, access: 'Özel erişim', operator: 'Other' })]);
  assert.deepEqual(summary, { total: 2, public: 1, private: 1, ac: 1, dc: 1, operators: ['Example', 'Other'], minPower: 22, maxPower: 180 });
});

test('geographic index matches brute-force great-circle neighbors and excludes the current station', () => {
  const source = Array.from({ length: 240 }, (_, id) => station(id, '', { lat: 36 + (id * 37 % 600) / 100, lng: 26 + (id * 71 % 1800) / 100 }));
  source.push(station(240, '', { lat: 41, lng: 29 }), station(241, '', { lat: 41, lng: 29 }));
  const nearest = buildNearbyIndex(source);
  for (const target of source.filter((_, index) => index % 17 === 0)) {
    const expected = source.filter(({ id }) => id !== target.id).sort((a, b) => distanceKm(target, a) - distanceKm(target, b) || a.slug.localeCompare(b.slug)).slice(0, 5);
    const actual = nearest(target);
    assert.deepEqual(actual.map(({ station }) => station.id), expected.map(({ id }) => id));
    assert.ok(actual.every(({ distance }, index) => Math.abs(distance - distanceKm(target, expected[index])) < 1e-9));
  }
  assert.equal(buildNearbyIndex([station(1)])(station(1)).length, 0);
  assert.ok(Math.abs(distanceKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 }) - 111.195) < 0.01);
});

test('historical slugs redirect directly across repeated renames and never loop or redirect removed records', () => {
  const old = station(1, '', { slug: 'old-name' });
  const middle = { ...old, slug: 'middle-name' };
  const current = { ...old, slug: 'current-name' };
  const aliases = retainSlugAliases([middle], [current], retainSlugAliases([old], [middle]));
  assert.deepEqual(stationRedirects([current], { ...aliases, 'current-name': '1', removed: '2' }), ['/istasyon/middle-name /istasyon/current-name/ 301', '/istasyon/middle-name/ /istasyon/current-name/ 301', '/istasyon/old-name /istasyon/current-name/ 301', '/istasyon/old-name/ /istasyon/current-name/ 301']);
  const result = reconcileStations({ current: { stations: [old] }, incoming: { stations: [middle] }, importReport: { rawCount: 1, rejected: [] } });
  assert.equal(result.state.slugAliases['old-name'], '1');
});

test('missing district remains explicitly unknown when city and address are present', () => {
  const normalized = normalizeRecord({ id: '1', name: 'Example', operator: 'Example', city: 'İstanbul', address: 'Example address', lat: 41, lng: 29, type: 'AC', power: 22, socketCount: 1 });
  assert.equal(normalized.district, '');
  assert.equal(buildDistrictGroups([normalized])[0].name, 'İlçe belirtilmemiş');
});

test('an explicit guide map destination takes precedence over automatic geolocation', () => {
  assert.equal(shouldAutoLocate('granted', true), false);
  assert.equal(shouldAutoLocate('granted', false), true);
});

function responseFor(url) {
  const parsed = new URL(url);
  if (parsed.origin !== 'https://sarj.ist') return new Response(null, { status: 301, headers: { location: `https://sarj.ist${parsed.pathname}${parsed.search}` } });
  return new Response(null, { status: parsed.pathname === '/search-monitor-missing-page/' ? 404 : 200 });
}

test('canonical monitor checks GET/HEAD, path/query preservation and missing-page status', async () => {
  const requests = [];
  assert.deepEqual(await checkCanonicalRedirects('https://sarj.ist', async (url, options) => { requests.push([String(url), options.method || 'GET']); return responseFor(url); }), { checked: true });
  assert.equal(requests.length, 18);
  assert.ok(requests.some(([url, method]) => url === 'http://www.sarj.ist/sehir/istanbul/?test=1' && method === 'HEAD'));
  await assert.rejects(checkCanonicalRedirects('https://sarj.ist', async () => new Response(null, { status: 302, headers: { location: 'https://sarj.ist/' } })), /permanently redirect/);
  await assert.rejects(checkCanonicalRedirects('https://sarj.ist', async (url) => String(url).includes('search-monitor-missing-page') && new URL(url).hostname === 'sarj.ist' ? new Response(null, { status: 200 }) : responseFor(url)), /expected 404/);
});

test('canonical monitor keeps workers.dev independent of custom domain redirects', async () => {
  assert.deepEqual(await checkCanonicalRedirects('https://example.workers.dev', () => { throw new Error('must not request canonical redirects'); }), { checked: false });
});
