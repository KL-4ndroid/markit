import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const source = readFileSync(join(root, 'app/markets/page.tsx'), 'utf8');

assert.match(source, /buildMarketListGroups\(allMarkets, now\)/);
assert.match(source, /label: '進行中'/);
assert.match(source, /label: '待準備'/);
assert.match(source, /label: '已結束'/);
assert.match(source, /查看已取消市集/);
assert.match(source, /<Tabs/);
assert.match(source, /MARKET_LIST_RETURN_STATE_KEY/);
assert.match(source, /scrollY: window\.scrollY/);
assert.match(source, /\{item\.statusLabel\}/);
assert.match(source, /\{item\.dateRangeLabel\}/);
assert.doesNotMatch(source, /formatDateKey\(item\.displayDate\)/);
assert.match(source, /dynamic\(/);
assert.match(source, /isFormOpen &&/);
assert.doesNotMatch(source, /useMarketStatsBatch|<MarketCard/);
assert.doesNotMatch(source, /getFilteredMarkets|TabType|SORT_ASCENDING_TABS/);

console.log('PASS work-stage market list UI');
