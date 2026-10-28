import type { FilePort, PlatformFile } from '@/lib/platform/contracts/files';

type Result = 'saved' | 'opened' | 'blocked' | 'unsupported' | 'busy' | 'stale';

/** Device-neutral, per-screen PDF work. Check authorization again after rendering. */
export function createPdfFileActions<Model>() {
  let busy = false;
  let cached: { model: Model; file: PlatformFile } | null = null;
  return {
    async run(input: {
      model: Model;
      action: 'preview' | 'save';
      isCurrent: () => boolean;
      build: () => Promise<PlatformFile>;
      files: FilePort;
    }): Promise<Result> {
      if (!input.isCurrent()) return 'stale';
      if (busy) return 'busy';
      busy = true;
      try {
        const file = cached?.model === input.model ? cached.file : await input.build();
        if (!input.isCurrent()) return 'stale';
        cached = { model: input.model, file };
        if (input.action === 'save') {
          await input.files.saveFile(file);
          return 'saved';
        }
        const result = await input.files.previewFile(file);
        return result.opened ? 'opened' : result.reason;
      } finally {
        busy = false;
      }
    },
  };
}
