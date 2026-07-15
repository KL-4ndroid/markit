import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const addForm = readFileSync(join(root, 'components/markets/AddMarketForm.tsx'), 'utf8');
const editForm = readFileSync(join(root, 'components/markets/EditMarketForm.tsx'), 'utf8');
const sharedFields = readFileSync(join(root, 'components/markets/MarketFormFields.tsx'), 'utf8');
const fullScreenForm = readFileSync(join(root, 'components/ui/FullScreenForm.tsx'), 'utf8');
const timePicker = readFileSync(join(root, 'components/ui/TimePicker.tsx'), 'utf8');
const ownerDetail = readFileSync(join(root, 'app/markets/[id]/page.tsx'), 'utf8');
const staffDetail = readFileSync(join(root, 'components/markets/StaffMarketDetailView.tsx'), 'utf8');

for (const source of [addForm, editForm]) {
  assert.match(source, /<FullScreenForm/);
  assert.match(source, /<MarketBasicFields/);
  assert.match(source, /validateMarketCoreForm\(/);
  assert.match(source, /getFirstMarketCoreError\(/);
  assert.match(source, /\.focus\(\)/);
  assert.match(source, /title="時間軸"/);
  assert.match(source, /title="備註"/);
  assert.doesNotMatch(source, /\b(?:window\.)?alert\s*\(|\bwindow\.confirm\s*\(/);
}

assert.match(addForm, /title="成本與抽成"/);
assert.match(addForm, /title="設備"/);
assert.match(editForm, /!isManagerMode &&[\s\S]*?title="成本與抽成"/);
assert.match(sharedFields, /label="市集名稱"/);
assert.match(sharedFields, /label="市集日期"/);
assert.match(sharedFields, /mode\?: 'owner' \| 'manager'/);

assert.match(fullScreenForm, /h-\[100dvh\]/);
assert.match(fullScreenForm, /sm:max-w-2xl/);
assert.match(fullScreenForm, /env\(safe-area-inset-bottom\)/);

assert.match(timePicker, /const onChangeRef = useRef\(onChange\)/);
assert.match(timePicker, /onChangeRef\.current\(newValue\)/);
assert.match(timePicker, /\}, \[\]\);/);

assert.match(ownerDetail, /const EditMarketForm = dynamic\(/);
assert.match(ownerDetail, /market && showEditForm &&/);
assert.match(staffDetail, /const EditMarketForm = dynamic\(/);
assert.match(staffDetail, /showEditMarketForm &&/);

console.log('PASS progressive market form UI and lazy-loading guardrails');
