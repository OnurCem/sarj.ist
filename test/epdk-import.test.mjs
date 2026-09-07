import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { normalizeEpdkSnapshot } from '../scripts/lib/epdk-adapter.mjs';
import { reconcileStations } from '../scripts/lib/reconcile-stations.mjs';

const rawStations = [
  {
    istasyonId: 101,
    istasyonAdi: 'Kadıköy Hızlı Şarj',
    lisansSahibi: 'Örnek Enerji',
    il: 'İstanbul',
    ilce: 'Kadıköy',
    adres: 'Caferağa, Kadıköy',
    enlem: '40,990',
    boylam: '29,025',
    halkaAcik: true,
    soketler: [{ sarjTipi: 'DC', maksimumGuc: '180', adet: 2 }],
  },
  {
    stationId: 'ank-22',
    stationName: 'Çankaya AC',
    operatorName: 'Örnek Ağ',
    province: 'Ankara',
    district: 'Çankaya',
    address: 'Kızılay, Çankaya',
    location: { coordinates: [32.854, 39.92] },
    chargerType: 'AC',
    maxPower: 22,
    socketCount: 4,
    accessType: 'private',
  },
];

test('normalizes known Turkish and English EPDK field aliases', () => {
  const { dataset, report } = normalizeEpdkSnapshot({ totalCount: 2, data: { items: rawStations } }, { retrievedAt: '2026-09-07T12:00:00Z' });
  assert.equal(report.acceptedCount, 2);
  assert.equal(report.rejected.length, 0);
  assert.deepEqual(dataset.stations[0], {
    id: '101', slug: 'kadikoy-hizli-sarj-101', name: 'Kadıköy Hızlı Şarj', area: 'Caferağa, Kadıköy', district: 'Kadıköy', city: 'İstanbul', citySlug: 'istanbul', operator: 'Örnek Enerji', type: 'DC', power: 180, sockets: 2, lat: 40.99, lng: 29.025, access: 'Halka açık',
  });
  assert.equal(dataset.stations[1].access, 'Özel erişim');
  assert.equal(dataset.stations[1].type, 'AC');
});

test('normalizes the official EPDK envelope and station field names', () => {
  const payload = {
    statusCode: 200,
    statusDescription: 'OK',
    numRows: 1,
    errors: [],
    result: [{
      sarjIstasyonuNo: 'EPDK-42',
      sarjIstasyonuAdi: 'Resmî İstasyon',
      sarjAgiIsletmecisiUnvan: 'Şarj Ağı AŞ',
      hizmetSekli: 'Halka Açık',
      adres: { il: 'İstanbul', ilce: 'Kadıköy', acikAdres: 'Koşuyolu, Kadıköy' },
      enlem: 41.01,
      boylam: 29.04,
      soketler: [{ soketTipi: 'DC', soketGucu: 120 }],
    }],
  };
  const { dataset, report } = normalizeEpdkSnapshot(payload);
  assert.equal(report.acceptedCount, 1);
  assert.equal(dataset.stations[0].id, 'EPDK-42');
  assert.equal(dataset.stations[0].operator, 'Şarj Ağı AŞ');
  assert.equal(dataset.stations[0].area, 'Koşuyolu, Kadıköy');
  assert.equal(dataset.stations[0].power, 120);
});

test('rejects an incomplete response envelope before normalization', () => {
  assert.throws(() => normalizeEpdkSnapshot({ totalCount: 3, items: rawStations }), /declares 3 records but contains 2/);
});

test('retains a missing station until absence is confirmed twice', () => {
  const normalized = normalizeEpdkSnapshot(rawStations, { retrievedAt: '2026-09-07T12:00:00Z' });
  const current = normalized.dataset;
  const incoming = { ...current, stations: [current.stations[0]] };
  const importReport = { rawCount: 1, acceptedCount: 1, rejected: [] };
  const first = reconcileStations({ current, incoming, importReport, maxDropRate: 1, now: '2026-09-08T12:00:00Z' });
  assert.equal(first.report.publishedCount, 2);
  assert.deepEqual(first.report.retainedMissing, ['ank-22']);
  const second = reconcileStations({ current: first.dataset, incoming, state: first.state, importReport, maxDropRate: 1, now: '2026-09-09T12:00:00Z' });
  assert.equal(second.report.publishedCount, 1);
  assert.deepEqual(second.report.removed, ['ank-22']);
});

