// Invalidates asynchronous journal work before an authenticated cache reset.
let epoch = 0;
export const journalCacheEpoch = () => epoch;
export function invalidateJournalCacheScope() { epoch += 1; }
