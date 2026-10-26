import test from 'node:test';
import assert from 'node:assert/strict';
import { extractSource, extractHtml, isDemoPath, isTestSurface } from '../scripts/lib/ui-copy-inventory.mjs';

const scan = source => extractSource('components/Example.tsx', source).records;
test('captures visible text, literal and dynamic field hints, and accessible names', () => {
  const records = scan(`function View(){return <><button aria-label="關閉視窗">關閉</button><input placeholder="例如：台南"/><Card description={hint}/><p>待繳費 {count} 場</p></>;}`);
  assert.ok(records.some(r => r.text === '關閉視窗' && r.kind === '輔助辨識'));
  assert.ok(records.some(r => r.text === '例如：台南' && r.kind === '輸入提示'));
  assert.ok(records.some(r => r.binding === 'hint'));
  assert.ok(records.some(r => r.text === '待繳費 ${count} 場' && r.assembled));
});
test('does not confuse branch comparisons, CSS attributes or handler tokens with visible labels', () => {
  const records = scan(`const View=()=> <>{tab === 'regions' && <Button variant="inverse" onClick={()=>setTab('summary')}>{busy ? 'Saving…' : '儲存'}</Button>}</>;`);
  assert.ok(records.some(r => r.text === 'Saving…' && r.kind === '畫面文字'));
  assert.ok(records.some(r => r.text === '儲存' && r.condition.includes('busy')));
  assert.ok(!records.some(r => ['regions','inverse','summary'].includes(r.text)));
});
test('captures toast sources and bindings, but excludes logs, comments, types and state enums', () => {
  const records = scan(`type Mode='未完成'; // 不得當成提示
    function save(){console.error('僅記錄日誌'); toast.error(error.message); toast.success('已保存');setStatus('busy');setError('網路中斷');throw new Error('CASH_CONFLICT');}`);
  assert.ok(records.some(r => r.binding === 'error.message'));
  assert.ok(records.some(r => r.text === '已保存' && r.kind === '確認／通知'));
  assert.ok(records.some(r => r.text === '網路中斷' && r.kind === '狀態設定'));
  assert.ok(records.some(r => r.text === 'CASH_CONFLICT' && r.kind === '內部狀態／錯誤碼'));
  assert.ok(!records.some(r => ['未完成','僅記錄日誌','busy'].includes(r.text)));
});
test('dynamic row lists are traversed, not misreported as giant message templates', () => {
  const records = scan(`function View(){return <section>{items.map(item=><p>{item.status}<span>可查看</span></p>)}</section>;}`);
  assert.ok(records.some(r => r.text === '可查看'));
  assert.ok(records.some(r => r.binding === 'item.status'));
  assert.ok(!records.some(r => r.text.includes('items.map')));
});
test('retains original escaped text and accurate source positions', () => {
  const records = scan(`\nfunction run(){\n toast.error('第一行\\n第二行');\n}`);
  const row = records.find(r => r.kind === '確認／通知');
  assert.equal(row.line, 3);
  assert.equal(row.column, 14);
  assert.equal(row.rawText, '第一行\n第二行');
  assert.equal(row.sourceText, "'第一行\\n第二行'");
});
test('keeps English plan names, financial abbreviations and shared message prose discoverable', () => {
  const records = scan(`const plan={name:'Pro',label:'ROI'}; function fallback(){return 'Please try again';} function View(){return <p>{plan.name}</p>}`);
  assert.ok(records.some(r => r.text === 'Pro' && r.kind === '共用文案值'));
  assert.ok(records.some(r => r.text === 'ROI' && r.kind === '共用文案值'));
  assert.ok(records.some(r => r.text === 'Please try again' && r.kind === '來源候選'));
  assert.ok(records.some(r => r.binding === 'plan.name'));
});
test('demo exclusion and test-only paths do not swallow shared recovery infrastructure', () => {
  assert.equal(isDemoPath('components/demo/FormalDemoApp.tsx'), true);
  assert.equal(isDemoPath('lib/formal-demo-data.ts'), true);
  assert.equal(isDemoPath('app/markets/page.tsx'), false);
  assert.equal(isTestSurface('app/recovery/page.tsx'), true);
  assert.equal(isTestSurface('app/settings/data/page.tsx'), true);
  assert.equal(isTestSurface('lib/recovery/preview.ts'), false);
});
test('standalone HTML includes page labels and inline script messages, excluding style and console text', () => {
  const records = extractHtml('public/offline.html', `<!doctype html><html><style>/* 不是提示 */</style><body><h1>離線 &amp; 重試</h1><input placeholder="輸入姓名"><script>console.log('內部日誌');function run(){alert('請重新連線');log('已完成檢查');}</script></body></html>`).records;
  assert.ok(records.some(r => r.text === '離線 & 重試'));
  assert.ok(records.some(r => r.text === '輸入姓名'));
  assert.ok(records.some(r => r.text === '請重新連線'));
  assert.ok(records.some(r => r.text === '已完成檢查'));
  assert.ok(!records.some(r => /不是提示|內部日誌/.test(r.text)));
});
test('legacy DOM templates expose individual labels and accurate offsets', () => {
  const source = `function calendar(){return \`<button aria-label="上個月">確認日期</button>\`;}`;
  const records = scan(source);
  const row = records.find(r => r.text === '確認日期');
  assert.equal(row.kind, 'HTML 範本文字');
  assert.equal(source.slice(row.start, row.end), '確認日期');
});
test('DOM status writes distinguish displayed values from lookup keys and dynamic payloads', () => {
  const records = scan(`function run(){document.getElementById('db-status').textContent='✅ 正常';status.innerText=message;}`);
  assert.ok(records.some(r => r.text === '✅ 正常' && r.kind === 'DOM 訊息文字'));
  assert.ok(records.some(r => r.binding === 'message'));
  assert.ok(!records.some(r => r.text === 'db-status'));
});
