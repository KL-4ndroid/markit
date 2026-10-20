import type { LifecyclePort } from '@/lib/platform/contracts/lifecycle';

type Schedule = (callback: () => void, delayMs: number) => () => void;

const scheduleTimeout: Schedule = (callback, delayMs) => {
  const timer = setTimeout(callback, delayMs);
  return () => clearTimeout(timer);
};

/** Debounce active edits, but flush pending input before background suspension. */
export function scheduleFormDraftSave(
  save: () => void,
  lifecycle: LifecyclePort,
  delayMs = 750,
  schedule: Schedule = scheduleTimeout,
): () => void {
  let pending = true;
  let cancelTimer = () => {};
  const flush = () => {
    if (!pending) return;
    pending = false;
    cancelTimer();
    save();
  };
  const unsubscribe = lifecycle.subscribe(state => {
    if (state === 'background') flush();
  });
  if (lifecycle.getCurrentState() === 'background') flush();
  if (pending) cancelTimer = schedule(flush, delayMs);

  return () => {
    pending = false;
    cancelTimer();
    unsubscribe();
  };
}
