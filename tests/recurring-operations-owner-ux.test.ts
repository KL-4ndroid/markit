import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const choice = fs.readFileSync(path.join(root, 'components/recurring-operations/AddOperationDialog.tsx'), 'utf8');
const form = fs.readFileSync(path.join(root, 'components/recurring-operations/FixedScheduleForm.tsx'), 'utf8');
const page = fs.readFileSync(path.join(root, 'app/markets/schedules/page.tsx'), 'utf8');
const markets = fs.readFileSync(path.join(root, 'app/markets/page.tsx'), 'utf8');

assert.match(choice, /title="新增營業"/);
assert.match(choice, />單次營業</);
assert.match(choice, /適合市集、快閃或臨時活動/);
assert.match(choice, />每週固定</);
assert.match(choice, /設定常用地點、星期與時間/);
assert.match(choice, /管理固定安排/);

for (const label of ['營業據點名稱', '地址', '每週星期', '開始時間', '結束時間', '起始日期', '結束日期']) {
  assert.match(form, new RegExp(label));
}
assert.match(form, /FormSectionDisclosure title="更多預設"/);
assert.ok(form.indexOf('固定營業資訊') < form.indexOf('更多預設'));
assert.match(form, /roleRefreshState\.stage !== 'ready' \|\| !isOwner/);

assert.match(page, /title="固定安排"/);
assert.match(page, /正在載入固定安排/);
assert.match(page, /固定安排暫時無法載入/);
assert.match(page, /還沒有固定安排/);
assert.match(page, /pauseOperationSchedule/);
assert.match(page, /resumeOperationSchedule/);
assert.match(page, /archiveOperationSchedule/);
assert.match(markets, /label="新增營業"/);
assert.match(markets, /onSingle=\{handleSelectSingle\}/);
assert.match(markets, /onWeekly=\{handleSelectWeekly\}/);

console.log('recurring operations owner UX tests passed');
