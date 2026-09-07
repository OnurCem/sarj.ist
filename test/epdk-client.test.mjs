import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import { assertRequestInterval, fetchEpdkStations, validateEpdkServiceResponse } from '../scripts/lib/epdk-client.mjs';

async function withServer(handler, run) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const { port } = server.address();
    return await run(`http://127.0.0.1:${port}/sarjIstasyonlari/`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('sends the EPDK-compatible GET request with a JSON body', async () => {
  await withServer((request, response) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      assert.equal(request.method, 'GET');
      assert.equal(request.headers.accept, 'application/json');
      assert.deepEqual(JSON.parse(Buffer.concat(chunks)), { markaAdi: 'ZES' });
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ statusCode: 200, numRows: 1, result: [{ id: 1 }], errors: [] }));
    });
  }, async (url) => {
    const payload = await fetchEpdkStations({ url, filters: { markaAdi: 'ZES' }, timeoutMs: 2_000 });
    assert.equal(validateEpdkServiceResponse(payload).numRows, 1);
  });
});

test('fails closed when the service rate-limits a request', async () => {
  await withServer((_request, response) => {
    response.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '60' });
    response.end('{}');
  }, async (url) => {
    await assert.rejects(fetchEpdkStations({ url, timeoutMs: 2_000 }), /rate limit reached; retry after 60/);
  });
});

test('rejects empty or incomplete service responses', () => {
  assert.throws(() => validateEpdkServiceResponse({ statusCode: 200, numRows: 0, result: [], errors: [] }), /zero stations/);
  assert.throws(() => validateEpdkServiceResponse({ statusCode: 200, numRows: 2, result: [{}], errors: [] }), /does not match/);
});

test('prevents a second EPDK request inside the one-hour window', () => {
  const lastAttemptAt = '2026-09-07T12:00:00.000Z';
  assert.throws(() => assertRequestInterval({ lastAttemptAt }, { now: Date.parse('2026-09-07T12:59:59.999Z') }), /one request per hour/);
  assert.doesNotThrow(() => assertRequestInterval({ lastAttemptAt }, { now: Date.parse('2026-09-07T13:00:00.000Z') }));
});
