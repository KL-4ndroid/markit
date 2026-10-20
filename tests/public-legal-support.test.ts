import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  buildSupportMailto,
  isValidIsoCalendarDate,
  normalizePublicSupportEmail,
  resolvePublicLegalSupportConfig,
} from '../lib/legal/public-legal-support-config';
import {
  isPathWithinAnyRoute,
  isPathWithinRoute,
  STANDALONE_PUBLIC_ROUTES,
} from '../lib/navigation/public-route';

const validConfig = resolvePublicLegalSupportConfig({
  NEXT_PUBLIC_SUPPORT_EMAIL: 'Support@BoothBook.tw',
  NEXT_PUBLIC_SERVICE_OPERATOR_NAME: 'BoothBook Studio Co., Ltd.',
  NEXT_PUBLIC_SERVICE_OPERATOR_REPRESENTATIVE: 'Launch Reviewer',
  NEXT_PUBLIC_SERVICE_OPERATOR_ADDRESS: '1 Market Road, Taipei City, Taiwan',
  NEXT_PUBLIC_LEGAL_EFFECTIVE_DATE: '2026-08-01',
  LEGAL_POLICY_APPROVED_DATE: '2026-07-31',
});

assert.equal(validConfig.supportEmail, 'support@boothbook.tw');
assert.equal(validConfig.supportContactReady, true);
assert.equal(validConfig.operatorIdentityReady, true);
assert.equal(validConfig.policyPublicationReady, true);

for (const invalidEmail of [
  '',
  'support@example.com',
  'mailto:support@boothbook.tw',
  'BoothBook <support@boothbook.tw>',
  'support@boothbook.tw?subject=test',
  'support @boothbook.tw',
  'support@localhost',
  'support@boothbook.tw\nBcc:attacker@example.net',
]) {
  assert.equal(normalizePublicSupportEmail(invalidEmail), null, `accepted invalid email: ${invalidEmail}`);
}

assert.equal(isValidIsoCalendarDate('2026-02-28'), true);
assert.equal(isValidIsoCalendarDate('2026-02-29'), false);
assert.equal(isValidIsoCalendarDate('2026-13-01'), false);
assert.equal(isValidIsoCalendarDate('2026-7-30'), false);
assert.equal(isValidIsoCalendarDate('development'), false);

assert.equal(
  buildSupportMailto('support@boothbook.tw', '資料與隱私'),
  'mailto:support@boothbook.tw?subject=%5BFeria%20support%5D%20%E8%B3%87%E6%96%99%E8%88%87%E9%9A%B1%E7%A7%81',
);
assert.equal(buildSupportMailto(null, '帳號'), null);

assert.equal(isPathWithinRoute('/support', '/support'), true);
assert.equal(isPathWithinRoute('/support/account', '/support'), true);
assert.equal(isPathWithinRoute('/support-anything', '/support'), false);
assert.equal(isPathWithinAnyRoute('/privacy', STANDALONE_PUBLIC_ROUTES), true);
assert.equal(isPathWithinAnyRoute('/terms-old', STANDALONE_PUBLIC_ROUTES), false);

const root = process.cwd();
const appChrome = readFileSync(join(root, 'components/AppChrome.tsx'), 'utf8');
const supportPage = readFileSync(join(root, 'app/support/page.tsx'), 'utf8');
const termsPage = readFileSync(join(root, 'app/terms/page.tsx'), 'utf8');
const privacyPage = readFileSync(join(root, 'app/privacy/page.tsx'), 'utf8');
const appSettings = readFileSync(join(root, 'app/settings/app/page.tsx'), 'utf8');
const manifest = readFileSync(join(root, 'scripts/test-files.txt'), 'utf8');
const legalReview = readFileSync(join(root, 'docs/WEB_LEGAL_SUPPORT_LAUNCH_REVIEW.md'), 'utf8');

assert.match(appChrome, /isPathWithinAnyRoute/);
for (const publicPath of ['/support', '/privacy', '/terms', '/about']) {
  assert.ok(STANDALONE_PUBLIC_ROUTES.includes(publicPath as typeof STANDALONE_PUBLIC_ROUTES[number]));
}
assert.match(supportPage, /正式支援信箱尚未設定/);
assert.match(supportPage, /請勿傳送密碼、API 金鑰、完整卡號/);
assert.match(termsPage, /目前版本尚未開放真實付款、定期扣款、續訂、取消或退款/);
assert.match(termsPage, /不得視為已完成對外告知|不得以草案自行排除法定權利/);
assert.match(privacyPage, /雲端資料是帳號復原與跨裝置同步的主要可信來源/);
assert.match(privacyPage, /Supabase/);
assert.match(privacyPage, /Vercel/);
assert.match(privacyPage, /Cloudflare R2/);
assert.match(privacyPage, /自成功上傳起保存七日/);
assert.match(appSettings, /href: '\/support'/);
assert.ok(manifest.includes('tsx tests/public-legal-support.test.ts'));
assert.match(legalReview, /LEGAL_POLICY_APPROVED_DATE/);
assert.match(legalReview, /does not\s+replace a signed review artifact/);
assert.match(legalReview, /CSV\/Excel export remains reporting, not backup/);
assert.match(legalReview, /https:\/\/law\.moj\.gov\.tw\/LawClass\/LawAll\.aspx\?pcode=I0050021/);
assert.match(legalReview, /exceptions are not\s+automatic/);

console.log('PASS public legal and support launch contract');
