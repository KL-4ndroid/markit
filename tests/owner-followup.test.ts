import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import { db, clearAllData } from "../lib/db";
import {
  buildJournalEntries,
  journalDateRangeError,
  type MarketJournal,
  type MarketJournalDraft,
} from "../lib/markets/market-journal";
import {
  followupTargets,
  journalTaskSuggestions,
  validateFollowupTexts,
  prepareJournalTaskRequest,
  venueRegionChanges,
  invalidateOwnerFollowupScope,
  ownerFollowupEpoch,
  type VenueRegionPreview,
} from "../lib/markets/owner-followup";
import {
  applyJournalTasks,
  applyVenueRegion,
  previewVenueRegion,
} from "../lib/supabase/owner-followup";
import { supabase } from "../lib/supabase/client";
import { installNetworkPort } from "../lib/platform/network-capability";
import type { Market } from "../types/db";
async function main() {
  const source: Market = {
    id: "source",
    owner_id: "owner",
    name: "市集甲",
    location: "自由地點",
    regionCode: "tw-tainan-city",
    startDate: "2026-09-30",
    endDate: "2026-10-03",
    status: "completed",
    createdAt: 1,
    updatedAt: 1,
  };
  const journal: MarketJournal = {
    id: "j",
    ownerId: "owner",
    authorId: "owner",
    marketId: "source",
    businessDate: "2026-10-01",
    body: "停車要提早\n- 帶推車\n私人感受",
    revision: 1,
    mutationId: "m",
    createdAt: "2026-10-20T00:00:00Z",
    updatedAt: "2026-10-24T00:00:00Z",
    deletedAt: null,
  };
  const summary = { ...journal, id: "summary", businessDate: null };
  const entry = (
    fromDate: string,
    toDate: string,
    drafts: MarketJournalDraft[] = [],
  ) =>
    buildJournalEntries({
      ownerId: "owner",
      markets: [source],
      journals: [journal, summary],
      drafts,
      fromDate,
      toDate,
    });
  assert.deepEqual(
    entry("2026-10-01", "2026-10-01").map((e) => e.id),
    ["j"],
  );
  assert.deepEqual(
    entry("2026-10-03", "2026-10-03").map((e) => e.id),
    ["summary"],
  );
  assert.equal(
    entry("2026-10-24", "2026-10-24").length,
    0,
    "modified date never changes business-period classification",
  );
  assert.equal(entry("", "2026-10-01").length, 1);
  assert.equal(entry("2026-10-02", "").length, 1);
  assert.ok(journalDateRangeError("2026-02-30", ""));
  assert.ok(journalDateRangeError("2026-10-03", "2026-10-01"));
  assert.equal(journalDateRangeError("2028-02-29", "2028-02-29"), null);
  assert.throws(() => entry("2026-02-30", ""));
  const draft: MarketJournalDraft = {
    id: "j",
    ownerId: "owner",
    marketId: "source",
    businessDate: null,
    body: "草稿",
    baseRevision: 1,
    mutationId: "draft",
    updatedAt: 1,
    deleted: false,
  };
  assert.equal(
    entry("2026-10-01", "2026-10-01", [draft]).length,
    0,
    "explicit summary draft does not inherit old daily date",
  );
  assert.equal(entry("2026-10-03", "2026-10-03", [draft]).length, 2);
  assert.deepEqual(journalTaskSuggestions(journal.body), [
    "停車要提早",
    "帶推車",
    "私人感受",
  ]);
  assert.deepEqual(validateFollowupTexts(["  提早   停車 "]), ["提早 停車"]);
  for (const values of [
    [],
    ["a", " a "],
    ["a\nb"],
    ["字".repeat(201)],
    Array(21).fill("a"),
  ])
    assert.throws(() => validateFollowupTexts(values));
  const target: Market = {
    ...source,
    id: "target",
    startDate: "2026-10-25",
    endDate: "2026-10-25",
    status: "registered",
  };
  const candidates = [
    target,
    source,
    { ...target, id: "past", endDate: "2026-10-23" },
    { ...target, id: "cancel", status: "cancelled" as const },
    { ...target, id: "foreign", owner_id: "other" },
    { ...target, id: "staff", access_type: "staff" as const },
    { ...target, id: "skip", scheduleOccurrenceState: "skipped" as const },
  ];
  assert.deepEqual(
    followupTargets(candidates, "owner", "source", "2026-10-24").map(
      (m) => m.id,
    ),
    ["target"],
  );
  const request = prepareJournalTaskRequest(
    journal,
    target,
    "owner",
    "2026-10-24",
    ["帶推車"],
    "request",
  );
  assert.deepEqual(Object.keys(request).sort(), [
    "id",
    "journalId",
    "marketId",
    "revision",
    "texts",
  ]);
  assert.throws(() =>
    prepareJournalTaskRequest(
      { ...journal, deletedAt: "now" },
      target,
      "owner",
      "2026-10-24",
      ["a"],
      "r",
    ),
  );
  const preview: VenueRegionPreview = {
    day: "2026-10-24",
    venueId: "venue",
    name: "場地",
    regionCode: null,
    updatedAt: "2026-10-24T00:00:00Z",
    schedules: [],
    markets: [
      {
        id: "target",
        name: "未來",
        day: "2026-10-25",
        regionCode: null,
        updatedAt: "2026-10-24T00:00:00Z",
        eligible: true,
      },
      {
        id: "protected",
        name: "已有活動",
        day: "2026-10-25",
        regionCode: null,
        updatedAt: "2026-10-24T00:00:00Z",
        eligible: false,
      },
    ],
  };
  assert.equal(venueRegionChanges(preview, "tw-tainan-city").changes.length, 1);
  assert.equal(venueRegionChanges(preview, null).changes.length, 0);
  assert.equal(venueRegionChanges(preview, null).protected.length, 1);
  process.env.NEXT_PUBLIC_JOURNAL_TASKS_ENABLED = "true";
  process.env.NEXT_PUBLIC_VENUE_REGION_EDIT_ENABLED = "true";
  const originalRpc = supabase.rpc,
    originalSession = supabase.auth.getSession;
  let actor = "owner",
    calls = 0,
    loseScope = false;
  const timestamp = "2026-10-24T01:00:00Z";
  supabase.auth.getSession = (async () => ({
    data: { session: { user: { id: actor } } },
    error: null,
  })) as typeof originalSession;
  supabase.rpc = ((name: string) => {
    calls++;
    const result =
      name === "preview_venue_region_change"
        ? preview
        : name === "apply_journal_checklist"
          ? {
              appliedCount: 1,
              skippedCount: 0,
              events: [
                {
                  id: "task-event",
                  actor_id: "owner",
                  market_id: "target",
                  type: "checklist_item_created",
                  timestamp,
                  payload: {
                    market_id: "target",
                    itemId: "task-id",
                    text: "帶推車",
                    completed: false,
                  },
                },
              ],
            }
          : {
              updatedCount: 1,
              protectedCount: 1,
              events: [
                {
                  id: "region-event",
                  actor_id: "owner",
                  market_id: "target",
                  type: "market_updated",
                  timestamp,
                  payload: {
                    market_id: "target",
                    updates: { regionCode: "tw-tainan-city" },
                  },
                },
              ],
            };
    return {
      abortSignal() {
        return this;
      },
      retry() {
        if (loseScope) invalidateOwnerFollowupScope();
        return Promise.resolve({ data: result, error: null });
      },
    };
  }) as typeof originalRpc;
  let connected = true;
  const restore = installNetworkPort({
    getCurrentStatus: () => ({ connected, connectionType: "unknown" }),
    subscribe: () => () => {},
  });
  try {
    await db.open();
    await clearAllData();
    await db.markets.put(target);
    process.env.NEXT_PUBLIC_JOURNAL_TASKS_ENABLED = "false";
    const disabledCalls = calls;
    await assert.rejects(applyJournalTasks("owner", request), /功能尚未/);
    assert.equal(calls, disabledCalls);
    process.env.NEXT_PUBLIC_JOURNAL_TASKS_ENABLED = "true";
    process.env.NEXT_PUBLIC_VENUE_REGION_EDIT_ENABLED = "false";
    await assert.rejects(
      applyVenueRegion("owner", "r", preview, "tw-tainan-city"),
      /功能尚未/,
    );
    assert.equal(calls, disabledCalls);
    process.env.NEXT_PUBLIC_VENUE_REGION_EDIT_ENABLED = "true";
    assert.equal((await applyJournalTasks("owner", request)).appliedCount, 1);
    assert.equal((await db.events.get("task-event"))!.sync_status, "synced");
    await applyJournalTasks("owner", request);
    assert.equal(
      await db.events.count(),
      1,
      "ack retry cannot duplicate cached creation",
    );
    connected = false;
    const before = calls;
    await assert.rejects(
      applyJournalTasks("owner", request),
      /FOLLOWUP_OFFLINE/,
    );
    assert.equal(calls, before);
    connected = true;
    actor = "other";
    await assert.rejects(applyJournalTasks("owner", request), /FOLLOWUP_SCOPE/);
    actor = "owner";
    await db.events.add({
      id: "pending",
      type: "market_updated",
      market_id: "target",
      actor_id: "owner",
      timestamp: 2,
      sync_status: "local_only",
      payload: { market_id: "target", updates: { name: "local" } },
    });
    await assert.rejects(
      applyJournalTasks("owner", request),
      /FOLLOWUP_PENDING/,
    );
    await db.events.delete("pending");
    assert.equal((await previewVenueRegion("owner", "venue")).venueId, "venue");
    await db.marketJournalDrafts.put({ ...draft, marketId: "target" });
    await assert.rejects(
      applyVenueRegion("owner", "region", preview, "tw-tainan-city"),
      /FOLLOWUP_PENDING/,
    );
    await db.marketJournalDrafts.clear();
    await applyVenueRegion("owner", "region", preview, "tw-tainan-city");
    assert.equal(
      (await db.markets.get("target"))!.regionCode,
      "tw-tainan-city",
    );
    await db.events.clear();
    loseScope = true;
    await assert.rejects(applyJournalTasks("owner", request), /FOLLOWUP_SCOPE/);
    assert.equal(
      await db.events.count(),
      0,
      "late response after clear/scope change cannot write",
    );
    const scope = ownerFollowupEpoch();
    await clearAllData();
    assert.ok(ownerFollowupEpoch() > scope);
    console.log(
      "PASS journal date range, task intent/privacy/targets, rollout, offline, pending, response isolation, retry cache and scope invalidation",
    );
  } finally {
    supabase.rpc = originalRpc;
    supabase.auth.getSession = originalSession;
    restore();
    await db.delete();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
