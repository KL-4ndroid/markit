import type { AppLifecycleState, LifecyclePort } from '@/lib/platform/contracts/lifecycle';

function currentWebLifecycleState(): AppLifecycleState {
  if (typeof document === 'undefined') return 'active';
  return document.visibilityState === 'hidden' ? 'background' : 'active';
}

export const webLifecycle: LifecyclePort = Object.freeze({
  getCurrentState: currentWebLifecycleState,

  subscribe(listener: (state: AppLifecycleState) => void) {
    if (typeof document === 'undefined') return () => undefined;
    const handleVisibilityChange = () => listener(currentWebLifecycleState());
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  },
});
