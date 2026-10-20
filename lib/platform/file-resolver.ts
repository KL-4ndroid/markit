import { FileOperationError, type FilePort } from './contracts/files';

export function createFileResolver(dependencies: {
  runtime(): string;
  webFiles(): FilePort;
  loadIosFiles(): Promise<FilePort>;
  scheduleDeadline?: (callback: () => void, milliseconds: number) => () => void;
}) {
  let native: Promise<FilePort> | undefined;
  return async (): Promise<FilePort> => {
    const runtime = dependencies.runtime();
    if (runtime === 'web') return dependencies.webFiles();
    if (runtime !== 'ios') throw new FileOperationError('unavailable');
    native ??= new Promise<FilePort>((resolve, reject) => {
      const schedule = dependencies.scheduleDeadline ?? ((callback, ms) => {
        const timer = setTimeout(callback, ms);
        return () => clearTimeout(timer);
      });
      let settled = false;
      let cancel = () => {};
      cancel = schedule(() => { settled = true; cancel(); reject(new FileOperationError('unavailable')); }, 5_000);
      void Promise.resolve().then(dependencies.loadIosFiles).then(files => {
        if (settled) return;
        settled = true; cancel(); resolve(files);
      }, () => {
        if (settled) return;
        settled = true; cancel(); reject(new FileOperationError('unavailable'));
      });
    });
    return native;
  };
}
