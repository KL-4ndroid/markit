import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (path) => readFileSync(join(root, path), 'utf8');
const pkg = JSON.parse(read('package.json'));
const spec = pkg.dependencies?.['@market-mail/core'];

if (typeof spec !== 'string') {
  throw new Error('@market-mail/core dependency is missing.');
}

const exactDevelopmentPin = /^git\+ssh:\/\/git@github\.com\/KL-4ndroid\/market-mail-api\.git#[0-9a-f]{40}$/u;
const immutableReleasePin = /^git\+ssh:\/\/git@github\.com\/KL-4ndroid\/market-mail-api\.git#market-mail-core-v\d+\.\d+\.\d+$/u;
if (!exactDevelopmentPin.test(spec) && !immutableReleasePin.test(spec)) {
  throw new Error('@market-mail/core must be pinned to an exact commit or immutable market-mail-core-vX.Y.Z tag.');
}

const stripComments = (source) => source
  .replace(/\/\*[\s\S]*?\*\//gu, '')
  .replace(/(^|[^:])\/\/.*$/gmu, '$1');
const browserGlobalUsage = /\b(?:window|document|navigator)\b/u;

const coreSource = read('lib/market-mail/local-core.ts');
if (!coreSource.includes("MARKIT_MARKET_MAIL_CONTRACT_VERSION = '1.0'")) {
  throw new Error('Markit must explicitly gate Market Mail engine contract 1.0.');
}
if (browserGlobalUsage.test(stripComments(coreSource))) {
  throw new Error('Shared Market Mail core boundary must not depend on browser globals.');
}

const syncSource = read('lib/market-mail/gmail-sync.ts');
if (browserGlobalUsage.test(stripComments(syncSource))) {
  throw new Error('Shared Gmail sync orchestration must remain platform-neutral.');
}
if (!syncSource.includes('await port.persistDryRun(plan);') || !syncSource.includes('await port.commitHistoryCursor')) {
  throw new Error('Market Mail sync commit ordering contract is missing.');
}

const webAdapter = read('lib/platform/web/gmail-adapter.web.ts');
if (!webAdapter.includes("historyTypes: 'messageAdded'")) {
  throw new Error('Web Gmail adapter must request messageAdded history only.');
}
if (!webAdapter.includes('?format=full')) {
  throw new Error('Web Gmail adapter must request Gmail format=full messages.');
}

console.log('PASS Market Mail integration structure and immutable dependency pin');
