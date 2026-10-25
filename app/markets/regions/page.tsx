"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { WorkspacePageHeader } from "@/components/layout/WorkspacePageHeader";
import { StateView } from "@/components/ui/StateView";
import { useAuth } from "@/lib/supabase/auth-context";
import { useRoleContext } from "@/lib/role-context";
import { generateUUID } from "@/lib/db";
import { MARKET_REGIONS, marketRegionLabel } from "@/lib/markets/market-region";
import {
  prepareRegionBackfill,
  regionBackfillEnabled,
  regionBackfillError,
  type RegionCandidate,
  type RegionBackfillItem,
} from "@/lib/markets/market-region-backfill";
import {
  listRegionCandidates,
  saveRegionBackfill,
} from "@/lib/supabase/market-region-backfill";

const button =
  "min-h-11 rounded-xl border border-primary/20 px-3 py-2 text-sm text-primary disabled:opacity-50";
export default function MarketRegionsPage() {
  const { user } = useAuth();
  const { userRole, roleRefreshState } = useRoleContext();
  return (
    <div className="min-h-screen bg-background">
      <WorkspacePageHeader
        title="市集縣市整理"
        eyebrow="資料整理"
        icon={MapPin}
      />
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-5 pb-24">
        <Link
          href="/markets"
          className="inline-flex min-h-11 items-center text-sm text-primary"
        >
          返回市集清單
        </Link>
        {!user ||
        userRole.isStaff ||
        !roleRefreshState.shouldMountProtectedChildren ? (
          <StateView
            title="請使用老闆帳號整理縣市"
            description="員工可讀取原市集分類，分類調整由老闆處理。"
          />
        ) : (
          <BackfillWorkspace
            key={user.id}
            ownerId={user.id}
            disabled={!roleRefreshState.isAuthorizationFresh}
          />
        )}
      </main>
    </div>
  );
}
function BackfillWorkspace({
  ownerId,
  disabled,
}: {
  ownerId: string;
  disabled: boolean;
}) {
  const [rows, setRows] = useState<RegionCandidate[]>([]),
    [selected, setSelected] = useState<Record<string, boolean>>({}),
    [choices, setChoices] = useState<Record<string, string>>({});
  const [common, setCommon] = useState(""),
    [search, setSearch] = useState(""),
    [limit, setLimit] = useState(40);
  const [preview, setPreview] = useState<{
    batchId: string;
    items: RegionBackfillItem[];
  } | null>(null);
  const [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [status, setStatus] = useState("");
  const generation = useRef(0),
    saving = useRef(false);
  const reload = useCallback(async () => {
    const version = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const next = await listRegionCandidates(ownerId);
      if (version === generation.current) {
        setRows(next);
        setSelected({});
        setChoices({});
        setPreview(null);
      }
    } catch (e) {
      if (version === generation.current) setError(regionBackfillError(e));
    } finally {
      if (version === generation.current) setLoading(false);
    }
  }, [ownerId]);
  useEffect(() => {
    void reload();
    const cancel = () => {
      generation.current++;
    };
    return cancel;
  }, [reload]);
  const chosen = Object.keys(selected).filter((id) => selected[id]);
  const filtered = rows.filter((row) =>
    `${row.name} ${row.location} ${row.startDate}`
      .toLocaleLowerCase()
      .includes(search.trim().toLocaleLowerCase()),
  );
  function prepare() {
    try {
      const items = prepareRegionBackfill(
        rows,
        Object.fromEntries(chosen.map((id) => [id, choices[id] ?? ""])),
      );
      if (items.length !== chosen.length)
        throw new Error("請為每個勾選場次指定縣市。");
      setPreview({ batchId: generateUUID(), items });
      setError("");
    } catch (e) {
      setError(regionBackfillError(e));
    }
  }
  async function submit() {
    if (!preview || busy || disabled || saving.current) return;
    saving.current = true;
    setBusy(true);
    setError("");
    const version = generation.current;
    try {
      const count = await saveRegionBackfill(
        ownerId,
        preview.batchId,
        preview.items,
      );
      if (version === generation.current) {
        setStatus(
          `已確認 ${count} 場補填送達雲端。原地點、營收及營業日期保留。`,
        );
        setBusy(false);
        await reload();
      }
    } catch (e) {
      if (version === generation.current) setError(regionBackfillError(e));
    } finally {
      saving.current = false;
      if (version === generation.current) setBusy(false);
    }
  }
  return (
    <>
      <div className="rounded-card border border-primary/10 bg-white p-4 text-sm leading-6">
        <h2 className="font-semibold">先整理未分類場次</h2>
        <p>
          一批最多 20
          場，先指定縣市再預覽。只補填你確認的場次，不從地點文字猜測，也不修改場地預設或其他營業日。
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          已有縣市的更正請回原市集編輯。多筆補填需連線；關閉頁面前尚未確認的選擇不會送出。
        </p>
      </div>
      {status && (
        <p role="status" className="rounded-xl bg-soft-green p-3 text-sm">
          {status}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-danger/20 p-3 text-sm text-danger"
        >
          {error}
        </p>
      )}
      <button
        className={button}
        disabled={busy || loading || disabled}
        onClick={() => void reload()}
      >
        重新讀取未分類市集
      </button>
      {loading ? (
        <StateView title="正在讀取未分類清單" />
      ) : preview ? (
        <section
          className="space-y-3 rounded-card border border-primary/20 bg-white p-4"
          aria-label="縣市補填預覽"
        >
          <h2 className="font-semibold">
            確認這 {preview.items.length} 場的縣市
          </h2>
          <ul className="space-y-3">
            {preview.items.map((item) => {
              const row = rows.find((r) => r.id === item.id);
              return (
                <li
                  key={item.id}
                  className="rounded-xl bg-background p-3 text-sm"
                >
                  <p className="break-words font-medium">{row?.name}</p>
                  <p className="mt-1 break-words text-xs text-muted-foreground">
                    {row?.location} · {row?.startDate}～{row?.endDate}
                  </p>
                  <p className="mt-2">
                    未分類 → {marketRegionLabel(item.regionCode)}
                  </p>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-muted-foreground">
            預覽後若有場次被修改或分類，整批會停止；重新讀取後再確認。確認後可回原市集編輯更正。
          </p>
          {!regionBackfillEnabled() && (
            <p role="status" className="text-sm">
              多筆補填準備中，目前可先回原市集編輯。
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              className={`${button} bg-primary text-white`}
              disabled={busy || disabled || !regionBackfillEnabled()}
              onClick={() => void submit()}
            >
              確認補填到雲端
            </button>
            <button
              className={button}
              disabled={busy}
              onClick={() => setPreview(null)}
            >
              返回調整
            </button>
          </div>
        </section>
      ) : (
        <section className="space-y-3" aria-label="未分類市集清單">
          <label className="block text-sm">
            搜尋市集或地點
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setLimit(40);
              }}
              className="mt-1 min-h-11 w-full rounded-xl border bg-white px-3 text-base sm:text-sm"
            />
          </label>
          <div className="rounded-card border border-primary/10 bg-white p-4">
            <p className="text-sm">
              已勾選 {chosen.length} 場／未分類 {rows.length} 場
            </p>
            <label className="mt-3 block text-sm">
              共同縣市
              <select
                value={common}
                onChange={(e) => setCommon(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border bg-white px-3 text-base sm:text-sm"
              >
                <option value="">選擇共同縣市</option>
                {MARKET_REGIONS.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              className={`${button} mt-2`}
              disabled={disabled || !common || chosen.length === 0}
              onClick={() =>
                setChoices((old) => ({
                  ...old,
                  ...Object.fromEntries(chosen.map((id) => [id, common])),
                }))
              }
            >
              將縣市套用到勾選場次
            </button>
          </div>
          {filtered.slice(0, limit).map((row) => (
            <div
              key={row.id}
              className="space-y-2 rounded-card border border-primary/10 bg-white p-4"
            >
              <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={Boolean(selected[row.id])}
                  disabled={disabled}
                  onChange={(e) =>
                    setSelected({ ...selected, [row.id]: e.target.checked })
                  }
                  className="h-5 w-5 shrink-0"
                />
                <span className="break-words">{row.name}</span>
              </label>
              <p className="break-words text-xs leading-5 text-muted-foreground">
                {row.location} · {row.startDate}～{row.endDate}
              </p>
              <label className="block text-sm">
                {row.name} 縣市
                <select
                  value={choices[row.id] ?? ""}
                  disabled={disabled}
                  onChange={(e) => {
                    setChoices({ ...choices, [row.id]: e.target.value });
                    setSelected({
                      ...selected,
                      [row.id]: Boolean(e.target.value),
                    });
                  }}
                  className="mt-1 min-h-11 w-full rounded-xl border bg-white px-3 text-base sm:text-sm"
                >
                  <option value="">尚未指定</option>
                  {MARKET_REGIONS.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
              <Link
                href={`/markets/detail?id=${encodeURIComponent(row.id)}`}
                className="inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4"
              >
                回原市集查看
              </Link>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="py-4 text-sm">目前沒有符合條件的未分類市集。</p>
          )}
          {filtered.length > limit && (
            <button className={button} onClick={() => setLimit((n) => n + 40)}>
              顯示更多市集
            </button>
          )}
          <button
            className={`${button} bg-primary text-white`}
            disabled={disabled || chosen.length === 0}
            onClick={prepare}
          >
            預覽補填內容
          </button>
        </section>
      )}
    </>
  );
}
