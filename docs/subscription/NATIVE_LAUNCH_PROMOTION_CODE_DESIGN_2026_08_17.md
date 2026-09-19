# Native Launch Promotion Code Design

Date: 2026-08-17

Status: Step 1B policy and campaign operations approved on 2026-08-17; uninterrupted-price mechanism requires two-store sandbox proof; runtime implementation remains blocked by Phase 2 Gate 2 and a separately reviewed implementation slice

Related policy item: `commercial.launch-promo`

## 1. Product intent

Féria will provide a discoverable promotion-code entry for the first native subscription launch. The approved campaign gives eligible Taiwan new subscribers a 50% discount to Pro and Team monthly/annual subscriptions using the nearest supported store price point. Anyone who starts during the 90-day campaign retains the applicable plan price on every uninterrupted renewal. A lapse forfeits the launch price.

The entry should appear in Subscription Center after plan selection and before the purchase button as a collapsed “有優惠碼？” section. After validation, the confirmation area must show the store-returned introductory price, duration, and standard renewal price before purchase.

## 2. Cross-store behavior

### Apple

- Apple offer codes are not sufficient for this policy: their discounted renewal duration is bounded, including at most 12 months for a monthly subscription and one year for an annual subscription.
- Candidate topology: a dedicated launch-price subscription product/cohort selected only after authenticated Féria campaign validation. Its supported store price remains attached to continuous subscribers after the acquisition window closes.
- Before adoption, sandbox testing must prove that the product cannot be obtained through App Store subscription-management paths by an ineligible user, that existing subscribers keep renewing after new acquisition closes, and that lapse/restore/crossgrade behavior matches policy.
- If Apple cannot prove those properties, Féria must revise the promise or defer the campaign on iOS; the client must not emulate the renewal discount.

### Google Play

- Google Play subscription promo codes grant free trials, and discounted offer phases end by returning to base-plan pricing; neither fulfills an indefinite uninterrupted price.
- Candidate topology: a dedicated launch-price auto-renewing base plan or equivalent cohort. Féria validates the public campaign code and returns only the bounded base-plan/offer selector for an eligible owner.
- After the 90-day acquisition window, disable new purchases without ending the existing price cohort. Google states that inactive base plans/offers continue existing subscriptions and that legacy price cohorts keep their price until a plan change or an explicit cohort migration.
- The Android adapter must use current Play-returned product details and the backend must verify the purchase token before entitlement changes.

## 3. Shared contract boundary

Shared business logic may own:

- normalized campaign-code input validation;
- eligibility result types and user-safe failure reasons;
- the selected plan, campaign identifier, and expected offer selector;
- display requirements for the launch price, renewal continuity, and price-loss conditions;
- single-use, campaign-window, stacking, and rate-limit policy;
- analytics events that never contain raw promotion codes or store purchase tokens.

Platform adapters own StoreKit redemption UI, Play Billing offer discovery, and purchase initiation. Shared code must not import `@capacitor/*`, StoreKit, or Play Billing packages.

## 4. Fail-closed rules

- A syntactically valid code is not an approved discount.
- Never calculate the charge or 50% price in the client.
- Never grant entitlement from campaign validation alone.
- Show only localized price phases returned by the active store.
- If the expected launch-price product/cohort is absent, expired, ineligible, mismatched, or cannot be verified, stop purchase with a recoverable message and retain the standard-price choice separately.
- Rate-limit validation by authenticated owner, device/session signal, and network risk controls without logging raw codes.
- A redeemed campaign cannot be transferred between Féria owners or store accounts.
- Restore and cross-platform sign-in restore entitlement from verified store/server state, not from a remembered code.

## 5. Approved policy

