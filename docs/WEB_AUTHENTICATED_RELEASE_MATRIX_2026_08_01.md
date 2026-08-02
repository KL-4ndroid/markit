# Web Authenticated Release Matrix Evidence

Date: 2026-08-02

Status: partial evidence only; `STAGING-E2E` remains `evidence_missing`

Latest public release revision: `3369ff622ca1214bedc9aa43beee77dc96f6c3ae`

Original browser matrix revision: `cac6fa6f7ffcf02779b0f3e66fb00ec9f4314250`

Origins checked:

- Production: `https://markit-app-mocha.vercel.app`
- Local validation harness: `http://localhost:3000`

## Safety And Evidence Boundary

- The original browser matrix reused existing authenticated sessions. No credential was
  entered during that browser run or copied, persisted, or included in this artifact.
- No subscription, billing, invitation, role, staff, market, product, or media row was
  created, changed, or deleted.
- Evidence contains only plan decisions, control states, release identity, and sanitized
  result summaries. It contains no account identifiers, invitation links, browser state,
  tokens, cookies, customer data, or report contents.
- Local subscription simulation was disabled before the browser run ended.

## Production Free Owner

The authenticated Production account resolved to the real Free capability source. The
deployment health route reported version `0.1.0`, commit `cac6fa6`, and build time
`2026-08-01T12:23:18.390Z`.

| Surface | Result |
| --- | --- |
| `/analytics` | Recent-three Free preview remained available. Single-market review and paid analytics showed the Pro requirement. |
| `/reports/settlement` | Free basic summary remained available. The paid report model and PDF action were absent. |
| `/settings/team` | The Team requirement was shown. Invitation and restore controls were disabled. A retained `suspended_by_plan` relationship stayed readable without workspace restoration. |
| Downgrade cleanup | Revoking a retained relationship remained available by design. The S6E contract permits Free/Pro owners to revoke retained staff or delete old invitation links while blocking new collaboration writes. No cleanup action was executed. |
| Browser runtime | No console warning or error was observed on the three checked surfaces. |

## Local Free, Pro, And Team Harness

The loopback-only, authenticated, in-memory simulator was enabled for the matrix and then
disabled. It did not grant or attempt a paid server write.

| Simulated plan | Analytics | Settlement and PDF | Team collaboration |
| --- | --- | --- | --- |
| Free | Recent-three preview remained available; paid analytics and single-market review were blocked. | Free summary remained available; the paid report and PDF action were absent. | Team requirement remained visible; invitation, role, restore, and new-link writes were disabled. |
| Pro | Advanced analytics and single-market review were available. | Full report and the owner PDF preview action were available. | Team requirement remained visible and collaboration writes stayed disabled. |
| Team | Inherited the Pro analytics surface. | Inherited the full report and PDF preview action. | Team presentation gate was removed, while invitation, role, restore, delete, and link writes all stayed disabled because simulation is not write authority. |

The Pro PDF action was invoked without a console warning or error. The in-app browser did
not expose the generated blob preview as an inspectable tab, so this run does not claim a
representative PDF output artifact. Existing deterministic PDF render tests remain the
local artifact evidence.

## 2026-08-02 Backend Transition Evidence

The guarded live transition smoke ran against the cloud target configured by
`.env.local`, using two random confirmed auth fixtures and one isolated market. All 57
checks passed and cleanup removed both auth users and cascading fixture rows.

The covered lifecycle was:

- default/explicit Free and admin Pro denied invitation, link, role, and restore writes;
- admin Team allowed email invitation, link creation and cleanup, staff acceptance, and
  viewer to operator to manager transitions;
- Team to Pro suspended the relationship, removed staff membership, and removed owner
  and market scope;
- Pro to Free preserved suspension;
- Team re-upgrade did not auto-restore access;
- explicit owner restore recreated membership and staff scope.

This is server/RPC lifecycle evidence, not Production UI evidence. The configured local
cloud target and the Supabase target embedded in Production are different, as confirmed
by value-free public-config comparison.

## 2026-08-02 Production Sync Intake Attempt

Production commit `3369ff6` passed exact health, both GitHub Actions runs, Production
deployment, all four public release checks, unauthenticated `401` denial, and
`capacitor://localhost` preflight. The guarded authenticated intake then failed closed:

- a disposable auth fixture from the local cloud target was rejected by Production and
  was deleted successfully;
- the supplied test account was rejected as invalid by the Production auth target;
- no synthetic sync incident was accepted in either attempt;
- no credential, token, public config value, target identifier, or account identifier was
  recorded.

A valid dedicated account in the Production target is required before authenticated
sync-incident intake can be claimed.

## Still Required

This run does not prove or close:

- paid Production Pro and Team owner states;
- authenticated sync-incident intake using a valid Production-target test account;
- Production viewer, operator, and manager sessions;
- real Team invitation, role transition, downgrade client cleanup, re-upgrade, and
  explicit restore UI flows on the selected release deployment;
- offline pending-write, reconnect, blocked sign-out, and cloud-rebuild recovery;
- an inspectable representative PDF output from a paid deployment state;
- authorized and denied media workflows after Production media activation;
- final required viewports, PWA install/update, or release-candidate repetition.

`STAGING-E2E` therefore remains fail closed at `evidence_missing`.
