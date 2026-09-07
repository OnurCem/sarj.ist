const arrayKeys = ['stations', 'chargingStations', 'sarjIstasyonlari', 'istasyonlar', 'items', 'results', 'result', 'data'];

const first = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');
const number = (value) => {
  const parsed = typeof value === 'string' ? Number(value.replace(',', '.')) : value;
  return Number.isFinite(parsed) ? parsed : undefined;
};

export function slugify(value) {
  return String(value)
    .toLocaleLowerCase('tr')
    .replaceAll('ı', 'i').replaceAll('ş', 's').replaceAll('ğ', 'g').replaceAll('ü', 'u').replaceAll('ö', 'o').replaceAll('ç', 'c')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function extractRecords(payload) {
  if (Array.isArray(payload)) return { records: payload, declaredCount: payload.length };
  if (!payload || typeof payload !== 'object') throw new Error('EPDK payload must be an object or array');
  const declaredCount = number(first(payload.totalCount, payload.total, payload.recordCount, payload.kayitSayisi, payload.numRows));
  for (const key of arrayKeys) {
    if (Array.isArray(payload[key])) return { records: payload[key], declaredCount };
    if (payload[key] && typeof payload[key] === 'object') {
      try {
        const nested = extractRecords(payload[key]);
        return { records: nested.records, declaredCount: declaredCount ?? nested.declaredCount };
      } catch { /* Try the next known envelope key. */ }
    }
  }
  throw new Error('EPDK response envelope does not contain a recognized station array');
}

function connectorSummary(raw) {
  const connectorValue = first(raw.connectors, raw.sockets, raw.soketler, raw.sarjUnitesiListesi);
  let connectors = Array.isArray(connectorValue) ? connectorValue : [];
  if (typeof connectorValue === 'string' && connectorValue.trim().startsWith('[')) {
    try { connectors = JSON.parse(connectorValue); } catch { /* Validation below will reject missing socket details. */ }
  }
  const topType = first(raw.type, raw.chargerType, raw.sarjTipi, raw.soketTipi);
  const types = [topType, ...connectors.map((item) => first(item.type, item.chargerType, item.sarjTipi, item.soketTipi))]
    .filter(Boolean).map((value) => String(value).toLocaleUpperCase('tr'));
  const powers = [first(raw.power, raw.maxPower, raw.guc, raw.maksimumGuc, raw.soketGucu), ...connectors.map((item) => first(item.power, item.maxPower, item.guc, item.maksimumGuc, item.soketGucu, item.soketGucuKw))]
    .map(number).filter(Number.isFinite);
  const explicitCount = number(first(raw.socketCount, raw.connectorCount, raw.soketSayisi));
  const connectorCount = connectors.reduce((total, item) => total + (number(first(item.count, item.adet, item.soketSayisi)) ?? 1), 0);
  return {
    type: types.some((value) => value.includes('DC') || value.includes('CCS') || value.includes('CHADEMO')) ? 'DC' : 'AC',
    power: powers.length ? Math.max(...powers) : undefined,
    sockets: explicitCount ?? (connectorCount || undefined),
  };
}

function accessLabel(raw) {
  const value = first(raw.publicAccess, raw.isPublic, raw.halkaAcik, raw.access, raw.accessType, raw.erisimTipi, raw.hizmetSekli);
  if (typeof value === 'boolean') return value ? 'Halka açık' : 'Özel erişim';
  const normalized = String(value ?? '').toLocaleLowerCase('tr');
  return normalized.includes('özel') || normalized.includes('private') || normalized.includes('kapalı') ? 'Özel erişim' : 'Halka açık';
}

export function normalizeRecord(raw) {
  const addressObject = raw.adres && typeof raw.adres === 'object' ? raw.adres : {};
  const location = raw.location ?? raw.konum ?? addressObject;
  const coordinates = Array.isArray(location.coordinates) ? location.coordinates : [];
  const id = String(first(raw.id, raw.stationId, raw.chargeStationId, raw.istasyonId, raw.sarjIstasyonId, raw.sarjIstasyonuNo, '')).trim();
  const name = String(first(raw.name, raw.stationName, raw.istasyonAdi, raw.sarjIstasyonAdi, '')).trim();
  const operator = String(first(raw.operatorName, raw.operator, raw.network, raw.firmaAdi, raw.lisansSahibi, raw.sarjAgiIsletmecisiUnvan, raw.sarjIstasyonuIsletmecisi, raw.marka, '')).trim();
  const city = String(first(raw.city, raw.province, raw.il, raw.sehir, location.city, location.il, '')).trim();
  const district = String(first(raw.district, raw.ilce, location.district, location.ilce, '')).trim();
  const flatAddress = typeof raw.adres === 'string' ? raw.adres : undefined;
  const area = String(first(raw.address, flatAddress, location.fullAddress, location.acikAdres, location.address, location.adres, district, '')).trim();
  const lat = number(first(raw.lat, raw.latitude, raw.enlem, location.lat, location.latitude, location.enlem, coordinates[1]));
  const lng = number(first(raw.lng, raw.lon, raw.longitude, raw.boylam, location.lng, location.lon, location.longitude, location.boylam, coordinates[0]));
  const connector = connectorSummary(raw);
  const missing = Object.entries({ id, name, operator, city, district, area, lat, lng, power: connector.power, sockets: connector.sockets })
    .filter(([, value]) => value === '' || value === undefined).map(([key]) => key);
  if (missing.length) throw new Error(`missing ${missing.join(', ')}`);
  if (lat < 35 || lat > 43 || lng < 25 || lng > 46) throw new Error('coordinates fall outside Turkey');
  if (!Number.isInteger(connector.sockets) || connector.sockets <= 0) throw new Error('socket count must be a positive integer');
  if (connector.power <= 0) throw new Error('power must be positive');
  return {
    id,
    slug: `${slugify(name)}-${slugify(id)}`,
    name,
    area,
    district,
    city,
    citySlug: slugify(city),
    operator,
    type: connector.type,
    power: connector.power,
    sockets: connector.sockets,
    lat,
    lng,
    access: accessLabel(raw),
  };
}

export function normalizeEpdkSnapshot(payload, { retrievedAt = new Date().toISOString() } = {}) {
  const { records, declaredCount } = extractRecords(payload);
  if (declaredCount !== undefined && declaredCount !== records.length) {
    throw new Error(`EPDK envelope declares ${declaredCount} records but contains ${records.length}`);
  }
  const stations = [];
  const rejected = [];
  const ids = new Set();
  for (const [index, raw] of records.entries()) {
    let station;
    try {
      station = normalizeRecord(raw);
    } catch (error) {
      rejected.push({ index, id: first(raw?.id, raw?.stationId, raw?.istasyonId, null), reason: error.message });
      continue;
    }
    if (ids.has(station.id)) throw new Error(`EPDK snapshot contains duplicate station id ${station.id}`);
    ids.add(station.id);
    stations.push(station);
  }
  return {
    dataset: { meta: { isSample: false, label: 'EPDK verisi', refreshedAt: retrievedAt }, stations },
    report: { rawCount: records.length, acceptedCount: stations.length, rejected },
  };
}
