import { copyFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { access } from 'node:fs/promises';

const activePath = new URL('../data/stations.json', import.meta.url);
const samplePath = new URL('../data/stations.sample.json', import.meta.url);

try {
  await access(activePath, constants.R_OK);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  await copyFile(samplePath, activePath, constants.COPYFILE_EXCL);
  console.log('Created local data/stations.json from the tracked sample dataset');
}
