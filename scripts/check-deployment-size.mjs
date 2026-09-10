import { readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const CLOUDFLARE_FREE_LIMITS = Object.freeze({ maxFiles: 20_000, maxFileBytes: 25 * 1024 * 1024 });

export function validateDeploymentSize({ fileCount, largestFileBytes }, limits = CLOUDFLARE_FREE_LIMITS) {
  if (fileCount > limits.maxFiles) throw new Error(`Static build contains ${fileCount.toLocaleString('en-US')} files; Cloudflare Workers Free allows ${limits.maxFiles.toLocaleString('en-US')}`);
  if (largestFileBytes > limits.maxFileBytes) throw new Error(`Largest static asset is ${largestFileBytes} bytes; Cloudflare allows ${limits.maxFileBytes}`);
  return { fileCount, remainingFiles: limits.maxFiles - fileCount, largestFileBytes };
}

async function inspectDirectory(directory) {
  const entries = await readdir(directory, { recursive: true });
  let fileCount = 0;
  let largestFileBytes = 0;
  for (const entry of entries) {
    const details = await stat(resolve(directory, entry));
    if (!details.isFile()) continue;
    fileCount += 1;
    largestFileBytes = Math.max(largestFileBytes, details.size);
  }
  return { fileCount, largestFileBytes };
}

async function main() {
  const directory = resolve(process.argv[2] ?? 'dist');
  const result = validateDeploymentSize(await inspectDirectory(directory));
  console.log(JSON.stringify({ status: 'within-cloudflare-free-limits', directory, ...result }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`Deployment size check failed: ${error.message}`);
    process.exitCode = 1;
  });
}
