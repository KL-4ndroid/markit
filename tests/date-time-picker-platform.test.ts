import assert from 'node:assert/strict';
import { webDateTimePicker } from '../lib/platform/web/date-time-picker';

// Exercise the real adapter + legacy renderer; no user/browser data is accessed.
async function main() {
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const nodes: ReturnType<typeof element>[] = [];
  const links: ReturnType<typeof element>[] = [];
  function element() {
    return {
      style: {}, className: '', innerHTML: '', value: '', disabled: false,
      setAttribute() {}, addEventListener() {}, removeEventListener() {},
      querySelector() { return null; }, querySelectorAll() { return []; },
      remove() { const index = nodes.indexOf(this); if (index >= 0) nodes.splice(index, 1); },
    };
  }
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {
    createElement: element,
    querySelector: () => links[0] ?? null,
    head: { appendChild: (node: ReturnType<typeof element>) => links.push(node) },
    body: { appendChild: (node: ReturnType<typeof element>) => nodes.push(node) },
    addEventListener() {}, removeEventListener() {},
  } });
  const handles: { destroy(): void }[] = [];
  try {
    const input = element();
    const time = await webDateTimePicker.attach(input, { type: 'time', value: '10:25', onChange() {} });
    handles.push(time);
    time.update({ value: '13:47' });
    time.open();
    assert.equal(input.value, '13:47');
    assert.match(nodes.at(-1)!.innerHTML, /selected" data-value="13"/);
    assert.match(nodes.at(-1)!.innerHTML, /selected" data-value="47"/);
    time.update({ value: '', disabled: true });
    assert.equal(input.value, '');
    time.destroy(); time.open();
    assert.equal(nodes.length, 0);

    const date = await webDateTimePicker.attach(element(), { type: 'date', value: '2026-10-26', onChange() {} });
    handles.push(date);
    date.update({ value: '2026-11-07', minDate: '2026-11-05', maxDate: '2026-11-10' });
    date.open();
    assert.match(nodes.at(-1)!.innerHTML, /2026 年 11 月/);
    assert.match(nodes.at(-1)!.innerHTML, /class="datetime-picker-day selected" data-date="2026-11-07"/);
    assert.match(nodes.at(-1)!.innerHTML, /disabled[^"\n]*" data-date="2026-11-04"/);
    date.destroy();

    const multiInput = element();
    const multi = await webDateTimePicker.attach(multiInput, {
      type: 'date', mode: 'multiple', value: ['2026-10-26', '2026-10-28'], onChange() {},
    });
    handles.push(multi);
    multi.open();
    assert.match(nodes.at(-1)!.innerHTML, /已選擇 <strong>2<\/strong> 天/);
    const panel = nodes.at(-1);
    multi.update({ value: ['2026-10-26', '2026-10-28'] });
    assert.equal(nodes.at(-1), panel, 'equal controlled arrays do not replace the panel');
    multi.update({ value: [] });
    assert.equal(multiInput.value, '');
    assert.match(nodes.at(-1)!.innerHTML, /已選擇 <strong>0<\/strong> 天/);
    assert.equal(links.length, 1, 'the shared stylesheet is installed once');
  } finally {
    handles.forEach(handle => handle.destroy());
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument);
    else Reflect.deleteProperty(globalThis, 'document');
  }
  console.log('PASS picker adapter external values, bounds, disabled state, multi-date reset and shared CSS');
}
void main();
