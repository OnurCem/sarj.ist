import assert from 'node:assert/strict';
import test from 'node:test';
import { closestRegion, datasetPresentation, distanceKm, escapeHtml, mapHref, navigationUrl, operatorBadgeLabel, operatorNames, regionFromQuery, regionSlugFromSearch } from '../src/lib/station-presentation.mjs';
import { r2Arguments, STATE_OBJECTS } from '../scripts/cloudflare-state.mjs';
import { validateDeployment } from '../scripts/smoke-deployment.mjs';
import { validateDeploymentSize } from '../scripts/check-deployment-size.mjs';

test('keeps sample datasets clearly marked as illustrative', () => {
  const view = datasetPresentation({ isSample: true, label: 'Örnek veriler', refreshedAt: '2026-09-07T00:00:00+03:00' });
  assert.equal(view.isSample, true);
  assert.equal(view.badge, 'Tasarım önizlemesi');
  assert.match(view.summary, /Örnek veriler/);
  assert.doesNotMatch(view.summary, /Kaynak: EPDK/);
});

test('attributes production datasets to EPDK with their refresh date', () => {
  const view = datasetPresentation({ isSample: false, label: 'EPDK verisi', refreshedAt: '2026-09-04T18:04:01.000Z' });
  assert.equal(view.isSample, false);
  assert.equal(view.badge, 'EPDK verisi');
  assert.match(view.summary, /Kaynak: EPDK/);
  assert.match(view.summary, /4 Eylül 2026/);
  assert.match(view.about, /Enerji Piyasası Düzenleme Kurumu \(EPDK\)/);
  assert.match(view.about, /Son güncelleme: 4 Eylül 2026/);
  assert.match(view.warningText, /Anlık müsaitlik, fiyat ve çalışma durumu gösterilmez/);
});

test('builds encoded navigation links from station coordinates', () => {
  assert.equal(navigationUrl({ lat: 41.01, lng: 29.04 }), 'https://www.google.com/maps/dir/?api=1&destination=41.01%2C29.04');
  assert.throws(() => navigationUrl({ lat: Number.NaN, lng: 29.04 }), /finite numbers/);
});

test('sorts unique operators and creates compact badge labels', () => {
  assert.deepEqual(operatorNames([{ operator: 'Zes' }, { operator: 'Eşarj' }, { operator: 'Zes' }]), ['Eşarj', 'Zes']);
  assert.equal(operatorBadgeLabel('Zes'), 'zes');
  assert.equal(operatorBadgeLabel('Örnek Enerji Sanayi ve Ticaret Anonim Şirketi'), 'ÖE');
});

test('escapes external station content before rendering HTML', () => {
  assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
});

test('resolves URL-addressable regions with a safe fallback', () => {
  const regions = [{ slug: 'all' }, { slug: 'ankara' }, { slug: 'istanbul' }];
  assert.equal(regionSlugFromSearch('?sehir=ankara', regions), 'ankara');
  assert.equal(regionSlugFromSearch('?sehir=unknown', regions), 'all');
  assert.equal(regionSlugFromSearch('', [{ slug: 'izmir' }]), 'izmir');
  assert.equal(mapHref('şanlıurfa'), '/?sehir=%C5%9Fanl%C4%B1urfa');
});

test('finds a uniquely matching province from map search text', () => {
  const regions = [{ slug: 'ankara', name: 'Ankara' }, { slug: 'antalya', name: 'Antalya' }, { slug: 'istanbul', name: 'İstanbul' }];
  assert.equal(regionFromQuery('ank', regions)?.slug, 'ankara');
  assert.equal(regionFromQuery('istanbul', regions)?.slug, 'istanbul');
  assert.equal(regionFromQuery('an', regions), undefined);
});

test('finds the nearest regional center and calculates distance', () => {
  const regions = [
    { slug: 'ankara', center: { lat: 39.93, lng: 32.86 } },
    { slug: 'izmir', center: { lat: 38.42, lng: 27.14 } },
  ];
  assert.equal(closestRegion({ lat: 39.9, lng: 32.8 }, regions)?.slug, 'ankara');
  assert.ok(distanceKm({ lat: 39.9, lng: 32.8 }, { lat: 39.93, lng: 32.86 }) < 7);
});

test('builds explicit remote R2 commands for private refresh state', () => {
  assert.equal(STATE_OBJECTS.length, 3);
  assert.deepEqual(r2Arguments('get', 'sarj-ist-state', STATE_OBJECTS[0]), ['r2', 'object', 'get', 'sarj-ist-state/active/stations.json', '--file', 'data/stations.json', '--remote']);
  assert.deepEqual(r2Arguments('put', 'sarj-ist-state', STATE_OBJECTS[2]), ['r2', 'object', 'put', 'sarj-ist-state/active/fetch-state.json', '--file', 'data/raw/fetch-state.json', '--content-type', 'application/json', '--remote']);
  assert.throws(() => r2Arguments('get', '../invalid', STATE_OBJECTS[0]), /valid R2 bucket name/);
});

test('accepts only a complete production deployment in smoke validation', () => {
  const manifest = { schemaVersion: 1, totalStations: 10_001, regions: Array.from({ length: 81 }, (_, index) => ({ slug: `city-${index}` })) };
  const nationwide = { schemaVersion: 1, meta: { isSample: false, refreshedAt: '2026-09-08T00:00:00Z' }, stations: Array.from({ length: 10_001 }, (_, id) => ({ id })) };
  assert.equal(validateDeployment({ html: '<title>şarj.ist</title>', manifest, nationwide }).stationCount, 10_001);
  assert.throws(() => validateDeployment({ html: '<title>şarj.ist</title>', manifest, nationwide: { ...nationwide, meta: { isSample: true } } }), /sample data/);
});

test('guards the Cloudflare free static-asset limits', () => {
  assert.equal(validateDeploymentSize({ fileCount: 16_932, largestFileBytes: 5_800_000 }).remainingFiles, 3_068);
  assert.throws(() => validateDeploymentSize({ fileCount: 20_001, largestFileBytes: 1 }), /20,000/);
  assert.throws(() => validateDeploymentSize({ fileCount: 1, largestFileBytes: 26 * 1024 * 1024 }), /Largest static asset/);
});
