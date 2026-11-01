/** Read-only scheduling. Never use this helper for event writers or outbox drains. */
export const CLOUD_READ_PAGE_SIZE = 500;

export async function readCloudPages<T>(
  readPage: (start: number, end: number) => Promise<T[]>,
  options: { assertActive?: () => void; onPage?: (count: number) => void; concurrency?: 1 | 2 } = {},
): Promise<T[]> {
  const rows: T[] = [];
  // Small accounts still use one request. Only a full first page enables lookahead.
  for (let offset = 0; ; ) {
    const concurrency = offset === 0 ? 1 : options.concurrency ?? 2;
    options.assertActive?.();
    const pages = await Promise.allSettled(Array.from({ length: concurrency }, async (_, index) => {
      options.assertActive?.();
      const start = offset + index * CLOUD_READ_PAGE_SIZE;
      return readPage(start, start + CLOUD_READ_PAGE_SIZE - 1);
    }));
    options.assertActive?.();
    for (const page of pages) if (page.status === 'rejected') throw page.reason;
    for (const page of pages) {
      if (page.status !== 'fulfilled') continue;
      if (page.value.length > CLOUD_READ_PAGE_SIZE) throw new Error('Invalid cloud page size');
      rows.push(...page.value);
      options.onPage?.(rows.length);
      if (page.value.length < CLOUD_READ_PAGE_SIZE) return rows;
    }
    offset += concurrency * CLOUD_READ_PAGE_SIZE;
  }
}

/** Keep URL filters bounded and at most two read requests in flight. */
export async function readCloudIdBatches<T>(ids: readonly string[], read: (ids: string[]) => Promise<T[]>, assertActive: () => void): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; offset < ids.length; offset += 200) {
    assertActive();
    const groups = [ids.slice(offset, offset + 100), ids.slice(offset + 100, offset + 200)].filter(group => group.length);
    const results = await Promise.allSettled(groups.map(async group => read(group)));
    assertActive();
    for (const result of results) if (result.status === 'rejected') throw result.reason;
    for (const result of results) if (result.status === 'fulfilled') rows.push(...result.value);
  }
  return rows;
}
