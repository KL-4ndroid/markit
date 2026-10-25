import { supabase } from "./client";
import { db } from "@/lib/db";
import { getNetworkPort } from "@/lib/platform/network-capability";
import { runJournalRequest } from "@/lib/markets/market-journal-request";
import {
  regionBackfillEnabled,
  regionBackfillEpoch,
  type RegionBackfillItem,
  type RegionCandidate,
} from "@/lib/markets/market-region-backfill";
import {
  isMarketRegionCode,
  type MarketRegionCode,
} from "@/lib/markets/market-region";
async function identity(ownerId: string) {
  const { data, error } = await runJournalRequest(() =>
    supabase.auth.getSession(),
  );
  if (error || data.session?.user.id !== ownerId)
    throw new Error("REGION_SCOPE");
}
export async function listRegionCandidates(
  ownerId: string,
): Promise<RegionCandidate[]> {
  if (!getNetworkPort().getCurrentStatus().connected)
    throw new Error("REGION_OFFLINE");
  const epoch = regionBackfillEpoch();
  await identity(ownerId);
  const result: RegionCandidate[] = [];
  let after: string | null = null;
  for (;;) {
    let q = supabase
      .from("markets")
      .select("id,name,location,start_date,end_date,updated_at")
      .eq("owner_id", ownerId)
      .or("is_deleted.eq.false,is_deleted.is.null")
      .is("region_code", null)
      .order("id")
      .limit(200);
    if (after) q = q.gt("id", after);
    const { data, error } = await runJournalRequest((signal) =>
      q.abortSignal(signal).retry(false),
    );
    if (error) throw error;
    const rows = data ?? [];
    result.push(
      ...rows.map((r) => ({
        id: r.id,
        name: r.name,
        location: r.location,
        startDate: r.start_date,
        endDate: r.end_date,
        updatedAt: r.updated_at,
      })),
    );
    if (result.length > 2000)
      throw new Error("請先在市集清單分段整理；目前未分類場次超過清單上限。");
    if (rows.length < 200) break;
    after = rows[rows.length - 1].id;
  }
  await identity(ownerId);
  if (epoch !== regionBackfillEpoch()) throw new Error("REGION_SCOPE");
  return result;
}
export async function saveRegionBackfill(
  ownerId: string,
  batchId: string,
  items: RegionBackfillItem[],
) {
  if (!regionBackfillEnabled()) throw new Error("請先完成縣市補填的雲端啟用。");
  if (!getNetworkPort().getCurrentStatus().connected)
    throw new Error("REGION_OFFLINE");
  const epoch = regionBackfillEpoch();
  await identity(ownerId);
  const ids = new Set(items.map((i) => i.id));
  const pending = await db.events
    .filter(
      (e) =>
        ids.has(e.market_id ?? e.payload?.market_id ?? "") &&
        e.sync_status !== "synced",
    )
    .count();
  if (pending > 0) throw new Error("REGION_PENDING");
  const { data, error } = await runJournalRequest((signal) =>
    supabase
      .rpc("backfill_market_regions", { p_batch_id: batchId, p_items: items })
      .abortSignal(signal)
      .retry(false),
  );
  if (error) throw error;
  await identity(ownerId);
  if (epoch !== regionBackfillEpoch()) throw new Error("REGION_SCOPE");
  const rows = data as Array<{
    id: string;
    ownerId: string;
    regionCode: string | null;
    updatedAt: string;
    isScheduleOverride: boolean;
  }>;
  if (
    !Array.isArray(rows) ||
    rows.length !== items.length ||
    new Set(rows.map((r) => r.id)).size !== ids.size ||
    rows.some(
      (r) =>
        r.ownerId !== ownerId ||
        !ids.has(r.id) ||
        (r.regionCode !== null && !isMarketRegionCode(r.regionCode)),
    )
  )
    throw new Error("REGION_SCOPE");
  await db.transaction("rw", [db.markets, db.events], async () => {
    if (epoch !== regionBackfillEpoch()) throw new Error("REGION_SCOPE");
    for (const row of rows) {
      const local = await db.markets.get(row.id);
      const pending = await db.events
        .where("market_id")
        .equals(row.id)
        .filter((e) => e.sync_status !== "synced")
        .count();
      const timestamp = Date.parse(row.updatedAt);
      if (
        local?.owner_id === ownerId &&
        local.access_type !== "staff" &&
        !local.isDeleted &&
        pending === 0 &&
        local.updatedAt <= timestamp
      )
        await db.markets.update(row.id, {
          regionCode: row.regionCode as MarketRegionCode | null,
          updatedAt: timestamp,
          isScheduleOverride: row.isScheduleOverride,
        });
    }
  });
  return rows.length;
}
