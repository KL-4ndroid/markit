"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppDialog } from "@/components/ui/AppDialog";
import { generateUUID } from "@/lib/db";
import {
  MARKET_REGIONS,
  marketRegionLabel,
  type MarketRegionCode,
} from "@/lib/markets/market-region";
import {
  ownerFollowupError,
  venueRegionChanges,
  venueRegionEditEnabled,
  type VenueRegionPreview,
} from "@/lib/markets/owner-followup";
import {
  applyVenueRegion,
  previewVenueRegion,
} from "@/lib/supabase/owner-followup";
const button =
  "min-h-11 rounded-xl border border-primary/20 px-3 py-2 text-sm text-primary disabled:opacity-50";
export function VenueRegionEditDialog({
  venueId,
  ownerId,
  onClose,
}: {
  venueId: string;
  ownerId: string;
  onClose: () => void;
}) {
  const [preview, setPreview] = useState<VenueRegionPreview | null>(null),
    [region, setRegion] = useState<MarketRegionCode | null>(null),
    [requestId, setRequestId] = useState("");
  const [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [limit, setLimit] = useState(20);
  const generation = useRef(0),
    saving = useRef(false);
  const load = useCallback(async () => {
    const version = ++generation.current;
    setLoading(true);
    setError("");
    setRequestId("");
    try {
      const row = await previewVenueRegion(ownerId, venueId);
      if (version === generation.current) {
        setPreview(row);
        setRegion(row.regionCode);
        setLimit(20);
      }
    } catch (e) {
      if (version === generation.current) setError(ownerFollowupError(e));
    } finally {
      if (version === generation.current) setLoading(false);
    }
  }, [ownerId, venueId]);
  const cancelPending = useCallback(() => {
    generation.current++;
  }, []);
  useEffect(() => {
    if (venueRegionEditEnabled()) void load();
    return cancelPending;
  }, [load, cancelPending]);
  const plan = preview ? venueRegionChanges(preview, region) : null;
  const save = async () => {
    if (!preview || !requestId || saving.current) return;
    saving.current = true;
    setBusy(true);
    setError("");
    const version = generation.current;
    try {
      const result = await applyVenueRegion(
        ownerId,
        requestId,
        preview,
        region,
      );
      if (version === generation.current)
        setSuccess(
          `雲端已確認：${result.updatedCount} 場已更新，${result.protectedCount} 場受到保護而保留原分類。`,
        );
    } catch (e) {
      if (version === generation.current) setError(ownerFollowupError(e));
    } finally {
      saving.current = false;
      if (version === generation.current) setBusy(false);
    }
  };
  return (
    <AppDialog
      open
      onClose={onClose}
      dismissible={!busy}
      title="編輯固定安排縣市"
      description="更新場地預設及今天起可調整的未來場次；先預覽再確認。"
      size="lg"
    >
      <div className="space-y-4">
        {!venueRegionEditEnabled() && (
          <p role="status" className="text-sm">
            固定安排縣市編輯準備中，完成雲端啟用後即可使用。
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        {success ? (
          <>
            <p role="status" className="rounded-xl bg-soft-green p-3 text-sm">
              {success}
            </p>
            <button className={button} onClick={onClose}>
              完成
            </button>
          </>
        ) : (
          <>
            {venueRegionEditEnabled() && (
              <button
                className={button}
                disabled={loading || busy}
                onClick={() => void load()}
              >
                重新讀取預覽資料
              </button>
            )}
            {loading && (
              <p role="status" className="text-sm">
                正在確認雲端未來場次…
              </p>
            )}
            {preview && plan && !loading && (
              <>
                <h3 className="font-semibold">{preview.name}</h3>
                <p className="text-sm leading-6">
                  此場地共用於 {preview.schedules.length}{" "}
                  個進行中／暫停的固定安排。變更會影響它們之後新產生的場次，不改自由地點文字。
                </p>
                <label className="block text-sm">
                  新的縣市
                  <select
                    disabled={Boolean(requestId) || busy}
                    value={region ?? ""}
                    onChange={(e) =>
                      setRegion(
                        (e.target.value || null) as MarketRegionCode | null,
                      )
                    }
                    className="mt-1 min-h-11 w-full rounded-xl border px-3 text-base sm:text-sm"
                  >
                    <option value="">未分類（清除縣市）</option>
                    {MARKET_REGIONS.map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="rounded-xl bg-background p-3 text-sm leading-6">
                  場地預設：{marketRegionLabel(preview.regionCode)} →{" "}
                  {marketRegionLabel(region)}
                  <br />
                  可更新 {plan.changes.length} 場；保留受保護的{" "}
                  {plan.protected.length}{" "}
                  場。過去、單場覆寫、取消／跳過及已有成交、心得、現金或待辦的場次不改。
                </p>
                <ul className="space-y-2 text-sm">
                  {plan.changes.slice(0, limit).map((row) => (
                    <li
                      key={row.id}
                      className="break-words rounded-xl border border-primary/10 p-3"
                    >
                      {row.day} · {row.name}
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {marketRegionLabel(row.regionCode)} →{" "}
                        {marketRegionLabel(region)}
                      </span>
                    </li>
                  ))}
                </ul>
                {plan.changes.length > limit && (
                  <button
                    className={button}
                    onClick={() => setLimit((n) => n + 20)}
                  >
                    顯示更多將更新場次
                  </button>
                )}
                <p className="text-xs leading-5 text-muted-foreground">
                  預覽後若有場次、安排或操作紀錄改變，整批會停止，需重新讀取。相關場次的本機未同步變更與私人草稿也須先處理。此操作需要連線。
                </p>
                <div className="flex flex-wrap gap-2">
                  {requestId ? (
                    <>
                      <button
                        className={`${button} bg-primary text-white`}
                        disabled={busy}
                        onClick={() => void save()}
                      >
                        {busy ? "更新中…" : "確認更新場地與未來場次"}
                      </button>
                      <button
                        className={button}
                        disabled={busy}
                        onClick={() => {
                          setRequestId("");
                          setError("");
                        }}
                      >
                        返回調整
                      </button>
                    </>
                  ) : (
                    <button
                      className={`${button} bg-primary text-white`}
                      disabled={
                        !plan.defaultChanged && plan.changes.length === 0
                      }
                      onClick={() => setRequestId(generateUUID())}
                    >
                      確認以上變更範圍
                    </button>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </AppDialog>
  );
}
