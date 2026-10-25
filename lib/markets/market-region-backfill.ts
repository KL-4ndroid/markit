import { isMarketRegionCode, type MarketRegionCode } from "./market-region";
export interface RegionCandidate {
  id: string;
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  updatedAt: string;
}
export interface RegionBackfillItem {
  id: string;
  regionCode: MarketRegionCode;
  expectedUpdatedAt: string;
}
let epoch = 0;
export const regionBackfillEpoch = () => epoch;
export const invalidateRegionBackfillScope = () => {
  epoch++;
};
export const regionBackfillEnabled = () =>
  process.env.NEXT_PUBLIC_MARKET_REGION_BACKFILL_ENABLED === "true";
export function prepareRegionBackfill(
  candidates: RegionCandidate[],
  choices: Record<string, string>,
): RegionBackfillItem[] {
  const selected = Object.entries(choices).filter(([, code]) => Boolean(code));
  if (selected.length === 0 || selected.length > 20)
    throw new Error("請選擇 1 至 20 場並指定縣市。");
  return selected
    .map(([id, code]) => {
      const row = candidates.find((c) => c.id === id);
      if (
        !row ||
        !isMarketRegionCode(code) ||
        !Number.isFinite(Date.parse(row.updatedAt))
      )
        throw new Error("選擇已變更，請重新讀取未分類清單。");
      return { id, regionCode: code, expectedUpdatedAt: row.updatedAt };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}
export function regionBackfillError(error: unknown) {
  const message = String((error as { message?: string })?.message ?? error);
  if (message.includes("REGION_CONFLICT"))
    return "預覽後有場次已被修改或分類。這批沒有更新，請重新讀取並確認。";
  if (message.includes("REGION_SCOPE"))
    return "帳號或場次存取狀態已改變，未更新分類。";
  if (message.includes("REGION_PENDING"))
    return "有選取場次尚未同步，請先完成同步再補填。";
  if (message.includes("REGION_OFFLINE"))
    return "目前離線，請連線後再確認補填；選擇仍保留。";
  if (/^(請|選擇)/.test(message)) return message;
  return "尚未確認雲端送達，預覽仍保留；請使用同一批重試或重新讀取確認。";
}
