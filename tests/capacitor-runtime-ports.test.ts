import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createNativeRuntimePorts, type NativeRuntimeDependencies, type NativeListenerHandle,
} from '../lib/platform/capacitor/runtime-ports';
import { loadCapacitorRuntimePorts } from '../lib/platform/capacitor/load-runtime-ports';
import { getNetworkPort, installNetworkPort } from '../lib/platform/network-capability';
import { getLifecyclePort, installLifecyclePort } from '../lib/platform/lifecycle-capability';
import { getAppPlatform } from '../lib/platform/platform';
import { scheduleFormDraftSave } from '../lib/form-draft-scheduler';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const tick = async () => { for (let i = 0; i < 12; i += 1) await Promise.resolve(); };

function fixture() {
  let networkListener: ((value: unknown) => void) | undefined;
  let appListener: ((value: unknown) => void) | undefined;
  const removals = { network: 0, app: 0 };
  const networkHandle = { async remove() { removals.network += 1; } };
  const appHandle = { async remove() { removals.app += 1; } };
  const dependencies: NativeRuntimeDependencies = {
    network: {
      getStatus: async () => ({ connected: true, connectionType: 'wifi' }),
      async addListener(event, listener) {
        assert.equal(event, 'networkStatusChange');
        networkListener = listener;
        return networkHandle;
      },
    },
    app: {
      getState: async () => ({ isActive: true }),
      async addListener(event, listener) {
        assert.equal(event, 'appStateChange');
        appListener = listener;
        return appHandle;
      },
    },
  };
  let deadline: (() => void) | undefined;
  return {
    dependencies, removals, networkHandle, appHandle,
    emitNetwork: (raw: unknown) => networkListener?.(raw),
    emitApp: (raw: unknown) => appListener?.(raw),
    options: {
      scheduleDeadline(callback: () => void, timeout: number) {
        assert.equal(timeout, 5_000);
        deadline = callback;
        return () => { deadline = undefined; };
      },
    },
    fireTimeout() { assert.ok(deadline); deadline(); },
    deadlinePending: () => Boolean(deadline),
  };
}

