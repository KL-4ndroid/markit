import type { LifecyclePort, AppLifecycleState } from '@/lib/platform/contracts/lifecycle';
import type { NetworkPort, NetworkStatus } from '@/lib/platform/contracts/network';

export type NativeListenerHandle = { remove(): Promise<void> };
export type NativeRuntimeDependencies = {
  app: {
    getState(): Promise<unknown>;
    addListener(event: 'appStateChange', listener: (value: unknown) => void): Promise<NativeListenerHandle>;
  };
  network: {
    getStatus(): Promise<unknown>;
    addListener(event: 'networkStatusChange', listener: (value: unknown) => void): Promise<NativeListenerHandle>;
  };
};

type ScheduleDeadline = (callback: () => void, milliseconds: number) => () => void;
export type NativeRuntimeOptions = { timeoutMs?: number; scheduleDeadline?: ScheduleDeadline };
export type NativeRuntimePorts = {
  network: NetworkPort;
  lifecycle: LifecyclePort;
  ready: Promise<void>;
  dispose(): Promise<void>;
};

const offline: NetworkStatus = Object.freeze({ connected: false, connectionType: 'unknown' });

function normalizeNetwork(raw: unknown): NetworkStatus {
  if (!raw || typeof raw !== 'object') return offline;
  const value = raw as Record<string, unknown>;
  const kind = value.connectionType;
  if (typeof value.connected !== 'boolean' || typeof kind !== 'string'
    || !['wifi', 'cellular', 'none', 'unknown'].includes(kind)) return offline;
  if (!value.connected) return Object.freeze({ connected: false, connectionType: 'none' });
  if (kind === 'none') return offline;
  return Object.freeze({ connected: true, connectionType: kind as NetworkStatus['connectionType'] });
}

function normalizeLifecycle(raw: unknown): AppLifecycleState {
  return raw && typeof raw === 'object' && (raw as { isActive?: unknown }).isActive === true
    ? 'active' : 'background';
}

function stateChannel<T>(fallback: T, normalize: (raw: unknown) => T) {
  let value = fallback;
  let revision = 0;
  let closed = false;
  const listeners = new Set<(value: T) => void>();
  const publish = (next: T) => {
    value = next;
    for (const listener of [...listeners]) {
      // One observer must not prevent background/connection delivery to the others.
      try { listener(value); } catch { /* Observer owns its error handling. */ }
    }
  };
  return {
    get: () => value,
    revision: () => revision,
    event(raw: unknown) {
      if (closed) return;
      revision += 1;
      publish(normalize(raw));
    },
    snapshot(raw: unknown, expectedRevision: number) {
      if (!closed && revision === expectedRevision) publish(normalize(raw));
    },
    subscribe(listener: (value: T) => void) {
      if (closed) return () => {};
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    close() {
      if (closed) return;
      closed = true;
      publish(fallback);
      listeners.clear();
    },
  };
}

const scheduleTimeout: ScheduleDeadline = (callback, milliseconds) => {
  const timer = setTimeout(callback, milliseconds);
  return () => clearTimeout(timer);
};

/** Source adapter factory; constructing it does not install or activate a platform. */
export function createNativeRuntimePorts(
  dependencies: NativeRuntimeDependencies,
  options: NativeRuntimeOptions = {},
): NativeRuntimePorts {
  const timeoutMs = options.timeoutMs ?? 5_000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000) {
    throw new Error('native_runtime_timeout_invalid');
  }
  const network = stateChannel(offline, normalizeNetwork);
  const lifecycle = stateChannel<AppLifecycleState>('background', normalizeLifecycle);
  const handles = new Set<NativeListenerHandle>();
  const pendingRemovals = new Set<Promise<void>>();
  let disposed = false;
  let settled = false;
  let cleanupFailed = false;
  let cancelDeadline = () => {};
  let resolveReady!: () => void;
  let rejectReady!: (error: Error) => void;
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  const remove = (handle: NativeListenerHandle) => {
    handles.delete(handle);
    const removal = Promise.resolve().then(() => handle.remove())
      .catch(() => { cleanupFailed = true; })
      .finally(() => { pendingRemovals.delete(removal); });
    pendingRemovals.add(removal);
    return removal;
  };
  const dispose = async () => {
    if (!disposed) {
      disposed = true;
      cancelDeadline();
      network.close();
      lifecycle.close();
      if (!settled) {
        settled = true;
        rejectReady(new Error('native_runtime_disposed'));
      }
    }
    await Promise.all([...handles].map(remove));
    await Promise.all([...pendingRemovals]);
    if (cleanupFailed) throw new Error('native_runtime_cleanup_failed');
  };
  const fail = (code: 'native_runtime_initialization_failed' | 'native_runtime_initialization_timeout') => {
    if (settled) return;
    settled = true;
    rejectReady(new Error(code));
    // A broken cleanup bridge cannot prevent readiness failure from being delivered.
    void dispose().catch(() => {});
  };
  async function initialize<T>(
    channel: ReturnType<typeof stateChannel<T>>,
    subscribe: (listener: (raw: unknown) => void) => Promise<NativeListenerHandle>,
    read: () => Promise<unknown>,
  ) {
    const revision = channel.revision();
    const handle = await subscribe(raw => { if (!disposed) channel.event(raw); });
    if (disposed) {
      await remove(handle);
      return;
    }
    handles.add(handle);
    const snapshot = await read();
    if (!disposed) channel.snapshot(snapshot, revision);
  }
  const initialization = Promise.all([
    initialize(network, listener => dependencies.network.addListener('networkStatusChange', listener),
      () => dependencies.network.getStatus()),
    initialize(lifecycle, listener => dependencies.app.addListener('appStateChange', listener),
      () => dependencies.app.getState()),
  ]);
  void initialization.then(() => {
    if (settled) return;
    settled = true;
    cancelDeadline();
    resolveReady();
  }).catch(() => fail('native_runtime_initialization_failed'));
  cancelDeadline = (options.scheduleDeadline ?? scheduleTimeout)(
    () => fail('native_runtime_initialization_timeout'), timeoutMs,
  );

  return {
    network: {
      getCurrentStatus: () => ({ ...network.get() }),
      subscribe: network.subscribe,
    },
    lifecycle: { getCurrentState: lifecycle.get, subscribe: lifecycle.subscribe },
    ready,
    dispose,
  };
}
