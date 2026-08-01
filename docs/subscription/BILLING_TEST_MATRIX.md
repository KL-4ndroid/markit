# Billing Test Matrix

日期：2026-07-30

狀態：S8 planning-only complete；F3A local foundation complete but not applied；S9 尚未核准

## 1. 測試策略

Billing 不能靠一筆成功付款 smoke 判定完成。正式上架需要四層證據：

1. platform-neutral domain tests；
2. provider sandbox contract tests；
3. Supabase schema / RLS / reconciliation integration tests；
4. production canary 與人工對帳證據。

測試帳號與正式帳號完全分離。Local subscription simulator 只驗 capability presentation，不能作為 billing、database mutation 或 provider transaction 證據。

## 2. 環境

| Environment | 用途 | 禁止 |
| --- | --- | --- |
| unit | price、lock、quote、state transition | network、SDK、clock implicit dependency |
| local integration | callback parser、idempotency、RLS fixture | 真卡、production key、公開 callback |
| provider sandbox | checkout、續扣、失敗、退款、callback | production entitlement、正式使用者 |
| store sandbox | Apple sandbox / Google license testing | 公開 Founder 承諾、production SKU |
| staging | 完整 server reconciliation 與 support workflow | 正式流量 |
| production canary | 最小 owner cohort 與真實對帳 | 全量 launch、未設 rollback 的 price change |

所有測試固定 UTC server clock 或明確 clock injection；不得依執行測試電腦的 locale / timezone 計算 proration。

## 3. 必備 fixtures

- owner workspace with no subscription；
- eligible Pro trial before trusted expiry；
- ineligible / expired trial；
- standard monthly / annual Pro；
- Founder annual Pro with immutable `NT$1,290` candidate assignment；
- Founder Pro in grace；
- Founder lock dormant under paid Team；
- standard Team with owner、manager、staff；
- cancelled、refunded、disputed、unknown provider states；
- duplicate-origin anomaly；
- old and new public price cohorts；
- provider callbacks duplicated、tampered、late and out of order。

## 4. Domain matrix

| ID | Case | Expected |
| --- | --- | --- |
| D01 | public price rises | existing Founder renewal amount unchanged |
| D02 | 65% initial assignment | one approved integer amount, no floating result |
| D03 | cancel scheduled | entitlement and lock stay active through paid period |
| D04 | cancellation revoked before lapse | same assignment remains active |
| D05 | retry succeeds during grace | active restored, no new Founder acquisition |
| D06 | grace expires unpaid | entitlement inactive and lock forfeited |
| D07 | resubscribe after forfeiture | current public price, historical Founder price rejected |
| D08 | Pro -> Team | Team current price; Founder discount never applied to Team |
| D09 | Team -> Pro with continuity | effective at boundary; dormant Founder amount restored |
| D10 | Team lapses without replacement | dormant Founder lock forfeited at actual lapse |
| D11 | stale / replayed quote | no charge and explicit conflict / refresh required |
| D12 | quote missing exact values | fields stay null; UI does not estimate |
| D13 | non-owner requests billing change | fail closed |
| D14 | simulation / query / localStorage claims Team | no billing or protected-write authority |
| D15 | provider state unknown | paid writes fail closed with visible recovery action |

## 5. Web provider sandbox matrix

NewebPay is not activated until every required case has dated evidence from the actual merchant sandbox / contract.

