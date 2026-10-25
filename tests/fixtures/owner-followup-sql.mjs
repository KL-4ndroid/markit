import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID as uuid } from "node:crypto";
export async function verifyOwnerFollowupSql(
  pg,
  { owner, other, staff, asUser, check },
) {
  await pg.exec("RESET ROLE");
  for (const file of [
    "076_add_private_market_journals.sql",
    "078_add_optional_market_cash_records.sql",
    "081_add_owner_followup_workflows.sql",
  ])
    await pg.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  await pg.exec(
    readFileSync(
      "supabase/migrations/081_add_owner_followup_workflows.sql",
      "utf8",
    ),
  );
  await pg.exec(
    "CREATE POLICY fixture_followup_event_read ON events FOR SELECT TO authenticated USING(actor_id=auth.uid())",
  );
  const source = uuid(),
    target = uuid(),
    foreign = uuid(),
    note = uuid(),
    venue = uuid(),
    s1 = uuid(),
    s2 = uuid();
  const today = (
    await pg.query(
      "SELECT (now() AT TIME ZONE 'Asia/Taipei')::DATE::TEXT AS day_key",
    )
  ).rows[0].day_key;
  await pg.query(
    "INSERT INTO markets(id,owner_id,name,location,start_date,end_date,status) VALUES($1,$4,'心得來源','原地點',CURRENT_DATE-2,CURRENT_DATE-1,'completed'),($2,$4,'目標市集','原地點',CURRENT_DATE+1,CURRENT_DATE+2,'registered'),($3,$5,'其他品牌','地點',CURRENT_DATE+1,CURRENT_DATE+2,'registered')",
    [source, target, foreign, owner, other],
  );
  await pg.query(
    "INSERT INTO market_journals(id,market_id,owner_id,author_id,business_date,body,revision,mutation_id) VALUES($1,$2,$3,$3,NULL,'提早停車。私人感想不公開。',1,$4)",
    [note, source, owner, uuid()],
  );
  await pg.query(
    "INSERT INTO venues(id,owner_id,name,address,status,created_at,updated_at) VALUES($1,$2,'共用場地','地址原文','active',NOW(),NOW())",
    [venue, owner],
  );
  for (const id of [s1, s2])
    await pg.query(
      "INSERT INTO operation_schedules(id,owner_id,venue_id,timezone,recurrence,start_time,end_time,status,created_at,updated_at) VALUES($1,$2,$3,'Asia/Taipei','{\"frequency\":\"weekly\",\"interval\":1,\"weekdays\":[1]}','10:00','18:00','active',NOW(),NOW())",
      [id, owner, venue],
    );
  const occurrence = async (extras = {}) => {
    const id = uuid();
    await pg.query(
      "INSERT INTO markets(id,owner_id,name,location,start_date,end_date,status,session_origin,venue_id,schedule_id,schedule_occurrence_state,is_schedule_override,total_revenue,total_profit) VALUES($1,$2,'固定營業','地址原文',CURRENT_DATE+$3::INTEGER,CURRENT_DATE+$3::INTEGER,$4,'schedule',$5,$6,$7,$8,0,0)",
      [
        id,
        owner,
        extras.offset ?? 3,
        extras.status ?? "registered",
        venue,
        extras.schedule ?? s1,
        extras.state ?? "scheduled",
        extras.override ?? false,
      ],
    );
    return id;
  };
  const a = await occurrence(),
    b = await occurrence({ schedule: s2 }),
    past = await occurrence({ offset: -1 }),
    override = await occurrence({ override: true }),
    cancel = await occurrence({ status: "cancelled" }),
    activity = await occurrence(),
    privateNote = await occurrence(),
    cash = await occurrence();
  await pg.query(
    "INSERT INTO events(id,type,payload,actor_id,market_id,timestamp) VALUES($1,'checklist_item_created',$2,$3,$4,now())",
    [
      uuid(),
      JSON.stringify({
        market_id: activity,
        itemId: uuid(),
        text: "既有待辦",
        completed: true,
      }),
      owner,
      activity,
    ],
  );
  await pg.query(
    "INSERT INTO market_journals(id,market_id,owner_id,author_id,body,revision,mutation_id) VALUES($1,$2,$3,$3,'受保護心得',1,$4)",
    [uuid(), privateNote, owner, uuid()],
  );
  await pg.query(
    "INSERT INTO market_cash_records(market_id,business_date,owner_id,data,revision,mutation_id) VALUES($1,CURRENT_DATE+3,$2,$3,1,$4)",
    [
      cash,
      owner,
      JSON.stringify({
        opening: { mode: "total", amount: "100" },
        closing: { mode: "none" },
        note: "",
      }),
      uuid(),
    ],
  );
  const apply = (
    texts = ["提早30分鐘停車"],
    id = uuid(),
    marketId = target,
    revision = 1,
    journalId = note,
  ) =>
    pg.query("SELECT apply_journal_checklist($1,$2,$3,$4,$5) result", [
      id,
      journalId,
      revision,
      marketId,
      JSON.stringify(texts),
    ]);
  const preview = async () =>
    (await pg.query("SELECT preview_venue_region_change($1) result", [venue]))
      .rows[0].result;
  const classify = (p, id = uuid(), region = "tw-tainan-city") =>
    pg.query("SELECT apply_venue_region_change($1,$2,$3) result", [
      id,
      JSON.stringify(p),
      region,
    ]);
  await asUser(owner);
  await check(
    "081 default grants defeated, receipt private and writer grants restricted",
    async () => {
      await assert.rejects(
        pg.query("SELECT * FROM owner_workflow_receipts"),
        (e) => e.code === "42501",
      );
      await assert.rejects(
        pg.query(
          "INSERT INTO owner_workflow_receipts(id,owner_id,kind,request,result) VALUES($1,$2,'journal_tasks','{}','{}')",
          [uuid(), owner],
        ),
        (e) => e.code === "42501",
      );
    },
  );
  const request = uuid();
  let result;
  await check(
    "081 only owner-confirmed task text reaches checklist events, private journal unchanged",
    async () => {
      result = (await apply(["提早30分鐘停車", "帶推車"], request)).rows[0]
        .result;
      assert.equal(result.appliedCount, 2);
      assert.ok(
        result.events.every(
          (e) =>
            e.type === "checklist_item_created" &&
            e.payload.completed === false,
        ),
      );
      assert.ok(!JSON.stringify(result.events).includes("私人感想"));
      assert.ok(!JSON.stringify(result.events).includes(note));
      assert.equal(
        (
          await pg.query(
            "SELECT body,revision FROM market_journals WHERE id=$1",
            [note],
          )
        ).rows[0].revision,
        1,
      );
      assert.equal(
        (
          await pg.query("SELECT total_revenue FROM markets WHERE id=$1", [
            target,
          ])
        ).rows[0].total_revenue,
        "0.00",
      );
    },
  );
  await check(
    "081 retry returns original receipt, cannot change request content",
    async () => {
      assert.deepEqual(
        (await apply(["提早30分鐘停車", "帶推車"], request)).rows[0].result,
        result,
      );
      await assert.rejects(apply(["changed"], request), /FOLLOWUP_CONFLICT/);
      assert.equal(
        (
          await pg.query("SELECT count(*) n FROM events WHERE market_id=$1", [
            target,
          ])
        ).rows[0].n,
        2,
      );
    },
  );
  await check(
    "081 later apply skips existing text including completed items without resetting",
    async () => {
      const itemId = result.events[0].payload.itemId;
      await pg.query(
        "INSERT INTO events(id,type,payload,actor_id,market_id,timestamp) VALUES($1,'checklist_item_updated',$2,$3,$4,clock_timestamp()+interval '1 second')",
        [
          uuid(),
          JSON.stringify({ market_id: target, itemId, completed: true }),
          owner,
          target,
        ],
      );
      const next = (await apply(["提早30分鐘停車", "帶推車"])).rows[0].result;
      assert.equal(next.appliedCount, 0);
      assert.equal(next.skippedCount, 2);
    },
  );
  await check(
    "081 invalid/duplicate/oversized tasks and stale source rejected",
    async () => {
      for (const texts of [
        [],
        [""],
        ["a", "a"],
        ["字".repeat(201)],
        ["a\nb"],
        Array(21).fill("x"),
      ])
        await assert.rejects(apply(texts), /FOLLOWUP_INPUT/);
      await assert.rejects(
        apply(["item"], uuid(), target, 99),
        /FOLLOWUP_CONFLICT/,
      );
      await assert.rejects(apply(["item"], uuid(), source), /FOLLOWUP_SCOPE/);
      await assert.rejects(apply(["item"], uuid(), foreign), /FOLLOWUP_SCOPE/);
    },
  );
  await check(
    "081 completed/cancelled/past targets rejected before writing",
    async () => {
      await assert.rejects(apply(["item"], uuid(), cancel), /FOLLOWUP_TARGET/);
      await assert.rejects(apply(["item"], uuid(), past), /FOLLOWUP_TARGET/);
    },
  );
  await check(
    "081 legacy payload-only checklist text is deduplicated",
    async () => {
      await pg.query(
        "INSERT INTO events(id,type,payload,actor_id,market_id,timestamp) VALUES($1,'checklist_item_created',$2,$3,NULL,clock_timestamp())",
        [
          uuid(),
          JSON.stringify({
            marketId: target,
            itemId: uuid(),
            text: "舊版待辦",
            completed: true,
          }),
          owner,
        ],
      );
      const legacy = (await apply(["舊版待辦"])).rows[0].result;
      assert.equal(legacy.appliedCount, 0);
      assert.equal(legacy.skippedCount, 1);
    },
  );
  let plan;
  await check(
    "081 authoritative venue preview protects past/overrides/activity/cash/private journals",
    async () => {
      plan = await preview();
      assert.equal(plan.day, today);
      assert.equal(plan.schedules.length, 2);
      assert.deepEqual(
        plan.markets
          .filter((m) => m.eligible)
          .map((m) => m.id)
          .sort(),
        [a, b].sort(),
      );
      assert.ok(!plan.markets.some((m) => m.id === past));
      assert.equal(plan.markets.filter((m) => !m.eligible).length, 5);
    },
  );
  await check("081 stale venue preview aborts all writes", async () => {
    await pg.query("UPDATE markets SET name='另一裝置更正' WHERE id=$1", [a]);
    await assert.rejects(classify(plan), /FOLLOWUP_CONFLICT/);
    assert.equal(
      (await pg.query("SELECT region_code FROM venues WHERE id=$1", [venue]))
        .rows[0].region_code,
      null,
    );
  });
  await check(
    "081 a newly saved private journal invalidates a preview without changing the market stamp",
    async () => {
      const old = await preview(),
        newNote = uuid();
      await pg.exec("RESET ROLE");
      await pg.query(
        "INSERT INTO market_journals(id,market_id,owner_id,author_id,body,revision,mutation_id) VALUES($1,$2,$3,$3,'另一裝置剛保存',1,$4)",
        [newNote, a, owner, uuid()],
      );
      await asUser(owner);
      await assert.rejects(classify(old), /FOLLOWUP_CONFLICT/);
      await pg.exec("RESET ROLE");
      await pg.query("DELETE FROM market_journals WHERE id=$1", [newNote]);
      await asUser(owner);
    },
  );
  const batch = uuid();
  let classification;
  await check(
    "081 venue default and eligible occurrences commit together, protected data unchanged",
    async () => {
      plan = await preview();
      classification = (await classify(plan, batch)).rows[0].result;
      assert.equal(classification.updatedCount, 2);
      assert.equal(classification.protectedCount, 5);
      assert.equal(classification.events.length, 3);
      for (const id of [a, b])
        assert.equal(
          (await pg.query("SELECT region_code FROM markets WHERE id=$1", [id]))
            .rows[0].region_code,
          "tw-tainan-city",
        );
      for (const id of [past, override, cancel, activity, privateNote, cash])
        assert.equal(
          (await pg.query("SELECT region_code FROM markets WHERE id=$1", [id]))
            .rows[0].region_code,
          null,
        );
      assert.equal(
        (await pg.query("SELECT address FROM venues WHERE id=$1", [venue]))
          .rows[0].address,
        "地址原文",
      );
    },
  );
  await check(
    "081 venue retry is idempotent; old preview and altered retry are refused",
    async () => {
      assert.deepEqual(
        (await classify(plan, batch)).rows[0].result,
        classification,
      );
      await assert.rejects(
        classify(plan, batch, "tw-taipei-city"),
        /FOLLOWUP_CONFLICT/,
      );
      await assert.rejects(classify(plan), /FOLLOWUP_CONFLICT/);
    },
  );
  await check(
    "081 explicit clearing of venue classification is supported",
    async () => {
      const next = await preview();
      assert.equal(
        (await classify(next, uuid(), null)).rows[0].result.updatedCount,
        2,
      );
      assert.equal(
        (await pg.query("SELECT region_code FROM venues WHERE id=$1", [venue]))
          .rows[0].region_code,
        null,
      );
    },
  );
  await asUser(other);
  await check(
    "081 unrelated owner cannot read preview or transfer another private journal",
    async () => {
      await assert.rejects(preview(), /FOLLOWUP_SCOPE/);
      await assert.rejects(apply(), /FOLLOWUP_SCOPE/);
      await assert.rejects(classify(plan), /FOLLOWUP_SCOPE/);
    },
  );
  await asUser(staff);
  await check(
    "081 manager cannot read owner journal, transfer or edit venue region",
    async () => {
      await assert.rejects(preview(), /FOLLOWUP_SCOPE/);
      await assert.rejects(apply(), /FOLLOWUP_SCOPE/);
      await assert.rejects(classify(plan), /FOLLOWUP_SCOPE/);
    },
  );
  await pg.exec("RESET ROLE; SET ROLE anon");
  await check("081 anonymous cannot execute RPC or read receipts", async () => {
    await assert.rejects(preview(), (e) => e.code === "42501");
    await assert.rejects(apply(), (e) => e.code === "42501");
    await assert.rejects(
      pg.query("SELECT * FROM owner_workflow_receipts"),
      (e) => e.code === "42501",
    );
  });
  await pg.exec("RESET ROLE");
}
