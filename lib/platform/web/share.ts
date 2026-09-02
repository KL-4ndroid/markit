import type { ShareInput, SharePort } from '@/lib/platform/contracts/share';

export const webShare: SharePort = Object.freeze({
  async share(input: ShareInput) {
    if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return 'unsupported';
    try {
      await navigator.share(input);
      return 'shared';
    } catch (error) {
      return error instanceof DOMException && error.name === 'AbortError' ? 'cancelled' : 'unsupported';
    }
  },
});