| ID | Case | Evidence / acceptance |
| --- | --- | --- |
| W01 | merchant and domain onboarding | approved merchant id and reviewed production domain |
| W02 | monthly Pro first charge | provider transaction id, callback, query and projection agree |
| W03 | annual Pro first charge | amount / period / next charge agree |
| W04 | Founder annual first charge | exactly one approved TWD amount and immutable assignment |
| W05 | monthly and annual Team | correct current Team price version |
| W06 | callback authenticity | tampered checksum / signature rejected before processing |
| W07 | duplicate callback | one ledger effect, one entitlement effect |
| W08 | out-of-order callback | older event cannot regress newer query result |
| W09 | provider timeout | no false success; idempotent retry recovers |
| W10 | failed renewal | past_due / grace mapping matches contracted behavior |
| W11 | successful reauthorization | active restored without duplicate period |
| W12 | cancel and revoke cancel | access ends only at intended paid boundary; reversal behavior verified |
| W13 | partial and full refund | ledger, entitlement and Founder rules reconcile |
| W14 | chargeback / dispute | support alert and fail-closed policy verified |
| W15 | modify amount / cycle / status | only approved APIs used; next charge confirmed by provider query |
| W16 | card expiry / update | documented provider behavior and user recovery path |
| W17 | webhook replay after deploy | durable inbox prevents duplicate money movement |
| W18 | provider outage recovery | scheduled reconciliation repairs missed callbacks |
| W19 | settlement reconciliation | provider report totals match transaction ledger by currency |
| W20 | cancellation UX | owner can schedule/revoke where supported and sees exact effective date |

If NewebPay fails a blocking case, record the failure before testing ECPay. ECPay must pass the same business outcomes; provider-specific API names do not lower the acceptance bar.

## 6. Upgrade / downgrade matrix

| ID | Case | Expected |
| --- | --- | --- |
| U01 | standard Pro monthly -> Team monthly | exact signed quote; Team only after confirmed charge |
| U02 | Founder annual Pro -> Team annual | unused value uses actual NT$1,290 payment; Team has no 65% discount |
| U03 | quote generated near period boundary | UTC boundary and rounding deterministic |
| U04 | quote expires before confirmation | provider not called or old quote rejected |
| U05 | double-click / client retry | one plan-change intent and one charge |
| U06 | Team charge rejected | original Pro and Founder active remain unchanged |
| U07 | Team charge succeeds, callback lost | provider query repairs Team projection without recharging |
| U08 | Team charge succeeds, refund fails | Team active, durable customer liability, alert, no duplicate refund |
| U09 | stale Pro transaction snapshot | quote invalidated and refreshed |
| U10 | Team -> standard Pro | scheduled at verified renewal boundary |
| U11 | Team -> Founder Pro | dormant assignment restored only with unbroken continuity |
| U12 | downgrade transaction fails | Team enters provider recovery behavior; no premature Pro projection |
| U13 | cancellation scheduled while downgrade pending | one deterministic replacement/cancel outcome, no dual future charge |
| U14 | cross-origin plan change | blocked and routed to support migration |

Self-serve Pro -> Team remains disabled if `server_signed_quote` correctness, provider-confirmed credit / refund, or recoverable saga evidence is incomplete.

## 7. Security、RLS 與 abuse matrix

| ID | Case | Expected |
| --- | --- | --- |
| S01 | unauthenticated callback management / reconcile route | denied |
| S02 | valid provider callback without user session | accepted only through provider verification path |
| S03 | forged owner UUID / price / plan in client payload | ignored or denied |
| S04 | staff creates checkout / cancel / upgrade | denied by server and RLS / RPC |
| S05 | owner reads another workspace billing record | denied |
| S06 | service role writes invalid transition | database constraint / domain validation blocks or audits |
| S07 | callback secret appears in logs | test fails; logs are redacted |
| S08 | raw payload contains personal/payment data | access and retention controls verified |
| S09 | replayed event id after process restart | exactly-once business effect |
| S10 | concurrent cancellation and renewal | provider query yields one final projection |
| S11 | concurrent upgrade requests | one single-use quote wins |
| S12 | admin / promotion grant | cannot create transaction or Founder lock |
| S13 | local simulator enabled | provider routes and database writes remain unavailable |
| S14 | unknown entitlement freshness | protected writes fail closed, reads use approved policy only |

## 8. Native and cross-platform matrix

這一節是未來 Gate 2，不能被解讀為恢復 Capacitor 實作。

