import { access, mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

export const STATE_OBJECTS = Object.freeze([
  { key: 'active/stations.json', path: 'data/stations.json' },
  { key: 'active/import-state.json', path: 'data/import-state.json' },
  { key: 'active/fetch-state.json', path: 'data/raw/fetch-state.json' },
]);

export function r2Arguments(operation, bucket, object) {
  if (!['get', 'put'].includes(operation)) throw new Error(`Unsupported R2 operation: ${operation}`);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(bucket)) throw new Error('CLOUDFLARE_STATE_BUCKET must be a valid R2 bucket name');
  const objectPath = `${bucket}/${object.key}`;
  if (operation === 'get') return ['r2', 'object', 'get', objectPath, '--file', object.path, '--remote'];
  return ['r2', 'object', 'put', objectPath, '--file', object.path, '--content-type', 'application/json', '--remote'];
}

async function assertJson(path) {
  const parsed = JSON.parse(await readFile(path, 'utf8'));
  if (!parsed || typeof parsed !== 'object') throw new Error(`${path} must contain a JSON object`);
}

async function runWrangler(args) {
  const script = resolve('node_modules/wrangler/bin/wrangler.js');
  await new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [script, ...args], { env: process.env, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code, signal) => code === 0
      ? resolvePromise()
      : reject(new Error(`Wrangler exited ${signal ? `with signal ${signal}` : `with code ${code}`}`)));
  });
}

async function restore(bucket) {
  for (const object of STATE_OBJECTS) {
    await mkdir(dirname(object.path), { recursive: true });
    await runWrangler(r2Arguments('get', bucket, object));
    await assertJson(object.path);
  }
  console.log(`Restored ${STATE_OBJECTS.length} private refresh-state objects from R2.`);
}

async function publish(bucket, objects) {
  for (const object of objects) {
    await access(object.path);
    await assertJson(object.path);
    await runWrangler(r2Arguments('put', bucket, object));
  }
  console.log(`Published ${objects.length} private refresh-state object${objects.length === 1 ? '' : 's'} to R2.`);
}

async function main() {
  const [command, ...flags] = process.argv.slice(2);
  const bootstrap = flags.includes('--bootstrap');
  const bucket = process.env.CLOUDFLARE_STATE_BUCKET;
  if (!process.env.CLOUDFLARE_ACCOUNT_ID) throw new Error('CLOUDFLARE_ACCOUNT_ID is required');
  if (!process.env.CLOUDFLARE_API_TOKEN) throw new Error('CLOUDFLARE_API_TOKEN is required');
  if (!bucket) throw new Error('CLOUDFLARE_STATE_BUCKET is required');
  r2Arguments('get', bucket, STATE_OBJECTS[0]);
  if (command === 'restore' && bootstrap) {
    console.log('Bootstrap selected: no previous Cloudflare refresh state will be restored.');
    return;
  }
  if (command === 'restore') return restore(bucket);
  if (command === 'publish-fetch-state') return publish(bucket, [STATE_OBJECTS[2]]);
  if (command === 'publish-validated-state') return publish(bucket, STATE_OBJECTS.slice(0, 2));
  throw new Error('Usage: node scripts/cloudflare-state.mjs restore [--bootstrap] | publish-fetch-state | publish-validated-state');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`Cloudflare refresh state operation failed: ${error.message}`);
    process.exitCode = 1;
  });
}
