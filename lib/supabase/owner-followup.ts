import { supabase } from "./client";
import { db } from "@/lib/db";
import { getEventMarketId } from "@/lib/events/event-read-model";
import { getNetworkPort } from "@/lib/platform/network-capability";
import { runJournalRequest } from "@/lib/markets/market-journal-request";
import {
  journalTasksEnabled,
  venueRegionEditEnabled,
  ownerFollowupEpoch,
  validateFollowupTexts,
  type JournalTaskRequest,
  type VenueRegionPreview,
} from "@/lib/markets/owner-followup";
import { isMarketRegionCode } from "@/lib/markets/market-region";
import type { MarketRegionCode } from "@/lib/markets/market-region";
import type { Event } from "@/types/db";

async function identity(ownerId: string, epoch: number) {
  if (!getNetworkPort().getCurrentStatus().connected)
    throw new Error("FOLLOWUP_OFFLINE");
  const { data, error } = await runJournalRequest(() =>
    supabase.auth.getSession(),
  );
  if (
    error ||
    data.session?.user.id !== ownerId ||
    epoch !== ownerFollowupEpoch()
  )
    throw new Error("FOLLOWUP_SCOPE");
}
async function noPending(ids: Set<string>, includeDrafts: boolean) {
  if (
    await db.events
      .filter(
        (e) => ids.has(getEventMarketId(e) ?? "") && e.sync_status !== "synced",
      )
      .count()
  )
    throw new Error("FOLLOWUP_PENDING");
  if (
    includeDrafts &&
    ((await db.marketJournalDrafts
      .filter((d) => ids.has(d.marketId))
      .count()) ||
      (await db.marketCashDrafts.filter((d) => ids.has(d.marketId)).count()))
  )
    throw new Error("FOLLOWUP_PENDING");
}
type CloudEvent = Omit<Event<Record<string, unknown>>, "timestamp"> & {
  timestamp: string;
};
function parsedEvents(
  raw: unknown,
  ownerId: string,
  allowed: Set<string>,
  venueId?: string,
): Event<Record<string, unknown>>[] {
  if (!Array.isArray(raw)) throw new Error("FOLLOWUP_SCOPE");
  return (raw as CloudEvent[]).map((e) => {
    const market = getEventMarketId(e),
      venue = e.payload?.venueId;
    if (
      !e.id ||
      e.actor_id !== ownerId ||
      !Number.isFinite(Date.parse(e.timestamp)) ||
      !(
        (allowed.has(market ?? "") &&
          ["checklist_item_created", "market_updated"].includes(e.type)) ||
        (venueId && venue === venueId && e.type === "venue_updated")
      )
    )
      throw new Error("FOLLOWUP_SCOPE");
    return { ...e, timestamp: Date.parse(e.timestamp), sync_status: "synced" };
  });
}
export async function applyJournalTasks(
  ownerId: string,
  request: JournalTaskRequest,
) {
  if (!journalTasksEnabled()) throw new Error("功能尚未開放：心得轉待辦。");
  validateFollowupTexts(request.texts);
  const epoch = ownerFollowupEpoch();
  await identity(ownerId, epoch);
  await noPending(new Set([request.marketId]), false);
  const { data, error } = await runJournalRequest((signal) =>
    supabase
      .rpc("apply_journal_checklist", {
        p_request_id: request.id,
        p_journal_id: request.journalId,
        p_revision: request.revision,
        p_market_id: request.marketId,
        p_texts: request.texts,
      })
      .abortSignal(signal)
      .retry(false),
  );
  if (error) throw error;
  await identity(ownerId, epoch);
  const events = parsedEvents(
    data?.events,
    ownerId,
    new Set([request.marketId]),
  );
  if (
    events.some(
      (e) =>
        e.type !== "checklist_item_created" ||
        e.payload.completed !== false ||
        !request.texts.includes(String(e.payload.text)),
    )
  )
    throw new Error("FOLLOWUP_SCOPE");
  await db.transaction("rw", db.events, async () => {
    if (epoch !== ownerFollowupEpoch()) throw new Error("FOLLOWUP_SCOPE");
    await db.events.bulkPut(events);
  });
  return {
    appliedCount: Number(data.appliedCount),
    skippedCount: Number(data.skippedCount),
  };
}
export async function previewVenueRegion(
  ownerId: string,
  venueId: string,
): Promise<VenueRegionPreview> {
  const epoch = ownerFollowupEpoch();
  await identity(ownerId, epoch);
  const { data, error } = await runJournalRequest((signal) =>
    supabase
      .rpc("preview_venue_region_change", { p_venue_id: venueId })
      .abortSignal(signal)
      .retry(false),
  );
  if (error) throw error;
  await identity(ownerId, epoch);
  if (
    data?.venueId !== venueId ||
    !Array.isArray(data.markets) ||
    !Array.isArray(data.schedules) ||
    data.markets.length > 250
  )
    throw new Error("FOLLOWUP_SCOPE");
  return data as VenueRegionPreview;
}
export async function applyVenueRegion(
  ownerId: string,
  id: string,
  preview: VenueRegionPreview,
  region: MarketRegionCode | null,
) {
  if (!venueRegionEditEnabled())
    throw new Error("功能尚未開放：固定安排縣市編輯。");
  if (region !== null && !isMarketRegionCode(region))
    throw new Error("請選擇有效縣市。");
  const epoch = ownerFollowupEpoch();
  await identity(ownerId, epoch);
  const ids = new Set(preview.markets.map((m) => m.id));
  await noPending(ids, true);
  if (
    await db.events
      .filter(
        (e) =>
          e.sync_status !== "synced" &&
          (e.payload?.venueId === preview.venueId ||
            preview.schedules.some((s) => s.id === e.payload?.scheduleId)),
      )
      .count()
  )
    throw new Error("FOLLOWUP_PENDING");
  const { data, error } = await runJournalRequest((signal) =>
    supabase
      .rpc("apply_venue_region_change", {
        p_request_id: id,
        p_preview: preview,
        p_region_code: region,
      })
      .abortSignal(signal)
      .retry(false),
  );
  if (error) throw error;
  await identity(ownerId, epoch);
  const events = parsedEvents(data?.events, ownerId, ids, preview.venueId);
  if (
    events.some(
      (e) =>
        !["market_updated", "venue_updated"].includes(e.type) ||
        JSON.stringify(e.payload.updates) !==
          JSON.stringify({ regionCode: region }),
    )
  )
    throw new Error("FOLLOWUP_SCOPE");
  await db.transaction(
    "rw",
    [
      db.events,
      db.markets,
      db.venues,
      db.marketJournalDrafts,
      db.marketCashDrafts,
    ],
    async () => {
      if (epoch !== ownerFollowupEpoch()) throw new Error("FOLLOWUP_SCOPE");
      await db.events.bulkPut(events);
      for (const event of events) {
        if (event.type === "venue_updated") {
          const local = await db.venues.get(preview.venueId);
          const pending = await db.events
            .filter(
              (e) =>
                e.sync_status !== "synced" &&
                e.payload?.venueId === preview.venueId,
            )
            .count();
          if (
            local?.owner_id === ownerId &&
            !local.isDeleted &&
            pending === 0 &&
            local.updatedAt <= event.timestamp
          )
            await db.venues.update(local.id, {
              regionCode: region,
              updatedAt: event.timestamp,
            });
        } else {
          const marketId = getEventMarketId(event)!;
          const local = await db.markets.get(marketId);
          const pending = await db.events
            .filter(
              (e) =>
                e.sync_status !== "synced" && getEventMarketId(e) === marketId,
            )
            .count();
          const draft =
            (await db.marketJournalDrafts
              .where("marketId")
              .equals(marketId)
              .count()) ||
            (await db.marketCashDrafts
              .where("marketId")
              .equals(marketId)
              .count());
          if (
            local?.owner_id === ownerId &&
            !local.isDeleted &&
            local.access_type !== "staff" &&
            pending === 0 &&
            !draft &&
            local.updatedAt <= event.timestamp
          )
            await db.markets.update(marketId, {
              regionCode: region,
              updatedAt: event.timestamp,
            });
        }
      }
    },
  );
  return {
    updatedCount: Number(data.updatedCount),
    protectedCount: Number(data.protectedCount),
  };
}
