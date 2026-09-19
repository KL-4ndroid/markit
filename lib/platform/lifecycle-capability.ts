import type { LifecyclePort } from '@/lib/platform/contracts/lifecycle';
import { webLifecycle } from '@/lib/platform/web/lifecycle';

let activeLifecyclePort: LifecyclePort = webLifecycle;

export function getLifecyclePort(): LifecyclePort {
  return activeLifecyclePort;
}

export function installLifecyclePort(lifecyclePort: LifecyclePort): () => void {
  const previousLifecyclePort = activeLifecyclePort;
  activeLifecyclePort = lifecyclePort;
  return () => {
    if (activeLifecyclePort === lifecyclePort) activeLifecyclePort = previousLifecyclePort;
  };
}