test('rejects suspicious station-count drops', () => {
  const normalized = normalizeEpdkSnapshot(rawStations);
  const current = { ...normalized.dataset, stations: Array.from({ length: 10 }, (_, index) => ({ ...normalized.dataset.stations[0], id: String(index) })) };
  const incoming = { ...normalized.dataset, stations: [normalized.dataset.stations[0]] };
  assert.throws(() => reconcileStations({ current, incoming, importReport: { rawCount: 1, rejected: [] }, minCount: 1 }), /Station count dropped/);
});

test('does not carry sample stations into the first production import', () => {
  const normalized = normalizeEpdkSnapshot(rawStations);
  const current = { meta: { isSample: true }, stations: [{ ...normalized.dataset.stations[0], id: 'sample-1' }] };
  const result = reconcileStations({ current, incoming: normalized.dataset, importReport: normalized.report, minCount: 1 });
  assert.equal(result.dataset.stations.length, 2);
  assert.deepEqual(result.report.retainedMissing, []);
});

test('requires two snapshots before publishing a lower socket count', () => {
  const normalized = normalizeEpdkSnapshot(rawStations);
  const current = normalized.dataset;
  const reduced = { ...current, stations: current.stations.map((station, index) => index === 0 ? { ...station, sockets: 1 } : station) };
  const first = reconcileStations({ current, incoming: reduced, importReport: normalized.report, minCount: 1 });
  assert.equal(first.dataset.stations[0].sockets, 2);
  assert.deepEqual(first.report.retainedSocketCounts, ['101']);
  const second = reconcileStations({ current: first.dataset, incoming: reduced, state: first.state, importReport: normalized.report, minCount: 1 });
  assert.equal(second.dataset.stations[0].sockets, 1);
  assert.deepEqual(second.report.confirmedSocketDecreases, ['101']);
});

test('CLI preserves the active dataset when an import fails quality gates', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sarj-epdk-'));
  try {
    const activePath = join(directory, 'stations.json');
    const inputPath = join(directory, 'response.json');
    const statePath = join(directory, 'state.json');
    const original = `${JSON.stringify({ meta: { refreshedAt: 'old' }, stations: [] })}\n`;
    await writeFile(activePath, original);
    await writeFile(inputPath, JSON.stringify({ items: [rawStations[0]] }));
    const result = spawnSync(process.execPath, [resolve('scripts/import-epdk.mjs'), '--input', inputPath, '--output', activePath, '--state', statePath, '--min-count', '2'], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /current dataset was preserved/);
    assert.equal(await readFile(activePath, 'utf8'), original);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('CLI atomically publishes an accepted import and saves the prior dataset', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sarj-epdk-'));
  try {
    const activePath = join(directory, 'stations.json');
    const previousPath = join(directory, 'previous.json');
    const inputPath = join(directory, 'response.json');
    const statePath = join(directory, 'state.json');
    const original = { meta: { isSample: true, refreshedAt: 'old' }, stations: [] };
    await writeFile(activePath, JSON.stringify(original));
    await writeFile(inputPath, JSON.stringify({ totalCount: 2, items: rawStations }));
    const result = spawnSync(process.execPath, [resolve('scripts/import-epdk.mjs'), '--input', inputPath, '--output', activePath, '--previous', previousPath, '--state', statePath, '--min-count', '2', '--retrieved-at', '2026-09-07T12:00:00Z'], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(await readFile(activePath, 'utf8')).stations.length, 2);
    assert.deepEqual(JSON.parse(await readFile(previousPath, 'utf8')), original);
    assert.equal(JSON.parse(await readFile(statePath, 'utf8')).schemaVersion, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
