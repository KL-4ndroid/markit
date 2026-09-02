import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const marketPage = fs.readFileSync(path.join(root, 'app/markets/page.tsx'), 'utf8');
const schedulesPage = fs.readFileSync(path.join(root, 'app/markets/schedules/page.tsx'), 'utf8');
const fixedForm = fs.readFileSync(path.join(root, 'components/recurring-operations/FixedScheduleForm.tsx'), 'utf8');
const singleForm = fs.readFileSync(path.join(root, 'components/markets/AddMarketForm.tsx'), 'utf8');

assert.match(marketPage, /action=!isStaffMode|action=\{!isStaffMode/);
assert.match(schedulesPage, /const canManage = roleRefreshState\.stage === 'ready' && isOwner/);
assert.match(schedulesPage, /if \(!canManage\)/);
assert.match(schedulesPage, /此頁僅限老闆使用/);
assert.match(fixedForm, /if \(roleRefreshState\.stage !== 'ready' \|\| !isOwner\) return null/);
assert.match(fixedForm, /權限狀態已變更/);

// The legacy single-market form remains independent and keeps its existing core validation.
assert.match(singleForm, /validateMarketCoreForm\(formData\)/);
assert.doesNotMatch(singleForm, /recurring-operations|每週固定|venueId|scheduleId/);

console.log('recurring operations role boundary tests passed');
