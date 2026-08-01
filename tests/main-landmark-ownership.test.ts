import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const projectRoot = join(__dirname, '..');
const appChromePath = join(projectRoot, 'components', 'AppChrome.tsx');

function collectTsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectTsxFiles(path);
    return entry.isFile() && entry.name.endsWith('.tsx') ? [path] : [];
  });
}

const nestedMainOwners = [
  ...collectTsxFiles(join(projectRoot, 'app')),
  ...collectTsxFiles(join(projectRoot, 'components')),
]
  .filter(path => path !== appChromePath)
  .filter(path => /<\/?main(?:\s|>)/.test(readFileSync(path, 'utf8')))
  .map(path => relative(projectRoot, path).replaceAll('\\', '/'));

const appChromeSource = readFileSync(appChromePath, 'utf8');
const openingMainCount = appChromeSource.match(/<main(?:\s|>)/g)?.length ?? 0;
const closingMainCount = appChromeSource.match(/<\/main>/g)?.length ?? 0;

assert.deepEqual(
  nestedMainOwners,
  [],
  `AppChrome must remain the sole main-landmark owner; nested main tags found in: ${nestedMainOwners.join(', ')}`,
);
assert.equal(openingMainCount, 3, 'AppChrome must render one main in each route-shell branch');
assert.equal(closingMainCount, 3, 'AppChrome main tags must remain balanced');

console.log('PASS AppChrome is the sole main-landmark owner across app and component TSX');
