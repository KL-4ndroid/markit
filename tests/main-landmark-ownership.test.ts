import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const projectRoot = join(__dirname, '..');
const appChromePath = join(projectRoot, 'components', 'AppChrome.tsx');
const welcomeScreenPath = join(projectRoot, 'components', 'auth', 'WelcomeScreen.tsx');

function collectTsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectTsxFiles(path);
    return entry.isFile() && entry.name.endsWith('.tsx') ? [path] : [];
  });
}

const unexpectedMainOwners = [
  ...collectTsxFiles(join(projectRoot, 'app')),
  ...collectTsxFiles(join(projectRoot, 'components')),
]
  .filter(path => path !== appChromePath && path !== welcomeScreenPath)
  .filter(path => /<\/?main(?:\s|>)/.test(readFileSync(path, 'utf8')))
  .map(path => relative(projectRoot, path).replaceAll('\\', '/'));

const appChromeSource = readFileSync(appChromePath, 'utf8');
const welcomeScreenSource = readFileSync(welcomeScreenPath, 'utf8');
const appChromeOpeningMainCount = appChromeSource.match(/<main(?:\s|>)/g)?.length ?? 0;
const appChromeClosingMainCount = appChromeSource.match(/<\/main>/g)?.length ?? 0;
const welcomeOpeningMainCount = welcomeScreenSource.match(/<main(?:\s|>)/g)?.length ?? 0;
const welcomeClosingMainCount = welcomeScreenSource.match(/<\/main>/g)?.length ?? 0;

assert.deepEqual(
  unexpectedMainOwners,
  [],
  `Only mutually exclusive route shells may own main landmarks; unexpected main tags found in: ${unexpectedMainOwners.join(', ')}`,
);
assert.equal(appChromeOpeningMainCount, 3, 'AppChrome must render one main in each route-shell branch');
assert.equal(appChromeClosingMainCount, 3, 'AppChrome main tags must remain balanced');
assert.equal(welcomeOpeningMainCount, 1, 'WelcomeScreen must own exactly one unauthenticated main');
assert.equal(welcomeClosingMainCount, 1, 'WelcomeScreen main tag must remain balanced');

console.log('PASS route shells own one mutually exclusive main landmark');
