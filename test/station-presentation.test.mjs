import assert from 'node:assert/strict';
import test from 'node:test';
import { closestRegion, datasetPresentation, distanceKm, escapeHtml, mapHref, navigationUrl, operatorBadgeLabel, operatorNames, regionFromQuery, regionSlugFromSearch } from '../src/lib/station-presentation.mjs';

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
  const regions = [{ slug: 'ankara' }, { slug: 'istanbul' }];
  assert.equal(regionSlugFromSearch('?sehir=ankara', regions), 'ankara');
  assert.equal(regionSlugFromSearch('?sehir=unknown', regions), 'istanbul');
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
