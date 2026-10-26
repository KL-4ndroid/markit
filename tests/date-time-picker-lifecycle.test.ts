import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

function fixture() {
  const nodes: any[] = [];
  const listeners = new Map<string, Set<Function>>();
  const timers = new Map<number, () => void>();
  let nextTimer = 0;
  const document = {
    createElement() { return { style: {}, className: '', setAttribute() {}, addEventListener() {}, contains(target: unknown) { return target === this; }, remove() { const i = nodes.indexOf(this); if (i >= 0) nodes.splice(i, 1); } }; },
    body: { appendChild(node: any) { nodes.push(node); } },
    querySelectorAll(selector: string) { return nodes.filter(node => `.${node.className}` === selector); },
    addEventListener(type: string, callback: Function) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type)!.add(callback); },
    removeEventListener(type: string, callback: Function) { listeners.get(type)?.delete(callback); },
  };
  const sandbox = { module: { exports: {} }, document, Date,
    setTimeout(callback: () => void) { const id = ++nextTimer; timers.set(id, callback); return id; },
    clearTimeout(id: number) { timers.delete(id); },
  };
  vm.runInNewContext(readFileSync(join(__dirname, '../lib/date-time-picker/DateTimePicker.js'), 'utf8'), sandbox);
  const Picker = sandbox.module.exports as any;
  function create() {
    const input = { value: '', disabled: false, style: {}, setAttribute() {}, addEventListener() {}, removeEventListener() {} };
    const picker = new Picker({ type: 'time', input });
    picker.render = () => {};
    return picker;
  }
  function flush() { for (const [id, callback] of [...timers]) { timers.delete(id); callback(); } }
  return { create, nodes, timers, listeners, flush };
}

{
  const f = fixture(); const inactive = f.create(); const active = f.create();
  active.open(); const panel = active.picker;
  inactive.destroy();
  assert.equal(f.nodes.length, 2, 'destroying an inactive picker must not remove the active picker');
  assert.ok(f.nodes.includes(panel));
  assert.equal(active.isOpen, true);
  active.destroy(); f.flush();
  assert.equal(f.nodes.length, 0);
  assert.equal(f.listeners.get('click')?.size ?? 0, 0, 'destroy cancels delayed listener registration');
}
{
  const f = fixture(); const a = f.create(); const b = f.create();
  a.open(); b.open();
  assert.equal(a.isOpen, false, 'opening another picker must close the previous instance state');
  assert.equal(b.isOpen, true);
  a.open();
  assert.equal(a.isOpen, true, 'a previously replaced picker must reopen');
  assert.equal(b.isOpen, false);
  f.flush();
  assert.equal(f.nodes.length, 2, 'old close timers must not remove the reopened picker');
  a.destroy(); b.destroy();
}
{
  const f = fixture(); const a = f.create();
  a.open(); a.close(); a.open(); f.flush();
  assert.equal(a.isOpen, true);
  assert.equal(f.nodes.length, 2, 'rapid close/reopen must retain only the current panel');
  assert.equal(f.listeners.get('click')?.size ?? 0, 1);
  a.destroy(); a.open(); f.flush();
  assert.equal(f.nodes.length, 0, 'destroyed instances must not reopen or leak delayed work');
}
{
  const f = fixture(); const a = f.create(); a.input.disabled = true; a.open();
  assert.equal(f.nodes.length, 0, 'disabled inputs cannot open a picker');
}
{
  const f = fixture(); const picker = f.create();
  const list = (itemTop: number) => ({
    scrollTop: 0, clientHeight: 220, scrollHeight: 600,
    getBoundingClientRect: () => ({ top: 100 }),
    querySelector: () => ({ getBoundingClientRect: () => ({ top: itemTop, height: 44 }) }),
  });
  const hour = list(108); const minute = list(700);
  picker.picker = {
    innerHTML: '',
    querySelectorAll: () => [],
    querySelector: (selector: string) => selector === '[data-type="hour"]' ? hour : selector === '[data-type="minute"]' ? minute : null,
    remove() {}, style: {},
  };
  picker.isOpen = true;
  picker.renderTimePicker(); f.flush();
  assert.equal(hour.scrollTop, 0, 'the first hour remains fully visible despite panel offsets');
  assert.equal(minute.scrollTop, 380, 'scrolling is clamped to the actual list extent');
  picker.renderTimePicker(); picker.destroy(); f.flush();
  assert.equal(f.timers.size, 0, 'destroy also cancels pending time-list scrolling');
}
console.log('PASS picker ownership, replacement, rapid reopen, delayed cleanup, disabled state and scroll bounds');
