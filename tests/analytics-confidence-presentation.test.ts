import assert from 'node:assert/strict';

import { buildAnalyticsConfidencePresentation } from '../lib/analytics/confidence-presentation';
import { analyzeDataCompleteness } from '../lib/analytics/data-completeness';

const emptyCompleteness = analyzeDataCompleteness({});

const insufficient = buildAnalyticsConfidencePresentation({
  validMarketCount: 2,
  dataCompleteness: emptyCompleteness,
});
assert.equal(insufficient.state, 'insufficient');
assert.equal(insufficient.canShowFormalConclusions, false);
assert.equal(insufficient.canShowRankings, false);
assert.equal(insufficient.canShowPreciseComparisons, false);
assert.match(insufficient.missingDataAction, /再完成 1 場/);

const emerging = buildAnalyticsConfidencePresentation({
  validMarketCount: 3,
  dataCompleteness: emptyCompleteness,
});
assert.equal(emerging.state, 'emerging');
assert.equal(emerging.isPreliminary, true);
assert.equal(emerging.canShowFormalConclusions, true);
assert.equal(emerging.canShowPreciseComparisons, false);

const usable = buildAnalyticsConfidencePresentation({
  validMarketCount: 5,
  dataCompleteness: emptyCompleteness,
});
assert.equal(usable.state, 'usable');
assert.equal(usable.canShowPreciseComparisons, true);
assert.match(usable.missingDataAction, /每筆成交金額/);

const strong = buildAnalyticsConfidencePresentation({ validMarketCount: 8 });
assert.equal(strong.state, 'strong');
assert.equal(strong.isPreliminary, false);
assert.equal(strong.canShowRankings, true);

const pendingSync = buildAnalyticsConfidencePresentation({
  validMarketCount: 8,
  hasPendingSync: true,
});
assert.equal(pendingSync.hasPendingSync, true);
assert.match(pendingSync.missingDataAction, /先完成待同步資料/);

console.log('PASS analytics confidence presentation rules');
