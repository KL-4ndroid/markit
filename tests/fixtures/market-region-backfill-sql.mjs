import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID as uuid } from "node:crypto";
export async function verifyRegionBackfillSql(
  pg,
  { owner, other, staff, asUser, check },
) {
  await pg.exec("RESET ROLE");
  const sql = readFileSync(
    "supabase/migrations/080_add_owner_region_backfill.sql",
    "utf8",
  );
  await pg.exec(sql);
  await pg.exec(sql);
  await pg.exec(
    "CREATE POLICY fixture_owner_backfill_event_read ON events FOR SELECT TO authenticated USING(actor_id=auth.uid())",
  );
  const a = uuid(),
    b = uuid(),
    c = uuid(),
    scheduled = uuid();
  await pg.query(
    "INSERT INTO markets(id,owner_id,name,location,start_date,end_date,total_revenue,total_profit,session_origin) VALUES($1,$5,'A','原地點A','2026-10-01','2026-10-02',100,50,'manual'),($2,$5,'B','原地點B','2026-10-01','2026-10-02',200,100,'manual'),($3,$5,'C','原地點C','2026-10-01','2026-10-02',0,0,'manual'),($4,$5,'Scheduled','固定營業','2026-10-01','2026-10-02',0,0,'schedule')",
    [a, b, c, scheduled, owner],
  );
  const read = async (id) =>
    (
      await pg.query(
        "SELECT id,updated_at::TEXT AS stamp,region_code,name,location,total_revenue,total_profit,is_schedule_override FROM markets WHERE id=$1",
        [id],
      )
    ).rows[0];
  const aa = await read(a),
    bb = await read(b),
    cc = await read(c),
    ss = await read(scheduled);
  const item = (row, regionCode = "tw-tainan-city") => ({
    id: row.id,
    regionCode,
    expectedUpdatedAt: row.stamp,
  });
  const batch = uuid(),
    items = [item(aa), item(bb, "tw-taipei-city")];
  const save = (list = items, id = batch) =>
    pg.query("SELECT backfill_market_regions($1,$2) result", [
      id,
      JSON.stringify(list),
    ]);
  await asUser(owner);
  await check(
    "region backfill is atomic metadata-only and an identical retry creates no duplicate events",
    async () => {
      const result = (await save()).rows[0].result;
      assert.equal(result.length, 2);
      const before = (
        await pg.query(
          "SELECT count(*) FROM events WHERE id IN(md5($1)::UUID,md5($2)::UUID)",
          [`${batch}:${a}`, `${batch}:${b}`],
        )
      ).rows[0].count;
      assert.equal(before, 2);
      await save();
      assert.equal((await read(a)).region_code, "tw-tainan-city");
      assert.equal((await read(a)).location, "原地點A");
      assert.equal((await read(a)).total_revenue, "100.00");
      assert.equal(
        (
          await pg.query(
            "SELECT count(*) FROM events WHERE id IN(md5($1)::UUID,md5($2)::UUID)",
            [`${batch}:${a}`, `${batch}:${b}`],
          )
        ).rows[0].count,
        2,
      );
    },
  );
  await check(
    "stale or already-classified rows abort the entire batch before creating any event",
    async () => {
      await assert.rejects(
        save([item(cc), item(bb)], uuid()),
        /REGION_CONFLICT/,
      );
      assert.equal((await read(c)).region_code, null);
      await assert.rejects(
        save(
          [{ ...item(cc), expectedUpdatedAt: "2020-01-01T00:00:00Z" }],
          uuid(),
        ),
        /REGION_CONFLICT/,
      );
      await assert.rejects(
        save(
          [{ ...items[0], regionCode: "tw-kaohsiung-city" }, items[1]],
          batch,
        ),
        /REGION_BATCH_CONFLICT/,
      );
    },
  );
  await check(
    "a retry after a later normal edit does not overwrite the newer classification",
    async () => {
      await pg.query("UPDATE markets SET region_code=$1 WHERE id=$2", [
        "tw-kaohsiung-city",
        a,
      ]);
      await save();
      assert.equal((await read(a)).region_code, "tw-kaohsiung-city");
    },
  );
  await check(
    "invalid codes, duplicates, empty and oversized selection are rejected",
    async () => {
      await assert.rejects(
        save([{ ...item(cc), regionCode: "新竹" }], uuid()),
        /REGION_INPUT/,
      );
      await assert.rejects(save([item(cc), item(cc)], uuid()), /REGION_INPUT/);
      await assert.rejects(save([], uuid()), /REGION_INPUT/);
      await assert.rejects(
        save(
          Array.from({ length: 21 }, () => item(cc)),
          uuid(),
        ),
        /REGION_INPUT/,
      );
      assert.equal((await read(c)).region_code, null);
    },
  );
  await check(
    "scheduled single occurrence becomes override without changing other markets",
    async () => {
      await save([item(ss)], uuid());
      assert.equal((await read(scheduled)).is_schedule_override, true);
      assert.equal((await read(c)).region_code, null);
    },
  );
  await check(
    "other owners and staff cannot bulk-classify owner metadata",
    async () => {
      for (const id of [other, staff]) {
        await asUser(id);
        await assert.rejects(save([item(cc)], uuid()), /REGION_SCOPE/);
      }
      await asUser(owner);
    },
  );
  await pg.exec("RESET ROLE");
  await pg.query("UPDATE markets SET is_deleted=TRUE WHERE id=$1", [c]);
  await asUser(owner);
  await check(
    "deleted markets cannot be classified and anon cannot execute the RPC",
    async () => {
      await assert.rejects(save([item(cc)], uuid()), /REGION_SCOPE/);
      await pg.exec("RESET ROLE");
      assert.equal(
        (
          await pg.query(
            "SELECT has_function_privilege('anon','backfill_market_regions(UUID,JSONB)','EXECUTE') allowed",
          )
        ).rows[0].allowed,
        false,
      );
    },
  );
}
