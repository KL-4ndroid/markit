import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  PLAN_PREVIEWS,
  SUBSCRIPTION_PRESENTATION,
} from '../lib/subscription/subscription-presentation';

const root = join(__dirname, '..');
const subscriptionPage = readFileSync(join(root, 'app/subscription/page.tsx'), 'utf8');
const accountPanel = readFileSync(join(root, 'components/settings/AccountSyncPanel.tsx'), 'utf8');

assert.equal(SUBSCRIPTION_PRESENTATION.availability, 'preview');
assert.equal(SUBSCRIPTION_PRESENTATION.actionLabel, '尚未開放');
assert.equal(PLAN_PREVIEWS.length, 3);
assert.match(SUBSCRIPTION_PRESENTATION.notice, /帳號角色與團隊權限/);

assert.match(subscriptionPage, /SUBSCRIPTION_PRESENTATION\.notice/);
assert.doesNotMatch(subscriptionPage, /currentPlan|showCancelDialog|handleCancelSubscription/);
assert.doesNotMatch(subscriptionPage, /CreditCard|next charge|取消訂閱|付款成功/);
assert.match(accountPanel, /SUBSCRIPTION_PRESENTATION\.accountLabel/);
assert.doesNotMatch(accountPanel, />免費版</);

console.log('PASS subscription capability preview truthfulness');
