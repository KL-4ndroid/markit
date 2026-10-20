import type { AppPlatform } from './contracts';

export type PlatformResource = { platform: AppPlatform; dispose(): Promise<void> };

/** One process lifetime: StrictMode/remounts cannot install duplicate listeners. */
export function createPlatformStartup(dependencies: {
  runtime(): string;
  loadIos(signal: AbortSignal): Promise<PlatformResource>;
  install(platform: AppPlatform): () => void;
  scheduleDeadline?: (callback: () => void, milliseconds: number) => () => void;
}) {
  let start: Promise<void> | undefined;
  return () => start ??= new Promise<void>((resolve, reject) => {
    let runtime: string;
    try { runtime = dependencies.runtime(); } catch { reject(new Error('native_platform_unavailable')); return; }
    if (runtime === 'web') { resolve(); return; }
    if (runtime !== 'ios') { reject(new Error('native_platform_unavailable')); return; }
    const controller = new AbortController();
    let settled = false;
    const schedule = dependencies.scheduleDeadline ?? ((callback, ms) => {
      const timer = setTimeout(callback, ms); return () => clearTimeout(timer);
    });
    let cancel = () => {};
    const fail = () => {
      if (settled) return;
      settled = true; cancel(); controller.abort(); reject(new Error('native_platform_unavailable'));
    };
    cancel = schedule(fail, 15_000);
    void Promise.resolve().then(() => dependencies.loadIos(controller.signal)).then(resource => {
      if (settled) { void resource.dispose().catch(() => {}); return; }
      try {
        dependencies.install(resource.platform);
        settled = true; cancel(); resolve();
      } catch { void resource.dispose().catch(() => {}); fail(); }
    }, fail);
  });
}
