/** Common JS timeout/abort contract, usable by Web and bundled mobile clients. */
export async function runJournalRequest<T>(request: (signal: AbortSignal) => PromiseLike<T>, timeoutMs = 12000): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve().then(() => request(controller.signal)),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => { reject(new Error('JOURNAL_TIMEOUT')); controller.abort(); }, timeoutMs);
      }),
    ]);
  } finally { if (timer !== undefined) clearTimeout(timer); }
}
