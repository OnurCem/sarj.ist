import http from 'node:http';
import https from 'node:https';

export const EPDK_STATIONS_URL = 'https://apigateway.epdk.gov.tr/sarjIstasyonlari/';
export const EMPTY_STATION_FILTER = {};
const REQUIRED_COLUMNS = ['sarjIstasyonuNo', 'sarjIstasyonuAdi', 'sarjAgiIsletmecisiUnvan', 'adres', 'enlem', 'boylam', 'soketler', 'hizmetSekli'];

export function assertRequestInterval(state, { now = Date.now(), minIntervalMs = 60 * 60 * 1000 } = {}) {
  const lastAttempt = Date.parse(state?.lastAttemptAt ?? '');
  if (!Number.isNaN(lastAttempt) && now - lastAttempt < minIntervalMs) {
    const nextAttemptAt = new Date(lastAttempt + minIntervalMs).toISOString();
    throw new Error(`EPDK permits one request per hour; next request is allowed after ${nextAttemptAt}`);
  }
}

export function fetchEpdkStations({ url = EPDK_STATIONS_URL, filters = EMPTY_STATION_FILTER, timeoutMs = 60_000, maxBytes = 100 * 1024 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    if (!['http:', 'https:'].includes(target.protocol)) return reject(new Error('EPDK URL must use HTTP or HTTPS'));
    const body = JSON.stringify(filters);
    const transport = target.protocol === 'https:' ? https : http;
    const request = transport.request(target, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': 'sarj.ist-data-refresh/1.0 (+https://sarj.ist)',
      },
    }, (response) => {
      const chunks = [];
      let received = 0;
      response.on('data', (chunk) => {
        received += chunk.length;
        if (received > maxBytes) request.destroy(new Error(`EPDK response exceeded ${maxBytes} bytes`));
        else chunks.push(chunk);
      });
      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        if (response.statusCode === 429) return reject(new Error(`EPDK rate limit reached${response.headers['retry-after'] ? `; retry after ${response.headers['retry-after']}` : ''}`));
        if (response.statusCode < 200 || response.statusCode >= 300) return reject(new Error(`EPDK returned HTTP ${response.statusCode}: ${text.slice(0, 300)}`));
        if (!String(response.headers['content-type'] ?? '').toLowerCase().includes('application/json')) return reject(new Error(`EPDK returned unexpected content type ${response.headers['content-type'] ?? 'unknown'}`));
        try { resolve(JSON.parse(text)); }
        catch { reject(new Error('EPDK returned invalid JSON')); }
      });
    });
    request.setTimeout(timeoutMs, () => request.destroy(new Error(`EPDK request timed out after ${timeoutMs}ms`)));
    request.on('error', reject);
    request.end(body);
  });
}

export function validateEpdkServiceResponse(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('EPDK response must be an object');
  if (payload.statusCode !== 200) throw new Error(`EPDK response status is ${payload.statusCode ?? 'missing'}: ${payload.statusDescription ?? 'unknown'}`);
  if (Array.isArray(payload.errors) && payload.errors.length) throw new Error(`EPDK response contains errors: ${JSON.stringify(payload.errors)}`);
  const records = Array.isArray(payload.result) ? payload.result : payload.data;
  if (!Array.isArray(records)) throw new Error('EPDK response data must be an array');
  if (!Number.isInteger(payload.numRows) || payload.numRows !== records.length) throw new Error(`EPDK numRows ${payload.numRows ?? 'missing'} does not match data length ${records.length}`);
  if (records.length === 0) throw new Error('EPDK returned zero stations');
  if (payload.columnNames !== undefined) {
    if (!Array.isArray(payload.columnNames)) throw new Error('EPDK columnNames must be an array');
    const missingColumns = REQUIRED_COLUMNS.filter((column) => !payload.columnNames.includes(column));
    if (missingColumns.length) throw new Error(`EPDK response is missing required columns: ${missingColumns.join(', ')}`);
  }
  return payload;
}
