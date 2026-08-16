import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildMarketDetailHref } from '../lib/navigation/market-detail-route';

assert.equal(
  buildMarketDetailHref('market-1'),
  '/markets/detail/?id=market-1',
);
assert.equal(
  buildMarketDetailHref(' market/one ', { task: 'pending photos' }),
  '/markets/detail/?id=market%2Fone&task=pending+photos',
);
assert.throws(() => buildMarketDetailHref('   '), /requires a market ID/);

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const nextConfigSource = readFileSync(join(projectRoot, 'next.config.mjs'), 'utf8');
const wrapperSource = readFileSync(join(projectRoot, 'app', 'markets', 'detail', 'page.tsx'), 'utf8');
const legacyWebPagePath = join(projectRoot, 'app', 'markets', '[id]', 'page.web.tsx');
const legacyWebPageSource = readFileSync(legacyWebPagePath, 'utf8');
const screenSource = readFileSync(
  join(projectRoot, 'components', 'markets', 'MarketDetailScreen.tsx'),
  'utf8',
);

assert.match(wrapperSource, /<Suspense/);
assert.match(screenSource, /searchParams\.get\('id'\)/);
assert.doesNotMatch(screenSource, /useParams/);
assert.equal(
  existsSync(join(projectRoot, 'app', 'markets', '[id]', 'page.tsx')),
  false,
  'The runtime-ID dynamic route must not remain in the static export route tree.',
);
assert.equal(existsSync(legacyWebPagePath), true, 'Web must retain legacy market bookmarks');
assert.match(legacyWebPageSource, /import \{ redirect \} from ['"]next\/navigation['"]/);
assert.match(legacyWebPageSource, /redirect\(buildMarketDetailHref\(id, \{ task \}\)\)/);
assert.match(legacyWebPageSource, /Array\.isArray\(query\.task\)/);
assert.ok(
  nextConfigSource.includes("source: '/markets/:id((?!detail$|schedules$)[^/]+)'"),
  'Web legacy market redirects must preserve the fixed-schedule management route.',
);

const legacyMarketRedirectPattern = /^\/markets\/((?!detail$|schedules$)[^/]+)$/;
assert.match('/markets/market-1', legacyMarketRedirectPattern);
assert.doesNotMatch('/markets/detail', legacyMarketRedirectPattern);
assert.doesNotMatch('/markets/schedules', legacyMarketRedirectPattern);

console.log('PASS market detail static route');