async function main() {
  // The same ports used by sync and autosave can receive native events, without
  // activating an incomplete native AppPlatform or changing Web defaults.
  {
    const f = fixture();
    const runtime = createNativeRuntimePorts(f.dependencies, f.options);
    assert.deepEqual(runtime.network.getCurrentStatus(), { connected: false, connectionType: 'unknown' });
    assert.equal(runtime.lifecycle.getCurrentState(), 'background');
    await runtime.ready;
    assert.equal(f.deadlinePending(), false);
    const snapshot = runtime.network.getCurrentStatus();
    snapshot.connected = false;
    assert.equal(runtime.network.getCurrentStatus().connected, true);
    const restoreNetwork = installNetworkPort(runtime.network);
    const restoreLifecycle = installLifecyclePort(runtime.lifecycle);
    let saved = 0;
    const stopDraft = scheduleFormDraftSave(() => { saved += 1; }, getLifecyclePort());
    try {
      assert.equal(getNetworkPort().getCurrentStatus().connectionType, 'wifi');
      f.emitNetwork({ connected: false, connectionType: 'none' });
      assert.equal(getNetworkPort().getCurrentStatus().connected, false);
      f.emitApp({ isActive: false });
      assert.equal(getLifecyclePort().getCurrentState(), 'background');
      assert.equal(saved, 1);
      f.emitApp({ isActive: true });
      f.emitApp({ isActive: false });
      assert.equal(saved, 1);
      assert.equal(getAppPlatform().kind, 'web');
    } finally {
      stopDraft(); restoreLifecycle(); restoreNetwork(); await runtime.dispose();
    }
    assert.deepEqual(f.removals, { network: 1, app: 1 });
  }
  // A slow initial query cannot overwrite events received during startup.
  {
    const f = fixture();
    const networkRead = deferred<unknown>();
    const appRead = deferred<unknown>();
    f.dependencies.network.getStatus = () => networkRead.promise;
    f.dependencies.app.getState = () => appRead.promise;
    const runtime = createNativeRuntimePorts(f.dependencies, f.options);
    await tick();
    f.emitNetwork({ connected: false, connectionType: 'none' });
    f.emitApp({ isActive: false });
    networkRead.resolve({ connected: true, connectionType: 'wifi' });
    appRead.resolve({ isActive: true });
    await runtime.ready;
    assert.equal(runtime.network.getCurrentStatus().connected, false);
    assert.equal(runtime.lifecycle.getCurrentState(), 'background');
    await runtime.dispose();
  }
  // Even an event arriving before the native listener handle resolves wins.
  {
    const f = fixture();
    const registration = deferred<NativeListenerHandle>();
    const original = f.dependencies.network.addListener;
    f.dependencies.network.addListener = (event, listener) => {
      void original(event, listener);
      return registration.promise;
    };
    const runtime = createNativeRuntimePorts(f.dependencies, f.options);
    f.emitNetwork({ connected: false, connectionType: 'none' });
    registration.resolve(f.networkHandle);
    await runtime.ready;
    assert.equal(runtime.network.getCurrentStatus().connected, false);
    await runtime.dispose();
  }
  // A bridge error is bounded and resets any partly observed state.
  {
    const f = fixture();
    f.dependencies.app.getState = async () => { throw new Error('private native diagnostic'); };
    const runtime = createNativeRuntimePorts(f.dependencies, f.options);
    await assert.rejects(runtime.ready, { message: 'native_runtime_initialization_failed' });
    await runtime.dispose();
    assert.equal(runtime.network.getCurrentStatus().connected, false);
    assert.equal(runtime.lifecycle.getCurrentState(), 'background');
    assert.deepEqual(f.removals, { network: 1, app: 1 });
  }
  // A stuck read cannot leave initialization hanging or revive a disposed port.
  {
    const f = fixture();
    const read = deferred<unknown>();
    f.dependencies.network.getStatus = () => read.promise;
    const runtime = createNativeRuntimePorts(f.dependencies, f.options);
    const failed = assert.rejects(runtime.ready, { message: 'native_runtime_initialization_timeout' });
    await tick(); f.fireTimeout(); await failed;
    await runtime.dispose();
    read.resolve({ connected: true, connectionType: 'wifi' });
    f.emitApp({ isActive: true });
    await tick();
    assert.equal(runtime.network.getCurrentStatus().connected, false);
    assert.equal(runtime.lifecycle.getCurrentState(), 'background');
  }
  // Unmount during async registration cleans the late handle, not all plugin listeners.
  {
    const f = fixture();
    const registration = deferred<NativeListenerHandle>();
    const original = f.dependencies.network.addListener;
    f.dependencies.network.addListener = (event, listener) => {
      void original(event, listener);
      return registration.promise;
    };
    const runtime = createNativeRuntimePorts(f.dependencies, f.options);
    const cancelled = assert.rejects(runtime.ready, { message: 'native_runtime_disposed' });
    await runtime.dispose(); await cancelled;
    registration.resolve(f.networkHandle);
    await tick(); await runtime.dispose();
    assert.deepEqual(f.removals, { network: 1, app: 1 });
    f.emitNetwork({ connected: true, connectionType: 'wifi' });
    assert.equal(runtime.network.getCurrentStatus().connected, false);
  }
  // Bad observers and malformed native data cannot corrupt connection state.
  {
    const f = fixture();
    const runtime = createNativeRuntimePorts(f.dependencies, f.options);
    await runtime.ready;
    let observed = 0;
    runtime.network.subscribe(() => { throw new Error('observer failure'); });
    const stop = runtime.network.subscribe(() => { observed += 1; });
    f.emitNetwork({ connected: true, connectionType: 'cellular' });
    assert.equal(observed, 1);
    assert.equal(runtime.network.getCurrentStatus().connectionType, 'cellular');
    for (const raw of [null, { connected: 'true', connectionType: 'wifi' },
      { connected: true, connectionType: 'none' }, { connected: true, connectionType: {} }]) {
      f.emitNetwork(raw);
      assert.equal(runtime.network.getCurrentStatus().connected, false);
    }
    f.emitApp({ isActive: 'true' });
    assert.equal(runtime.lifecycle.getCurrentState(), 'background');
    stop(); await runtime.dispose();
  }
  // Native cleanup errors are not silently reported as a successful cleanup.
  {
    const f = fixture();
    const removed = deferred<void>();
    f.networkHandle.remove = async () => { f.removals.network += 1; await removed.promise; };
    const runtime = createNativeRuntimePorts(f.dependencies, f.options);
    await runtime.ready;
    let settled = false;
    const first = runtime.dispose();
    const second = runtime.dispose().then(() => { settled = true; });
    await tick();
    assert.equal(settled, false, 'concurrent disposals must await owned cleanup');
    removed.resolve();
    await Promise.all([first, second]);
    assert.equal(f.removals.network, 1);
  }
  // Native cleanup errors are not silently reported as a successful cleanup.
  {
    const f = fixture();
    f.networkHandle.remove = async () => { throw new Error('private cleanup diagnostic'); };
    const runtime = createNativeRuntimePorts(f.dependencies, f.options);
    await runtime.ready;
    await assert.rejects(runtime.dispose(), { message: 'native_runtime_cleanup_failed' });
    await assert.rejects(runtime.dispose(), { message: 'native_runtime_cleanup_failed' });
    assert.equal(runtime.network.getCurrentStatus().connected, false);
  }
  await assert.rejects(loadCapacitorRuntimePorts(), { message: 'native_runtime_unavailable' });
  assert.equal(getAppPlatform().kind, 'web');
  for (const timeoutMs of [0, 30_001, Number.NaN]) {
    assert.throws(() => createNativeRuntimePorts(fixture().dependencies, { timeoutMs }),
      /native_runtime_timeout_invalid/);
  }
  const source = readFileSync('lib/platform/capacitor/runtime-ports.ts', 'utf8');
  assert.doesNotMatch(source, /console\.|window\.|document\.|navigator\.|removeAllListeners/);
  console.log('PASS native runtime ports handle initial races, suspension, failure, timeout and owned cleanup');
}

void main().catch(error => { console.error(error); process.exitCode = 1; });
