import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const form = fs.readFileSync(path.join(root, 'components/recurring-operations/FixedScheduleForm.tsx'), 'utf8');
const shell = fs.readFileSync(path.join(root, 'components/ui/FullScreenForm.tsx'), 'utf8');

assert.match(shell, /h-\[100dvh\]/);
assert.match(shell, /overflow-y-auto/);
assert.match(shell, /safe-area-inset-bottom/);
assert.match(form, /grid grid-cols-7 gap-2/);
assert.match(form, /min-h-11/);
assert.match(form, /grid gap-4 sm:grid-cols-2/);
assert.match(form, /FormSectionDisclosure title="更多預設"/);
assert.match(form, /import \{ DatePicker \} from '@\/components\/ui\/DatePicker';/);
assert.equal((form.match(/<DatePicker/g) ?? []).length, 2);
assert.match(form, /<DatePicker \{\.\.\.props\} minDate=\{today\} value=\{startDate\}/);
assert.match(form, /<DatePicker \{\.\.\.props\} minDate=\{startDate\} value=\{endDate\}/);
assert.doesNotMatch(form, /type="date"/);
const requiredSection = form.slice(
  form.indexOf('<section className="japanese-surface-card'),
  form.indexOf('</section>') + '</section>'.length,
);
assert.doesNotMatch(requiredSection, /報名費|攤位費|保證金|租金|抽成/);

console.log('recurring operations mobile form tests passed');