- Pro monthly and annual: nearest supported 50%-off store price on every uninterrupted renewal; eligible buyers may first use the approved 14-day Pro trial.
- Team monthly and annual: nearest supported 50%-off store price on every uninterrupted renewal; Team has no launch trial.
- New paid subscribers only, Taiwan storefront only.
- One launch-promotion redemption per Féria owner and eligible store account.
- The approved 14-day Pro trial may stack before the launch-price renewal. Founder and other discounts may not stack.
- The displayed discounted amount must be the nearest supported store price point returned by the active store; the client must not promise an unsupported fractional amount.
- Effective subscription lapse, approved full refund, chargeback, abuse finding, or a disqualifying plan transition forfeits the launch price. Billing retry and approved grace preserve it until the store reports effective expiry. Verified Google account hold pauses entitlement but reserves the launch-price cohort while Play still reports the subscription recoverable; recovery restores entitlement, while `EXPIRED`/`REVOKED` forfeits the price.
- Trial cancellation turns off the first paid renewal. Access continues only to the verified trial expiry, after which the launch-price continuity is forfeited if renewal was not restored. A trial that has started remains consumed under the one-trial-per-owner/store policy.
- Verified Pro → Team replacement preserves `FERIA50` by selecting the corresponding Team monthly/annual launch-price cohort without a lapse. A Pro-trial upgrade requires explicit immediate-charge confirmation, ends the remaining trial, and starts paid Team with no Team trial. Failed or unverified replacement leaves the existing Pro state unchanged.
- Verified Team → Pro downgrade is scheduled for the next renewal boundary and preserves `FERIA50` by selecting the corresponding Pro monthly/annual launch-price cohort without a lapse. It grants no new Pro trial. Team remains active until the boundary; failed, canceled, pending, or unverified change leaves Team unchanged.
- Turning off renewal preserves entitlement and `FERIA50` only through the verified paid/trial expiry. Restoring renewal before that time preserves continuity. Verified effective expiry, full refund, chargeback, or revocation forfeits the launch price; later resubscription uses the then-current standard price and cannot reuse the consumed code.
- Future public-price changes do not recalculate `FERIA50`: an uninterrupted subscriber keeps the fixed store launch-cohort price originally acquired for the applicable plan. Ending or migrating that cohort requires a separate product/accounting decision and store-compliant notice/consent flow.

## 6. Approved campaign operations

- Public code: `FERIA50`, normalized as trimmed ASCII uppercase.
- Start: canonical server-owned native `publicLaunchAt` timestamp.
- End: 90 calendar days after `publicLaunchAt`; internally stored in UTC and displayed in Asia/Taipei for Taiwan campaign copy.
- Redemption cap: none imposed by Féria. Storefront technical and fair-use limits still apply.
- Early stop: no volume-based or discretionary marketing stop. Emergency suspension remains allowed for security, fraud, legal, or storefront-safety reasons and must be recorded as an incident.
- The server owns timestamps, eligibility, acquisition closure, and redemption decisions.

## 7. Required continuity mechanism evidence

The approved promise is not implementable with a finite offer phase alone. Before public activation, both stores must prove:

1. an eligible new subscriber can acquire the monthly and annual launch price;
2. an ineligible or expired-code user cannot acquire that price through the app or store management UI;
3. renewal remains at the store-returned launch price after the 90-day acquisition window closes;
4. the 14-day free trial can precede the first launch-price charge on monthly and annual Pro, cancellation causes no first charge, and repeat-trial attempts are denied;
5. retry and approved grace preserve continuity while effective expiry forfeits it;
6. cancellation, resubscription, refund, chargeback, restore, monthly/annual change, Pro/Team crossgrade, and device/account restore follow the recorded policy;
7. closing new acquisition does not cancel or migrate existing subscribers;
8. server verification can distinguish the launch cohort without trusting client state.

## 8. Later implementation and evidence

After Phase 2 Gate 2 is complete and the runtime slice is reviewed:

1. Add the shared promotion eligibility contract and server endpoint.
2. Add the Subscription Center entry and store-authoritative price-phase confirmation UI.
3. Add Apple and Android platform adapters without importing native SDKs into shared domain code.
4. Prove valid, invalid, expired, already-used, ineligible, offline, rate-limited, and offer-mismatch paths.
5. Prove monthly and annual renewal transitions in both store sandboxes.
6. Verify server-side Apple transaction and Google purchase-token evidence before entitlement.
7. Record screenshots, test accounts, transaction references, timestamps, and release SHA without committing secrets or raw purchase tokens.

## 9. Official references checked

- Apple subscription offer codes: https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-subscription-offer-codes/
- Apple subscription pricing and preserved prices: https://developer.apple.com/help/app-store-connect/manage-subscriptions/manage-pricing-for-auto-renewable-subscriptions/
- Apple subscription pricing duration reference: https://developer.apple.com/help/app-store-connect/reference/pricing-and-availability/in-app-purchase-and-subscriptions-pricing-and-availability
- Google Play promo codes: https://developer.android.com/google/play/billing/promo
- Google Play subscription offers and base plans: https://support.google.com/googleplay/android-developer/answer/12154973
- Google Play subscription price changes and legacy cohorts: https://developer.android.com/google/play/billing/price-changes
- Google Play Billing integration: https://developer.android.com/google/play/billing/integrate
- Google Play purchase verification guidance: https://developer.android.com/google/play/billing/security