| ID | Case | Expected |
| --- | --- | --- |
| N01 | Web paid owner signs into iOS / Android | same owner UUID receives existing entitlement |
| N02 | iOS new digital purchase | Apple IAP path; no Web checkout steering in Taiwan build |
| N03 | Android new digital purchase | Play Billing path; no unapproved external payment steering |
| N04 | native purchase available | regular Pro / Team products exist in the corresponding store |
| N05 | store notification duplicated / reordered | normalized reconciliation remains idempotent |
| N06 | app account email changes | billing identity remains owner UUID |
| N07 | Apple / Google price change | existing cohort and consent behavior match current store rules |
| N08 | store grace / account hold | current store status queried; duration not hardcoded |
| N09 | Web Founder uses native app | entitlement works without a second subscription |
| N10 | native Founder acquisition | remains disabled until cancellation and dormant restore are proven |
| N11 | active Web and store purchase collide | no double entitlement; self-service changes frozen for support |
| N12 | account transfer | blocked or completed only by audited migration flow |

## 9. Product regression matrix

Billing 上線前仍必須保留現有 capability 與資料安全證據：

- Free / Pro / Team presentation smoke at 390、768、1440、1920 widths；
- Free 的 basic settlement 可以使用，但單場基本分析與復盤仍是 Pro；
- PDF 依方案阻擋，owner-only 權限不退化；
- Team manager / staff 的 RLS、RPC、invite、suspend、restore 與 role transition；
- downgrade 不刪除歷史 markets、products、photos、reports 或 memberships；
- photo upload、settlement、analytics 與 Team writes 都在 server 重新驗 entitlement；
- actual Team state-transition smoke 必須使用隔離 owner / manager / staff fixture；simulation smoke 不算；
- auth cache、pending writes、offline recovery 與 cloud-rebuild-first guardrails 不退化。

## 10. 上架 gates 與證據

| Gate | 交付 | Pass condition |
| --- | --- | --- |
| B0 Commercial | merchant、費率、稅務、發票、terms、refund policy | owner sign-off and dated evidence |
| B1 Domain | F1 price / lock / quote resolver | pure tests pass; no provider import |
| B2 Data security | F3 logical schema -> separately approved migrations / RLS | F3A local guard passes; live verification and later slice reviews remain required |
| B3 Provider contract | callback verifier、adapter、sandbox query | W01-W20 required set passes |
| B4 Lifecycle | reconciliation worker、support recovery、observability | duplicate/out-of-order/outage tests pass |
| B5 Checkout | owner-only Web purchase/cancel/upgrade UI | truthful states and accessibility pass |
| B6 Staging | complete payment, renewal, refund, downgrade and Team fixture | zero unresolved P0/P1 billing defects |
| B7 Production canary | limited owner cohort, daily settlement and rollback | explicit go/no-go review |
| B8 Web launch | monitoring、support roster、status / incident process | launch checklist signed |
| N0 Native policy | fresh Apple / Google review | separate approval after Web launch |

每次 provider evidence 建議保存於：

```text
docs/subscription/evidence/billing/<provider>/<yyyy-mm-dd>/
```

不得提交 production secret、完整付款人資料、卡片資訊或未遮蔽 callback payload。

## 11. Stop conditions

發生以下任一情況就停止上線：

- 商家審核、定期定額或必要異動 API 未核准；
- provider 無法查詢 authoritative current state；
- callback 無法可靠驗證、去重或處理 out-of-order；
- Founder fixed renewal、forfeiture 或 dormant restore 無法對帳；
- Pro -> Team 可能遺失 unused actual-paid value；
- UI 需要以 client clock / local formula 猜最終 charge、refund 或生效日；
- 雙重 billing origin 沒有凍結與人工修復流程；
- refund、dispute、invoice、tax、privacy 或 support owner 未明確；
- actual Team database transition smoke 未完成；
- deployment、monitoring、backup、rollback 或 incident response 未驗證；
- Apple / Google 政策不是在送審前重新查證。

## 12. S8 completion evidence

S8 的完成只代表：

- provider direction 與 fallback 已文件化；
- shared lifecycle、Founder 與 plan-change contract 已文件化；
- launch test matrix 與 stop conditions 已建立；
- 沒有 SDK、checkout、callback route 或 production billing state 被建立；F3A local migration 是另行審查的 non-billable foundation，尚未套用。

F1 純 model、F3 data/security/read-contract design 與 F3A local migration `066` 已完成；
`066` 尚未套用，F3B-F3E、S9、provider implementations 與 F4 仍需各自明確核准，
F2 仍受 truthful billing availability 阻擋。
