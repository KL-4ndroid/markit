import { Capacitor } from '@capacitor/core';
import { createNativeRuntimePorts, type NativeRuntimePorts } from './runtime-ports';

/** Native entry point only. Browser plugin shims are never accepted as native. */
export async function loadCapacitorRuntimePorts(): Promise<NativeRuntimePorts> {
  if (!Capacitor.isNativePlatform()
    || !['ios', 'android'].includes(Capacitor.getPlatform())
    || !Capacitor.isPluginAvailable('App') || !Capacitor.isPluginAvailable('Network')) {
    throw new Error('native_runtime_unavailable');
  }
  let runtime: NativeRuntimePorts | undefined;
  try {
    const [{ App }, { Network }] = await Promise.all([
      import('@capacitor/app'), import('@capacitor/network'),
    ]);
    runtime = createNativeRuntimePorts({ app: App, network: Network });
    await runtime.ready;
    return runtime;
  } catch {
    if (runtime) void runtime.dispose().catch(() => {});
    throw new Error('native_runtime_initialization_failed');
  }
}
