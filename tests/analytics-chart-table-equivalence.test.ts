import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const chartSource = readFileSync(join(root, 'components/analytics/DailyRevenueChart.tsx'), 'utf8');
const manifestSource = readFileSync(join(root, 'scripts/test-files.txt'), 'utf8');

assert.match(chartSource, /chartData\.map\(\(data, index\)/);
assert.match(chartSource, /<table/);
assert.match(chartSource, /每日收入趨勢的表格資料/);
assert.match(chartSource, /chartData\.map\(\(data\) =>/);
assert.match(chartSource, /data\.date/);
assert.match(chartSource, /data\.revenue/);
assert.match(chartSource, /<th scope="col"/);
assert.match(chartSource, /<th scope="row"/);
assert.match(manifestSource, /tsx tests\/analytics-chart-table-equivalence\.test\.ts/);

console.log('PASS analytics chart and table use the same data source');
