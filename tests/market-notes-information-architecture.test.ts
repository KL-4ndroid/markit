import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

const decision = read('docs/MARKET_NOTES_INFORMATION_ARCHITECTURE.md');
const marketFormFields = read('components/markets/MarketFormFields.tsx');
const addMarketForm = read('components/markets/AddMarketForm.tsx');
const editMarketForm = read('components/markets/EditMarketForm.tsx');
const marketCard = read('components/markets/MarketCard.tsx');
const referencePanel = read('components/markets/MarketReferenceNotePanel.tsx');
const fieldNotesPanel = read('components/markets/FieldNotesPanel.tsx');
const fieldNotesService = read('lib/markets/field-notes.ts');
const fieldOpsSection = read('components/markets/MarketFieldOpsSection.tsx');
const ownerDetail = read('components/markets/MarketDetailScreen.tsx');
const staffDetail = read('components/markets/StaffMarketDetailView.tsx');
const demo = read('components/demo/FormalDemoApp.tsx');
const manifest = read('scripts/test-files.txt');

console.log('\n=== Market notes information architecture ===');

assert.match(decision, /主辦／場地備註[\s\S]*`market\.notes`/);
assert.match(decision, /現場交接筆記[\s\S]*`field_note_created`/);
assert.match(decision, /There is no automatic copy, merge, promotion, or two-way synchronization/);
assert.match(decision, /No database migration is required/);

assert.match(marketFormFields, /label="主辦／場地備註"/);
assert.match(marketFormFields, /整場市集共用的固定資訊/);
assert.match(marketFormFields, /停車資訊與場地限制/);
assert.match(addMarketForm, /title="主辦／場地備註"/);
assert.match(editMarketForm, /title="主辦／場地備註"/);
assert.match(demo, /title="主辦／場地備註與成交照片"/);
assert.match(marketCard, /DialogTitle[\s\S]*主辦／場地備註/);

assert.match(referencePanel, /interface MarketReferenceNotePanelProps[\s\S]*note\?: string \| null/);
assert.match(referencePanel, /固定資訊/);
assert.match(referencePanel, /尚未填寫主辦／場地備註/);
assert.doesNotMatch(referencePanel, /useLiveQuery|useAuth|useUserRole|supabase|createFieldNote/);
assert.match(fieldOpsSection, /<MarketReferenceNotePanel note=\{referenceNote\}/);
assert.match(ownerDetail, /referenceNote=\{market\.notes\}/);
assert.match(staffDetail, /referenceNote=\{market\.notes\}/);

assert.match(fieldNotesPanel, /現場交接筆記/);
assert.match(fieldNotesPanel, /動態紀錄/);
assert.match(fieldNotesPanel, /不會修改主辦／場地備註/);
assert.match(fieldNotesPanel, /新增交接筆記/);
assert.match(fieldNotesPanel, /尚無現場交接筆記/);
assert.match(fieldNotesPanel, /note\.updatedAt === note\.createdAt \? '新增' : '更新'/);
assert.match(fieldNotesService, /field_note_created/);
assert.match(fieldNotesService, /field_note_updated/);
assert.match(fieldNotesService, /field_note_deleted/);
assert.doesNotMatch(fieldNotesService, /market\.notes|updateMarket|market_updated/);
assert.doesNotMatch(fieldNotesPanel, /market\.notes|updateMarket|market_updated/);

assert.match(manifest, /tsx tests\/market-notes-information-architecture\.test\.ts/);

console.log('PASS fixed market reference and chronological handoff notes remain distinct');
