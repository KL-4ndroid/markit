import type { Market } from "@/types/db";
import { isJournalOwner, type MarketJournal } from "./market-journal";
import { isMarketRegionCode, type MarketRegionCode } from "./market-region";

export const journalTasksEnabled = () =>
  process.env.NEXT_PUBLIC_JOURNAL_TASKS_ENABLED === "true";
export const venueRegionEditEnabled = () =>
  process.env.NEXT_PUBLIC_VENUE_REGION_EDIT_ENABLED === "true";
let epoch = 0;
export const ownerFollowupEpoch = () => epoch;
export const invalidateOwnerFollowupScope = () => {
  epoch++;
};

export function journalTaskSuggestions(body: string): string[] {
  return [
    ...new Set(
      body
        .split(/\r?\n/)
        .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)、])\s+/, "").trim())
        .filter(Boolean),
    ),
  ];
}
export function validateFollowupTexts(texts: readonly string[]): string[] {
  if (texts.length < 1 || texts.length > 20)
    throw new Error("請選擇 1 至 20 項待辦。");
  const normalized = texts.map((text) => text.replace(/[ \t]+/g, " ").trim());
  if (
    normalized.some(
      (text) => !text || /[\r\n]/.test(text) || Array.from(text).length > 200,
    )
  )
    throw new Error("每項待辦須為一行、1 至 200 字；請先調整文字。");
  if (new Set(normalized).size !== normalized.length)
    throw new Error("有重複的待辦文字，請先合併。");
  return normalized;
}
export function followupTargets(
  markets: readonly Market[],
  ownerId: string,
  sourceMarketId: string,
  today: string,
) {
  return markets
    .filter(
      (m) =>
        isJournalOwner(m, ownerId) &&
        m.id !== sourceMarketId &&
        m.endDate >= today &&
        !["completed", "cancelled", "postponed"].includes(m.status) &&
        (!m.scheduleOccurrenceState ||
          m.scheduleOccurrenceState === "scheduled"),
    )
    .sort(
      (a, b) =>
        a.startDate.localeCompare(b.startDate) || a.name.localeCompare(b.name),
    );
}
export interface JournalTaskRequest {
  id: string;
  journalId: string;
  revision: number;
  marketId: string;
  texts: string[];
}
export function prepareJournalTaskRequest(
  journal: MarketJournal,
  target: Market,
  ownerId: string,
  today: string,
  texts: string[],
  id: string,
): JournalTaskRequest {
  if (
    journal.ownerId !== ownerId ||
    journal.authorId !== ownerId ||
    journal.deletedAt ||
    !followupTargets([target], ownerId, journal.marketId, today).length
  )
    throw new Error("FOLLOWUP_SCOPE");
  return {
    id,
    journalId: journal.id,
    revision: journal.revision,
    marketId: target.id!,
    texts: validateFollowupTexts(texts),
  };
}
export interface VenueRegionPreview {
  day: string;
  venueId: string;
  name: string;
  regionCode: MarketRegionCode | null;
  updatedAt: string;
  schedules: Array<{
    id: string;
    revision: number;
    status: string;
    updatedAt: string;
  }>;
  markets: Array<{
    id: string;
    name: string;
    day: string;
    regionCode: MarketRegionCode | null;
    updatedAt: string;
    eligible: boolean;
  }>;
}
export function venueRegionChanges(
  preview: VenueRegionPreview,
  code: MarketRegionCode | null,
) {
  if (code !== null && !isMarketRegionCode(code))
    throw new Error("請選擇有效縣市。");
  return {
    changes: preview.markets.filter((m) => m.eligible && m.regionCode !== code),
    protected: preview.markets.filter((m) => !m.eligible),
    defaultChanged: preview.regionCode !== code,
  };
}
export function ownerFollowupError(error: unknown) {
  const text = String((error as { message?: string })?.message ?? error);
  if (text.includes("FOLLOWUP_CONFLICT"))
    return "來源、場次或預覽版本已變更。這次沒有新增修改，請重新讀取後再確認。";
  if (text.includes("FOLLOWUP_SCOPE"))
    return "帳號或資料存取狀態已改變，請重新整理。";
  if (text.includes("FOLLOWUP_TARGET"))
    return "目標場次已結束、取消或改期，請重新選擇。";
  if (text.includes("FOLLOWUP_PENDING"))
    return "相關場次有未同步事件或私人草稿，請先同步或處理草稿再繼續。";
  if (text.includes("FOLLOWUP_OFFLINE"))
    return "目前離線；選擇仍保留在此畫面，請連線後再確認。";
  if (text.includes("FOLLOWUP_LIMIT"))
    return "這個場地超過單次整理上限（250 場或 100 個安排），請先使用單場編輯。";
  if (/^(請|每項|有重複|功能尚未)/.test(text)) return text;
  return "尚未確認雲端送達；選擇仍保留。請使用同一份確認內容重試，或重新讀取核對。";
}
