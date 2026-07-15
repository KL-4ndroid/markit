import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

const home = read('app/page.tsx');
const detail = read('app/markets/[id]/page.tsx');
const staffDetail = read('components/markets/StaffMarketDetailView.tsx');
const photoFlow = read('hooks/useSalesPhotoEvidenceFlow.ts');

assert.match(home, /<h1[^>]*>今日<\/h1>/);
assert.match(home, /buildTodayViewModel\(allMarkets, now\)/);
assert.match(home, /isStaff \? '你的今日工作' : '今天的營運重點'/);
assert.match(home, /待補照片 \$\{pendingPhotoItems\.length\} 筆/);
assert.match(home, /\?task=\$\{task\}/);
assert.match(home, /DASHBOARD_ROLE_NOT_READY_OWNER_ID/);
assert.match(home, /ownerId:\s*scopedOwnerId/);
assert.doesNotMatch(home, /useMonthlyStats|本月概覽|currentPlan|showUserMenu|<MarketCard/);
assert.doesNotMatch(home, /confirmDiscardLocalChangesForSignOut|\bsignOut\s*\(/);

assert.match(detail, /useSearchParams\(\)/);
assert.match(detail, /initialView:\s*searchParams\.get\('task'\) === 'pending-photos'/);
assert.match(staffDetail, /initialView:\s*initialPhotoEvidenceView/);
assert.match(photoFlow, /initialView !== 'pending_list'/);
assert.match(photoFlow, /dispatch\(\{ type: 'OPEN_PENDING_LIST' \}\)/);

console.log('PASS role-aware today home and direct task entry');
