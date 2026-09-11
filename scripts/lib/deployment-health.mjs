const VALID_STATUS = 'ok';
const PRODUCTION_SOURCE = 'EPDK';

function requireIsoDate(value, field) {
  const timestamp = Date.parse(value);
  if (typeof value !== 'string' || Number.isNaN(timestamp)) throw new Error(`${field} must be a valid ISO date`);
  return timestamp;
}

function requirePositiveInteger(value, field) {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${field} must be a positive integer`);
}

export function buildHealthDocument({ meta, stations, commit = 'local', generatedAt = new Date().toISOString() }) {
  requireIsoDate(meta?.refreshedAt, 'meta.refreshedAt');
  requireIsoDate(generatedAt, 'generatedAt');
  if (typeof commit !== 'string' || commit.trim() === '') throw new Error('commit must be present');
  if (!Array.isArray(stations) || stations.length === 0) throw new Error('stations must be a non-empty array');

  return {
    schemaVersion: 1,
    status: VALID_STATUS,
    service: 'sarj.ist',
    generatedAt,
    commit,
    data: {
      source: meta.isSample ? 'sample' : PRODUCTION_SOURCE,
      isSample: meta.isSample === true,
      refreshedAt: meta.refreshedAt,
      stationCount: stations.length,
      regionCount: new Set(stations.map(({ citySlug }) => citySlug)).size,
    },
  };
}

export function validateHealthDocument(health, { manifest, maxDataAgeHours = Infinity, now = Date.now() } = {}) {
  if (health?.schemaVersion !== 1 || health.status !== VALID_STATUS || health.service !== 'sarj.ist') throw new Error('Health document identity is invalid');
  requireIsoDate(health.generatedAt, 'health.generatedAt');
  if (typeof health.commit !== 'string' || health.commit.trim() === '') throw new Error('health.commit must be present');
  if (health.data?.source !== PRODUCTION_SOURCE || health.data?.isSample !== false) throw new Error('Health document does not describe production EPDK data');

  const refreshedAt = requireIsoDate(health.data.refreshedAt, 'health.data.refreshedAt');
  requirePositiveInteger(health.data.stationCount, 'health.data.stationCount');
  requirePositiveInteger(health.data.regionCount, 'health.data.regionCount');

  if (manifest) {
    if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.regions)) throw new Error('Deployment manifest is invalid');
    if (health.data.stationCount !== manifest.totalStations) throw new Error('Health station count does not match the manifest');
    if (health.data.regionCount !== manifest.regions.length) throw new Error('Health region count does not match the manifest');
    if (health.data.refreshedAt !== manifest.meta?.refreshedAt) throw new Error('Health refresh time does not match the manifest');
  }

  if (Number.isFinite(maxDataAgeHours)) {
    if (maxDataAgeHours <= 0) throw new Error('maxDataAgeHours must be positive');
    const ageHours = (now - refreshedAt) / 3_600_000;
    if (ageHours < -1) throw new Error('Production data refresh time is unexpectedly in the future');
    if (ageHours > maxDataAgeHours) throw new Error(`Production data is stale (${ageHours.toFixed(1)} hours old; maximum ${maxDataAgeHours} hours)`);
  }

  return {
    stationCount: health.data.stationCount,
    regionCount: health.data.regionCount,
    refreshedAt: health.data.refreshedAt,
    generatedAt: health.generatedAt,
    commit: health.commit,
  };
}
