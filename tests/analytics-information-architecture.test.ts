import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const pageSource = readFileSync(join(root, 'app/analytics/page.tsx'), 'utf8');
const viewModelSource = readFileSync(
  join(root, 'lib/analytics/market-metrics-view-model.ts'),
  'utf8',
);
const metricsSource = readFileSync(join(root, 'lib/analytics/metrics-engine.ts'), 'utf8');
const manifestSource = readFileSync(join(root, 'scripts/test-files.txt'), 'utf8');

assert.match(pageSource, /type AnalyticsTab = 'summary' \| 'trends' \| 'products' \| 'advanced'/);
assert.match(pageSource, /label: '摘要'/);
assert.match(pageSource, /label: '趨勢'/);
assert.match(pageSource, /label: '商品'/);
assert.match(pageSource, /label: '進階'/);

assert.match(pageSource, /const needsMetrics = activeTab === 'summary' \|\| activeTab === 'advanced'/);
assert.match(pageSource, /if \(activeTab !== 'summary'/);
assert.match(pageSource, /if \(activeTab !== 'trends'/);
assert.match(pageSource, /if \(activeTab !== 'products'/);
assert.match(pageSource, /dynamic\([\s\S]*DailyRevenueChart/);
assert.match(pageSource, /dynamic\([\s\S]*AdvancedAnalyticsSection/);

assert.match(viewModelSource, /calculateBatchMetrics/);
assert.match(viewModelSource, /composeMarketMetricsViewModel/);
assert.match(viewModelSource, /composeAdvancedMarketMetricsViewModel/);
assert.doesNotMatch(pageSource, /calculateMarketMetrics/);

assert.match(metricsSource, /\.where\('market_id'\)\s*\.anyOf\(marketIds\)/);
assert.match(metricsSource, /preloadedDealEvents/);
assert.match(metricsSource, /metricsCache = new WeakMap<Market, MarketMetrics>\(\)/);

assert.match(pageSource, /isPotentiallyStale/);
assert.match(pageSource, /目前顯示這台裝置的資料/);
assert.match(pageSource, /摘要暫時無法完成/);
assert.match(pageSource, /尚無商品層級銷售資料/);
assert.match(manifestSource, /tsx tests\/analytics-information-architecture\.test\.ts/);

console.log('PASS analytics information architecture and query boundaries');
