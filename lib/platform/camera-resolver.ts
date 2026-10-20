import { CameraSelectionError, type CameraPort } from './contracts/camera';

export function createCameraResolver(dependencies: {
  runtime(): string;
  webCamera(): CameraPort;
  loadIosCamera(): Promise<CameraPort>;
  scheduleDeadline?: (callback: () => void, milliseconds: number) => () => void;
}) {
  let native: Promise<CameraPort> | undefined;
  return async (): Promise<CameraPort> => {
    const runtime = dependencies.runtime();
    if (runtime === 'web') return dependencies.webCamera();
    if (runtime !== 'ios') throw new CameraSelectionError('adapter_unavailable');
    native ??= new Promise<CameraPort>((resolve, reject) => {
      const schedule = dependencies.scheduleDeadline ?? ((callback, ms) => {
        const timer = setTimeout(callback, ms);
        return () => clearTimeout(timer);
      });
      let settled = false;
      let cancel = () => {};
      cancel = schedule(() => { settled = true; cancel(); reject(new CameraSelectionError('adapter_unavailable')); }, 5_000);
      void Promise.resolve().then(dependencies.loadIosCamera).then(camera => {
        if (settled) return;
        settled = true; cancel(); resolve(camera);
      }, () => {
        if (settled) return;
        settled = true; cancel(); reject(new CameraSelectionError('adapter_unavailable'));
      });
    });
    return native;
  };
}
