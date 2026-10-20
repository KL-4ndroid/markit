import assert from 'node:assert/strict';
import { scheduleFormDraftSave } from '../lib/form-draft-scheduler';
import type { AppLifecycleState, LifecyclePort } from '../lib/platform/contracts/lifecycle';

function fixture(initial: AppLifecycleState = 'active') {
  let state = initial;
  const listeners = new Set<(state: AppLifecycleState) => void>();
  const timers = new Set<() => void>();
  const lifecycle: LifecyclePort = {
    getCurrentState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
  return {
    lifecycle,
    timers,
    listeners,
    schedule(callback: () => void, delayMs: number) {
      assert.equal(delayMs, 750);
      timers.add(callback);
      return () => { timers.delete(callback); };
    },
    move(next: AppLifecycleState) {
      state = next;
      for (const listener of listeners) listener(state);
    },
    tick() {
      for (const callback of [...timers]) callback();
    },
  };
}

// A background event must save input before the debounce expires, exactly once.
{
  const f = fixture();
  const saved: string[] = [];
  const stop = scheduleFormDraftSave(() => saved.push('latest draft'), f.lifecycle, 750, f.schedule);
  assert.deepEqual(saved, []);
  f.move('background');
  assert.deepEqual(saved, ['latest draft']);
  f.tick();
  f.move('active');
  f.move('background');
  assert.deepEqual(saved, ['latest draft']);
  stop();
  assert.equal(f.listeners.size, 0);
}

// Active editing retains debounce; replacing a draft cancels the stale snapshot.
{
  const f = fixture();
  const saved: string[] = [];
  const old = scheduleFormDraftSave(() => saved.push('old account/draft'), f.lifecycle, 750, f.schedule);
  old();
  const current = scheduleFormDraftSave(() => saved.push('current draft'), f.lifecycle, 750, f.schedule);
  assert.equal(f.timers.size, 1);
  f.tick();
  assert.deepEqual(saved, ['current draft']);
  f.move('background');
  assert.deepEqual(saved, ['current draft']);
  current();
  assert.equal(f.timers.size, 0);
}

// Changes observed while already backgrounded must not rely on suspended timers.
{
  const f = fixture('background');
  let saves = 0;
  const stop = scheduleFormDraftSave(() => { saves += 1; }, f.lifecycle, 750, f.schedule);
  assert.equal(saves, 1);
  assert.equal(f.timers.size, 0);
  stop();
}

// Closing/unmounting must release listeners and cancel future writes.
{
  const f = fixture();
  let saves = 0;
  const stop = scheduleFormDraftSave(() => { saves += 1; }, f.lifecycle, 750, f.schedule);
  stop();
  f.tick();
  f.move('background');
  assert.equal(saves, 0);
  assert.equal(f.listeners.size, 0);
}

console.log('PASS form drafts flush on background without stale or duplicate writes');
