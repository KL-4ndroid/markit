# Market Mail Local Core integration

## Status

This integration is intentionally isolated on `integrate-market-mail-core` until the Market Mail package has an immutable release tag and Markit's npm lockfile is regenerated from that exact package source.

Current development pin:

```text
@market-mail/core -> KL-4ndroid/market-mail-api@1292fe65fef5e5ca69a48f97b9f2c99b8d8ea6d0
```

The target package contract is Market Mail engine contract `1.0` / bridge schema `1.0`.

## Architecture

```text
Google OAuth / token provider
        |
        v
lib/platform/contracts/gmail.ts
        |
        +-- Web: lib/platform/web/gmail-adapter.web.ts
        +-- iOS/Android: future Capacitor/native adapter
        |
        v
lib/market-mail/gmail-sync.ts
        |
        v
lib/market-mail/local-core.ts
        |
        v
@market-mail/core
        |
        +-- MIME traversal
        +-- base64url decode
        +-- parse
        +-- intake policy
        +-- local dry-run
```

`@market-mail/core` performs no Gmail network calls and does not own OAuth, persistence, background scheduling, notifications, or navigation.

## Privacy boundary

- Raw Gmail message bodies are processed locally by `@market-mail/core`.
- The core must keep `network_required=false`.
- The core must keep `raw_email_persistence_required=false`.
- Access tokens are supplied only to a platform Gmail transport and are not passed into Market Mail core.
- Markit persistence should store normalized market decisions/state, not raw Gmail bodies.
- Provider message IDs should only be retained when explicitly required by the final host contract; current integration does not add a DB schema for them.

## Gmail transport

The Web adapter is created with an external token provider:

```ts
import { createWebGmailTransport } from '@/lib/platform/web/gmail-adapter.web';

const gmail = createWebGmailTransport({
  getAccessToken: async () => obtainCurrentGoogleAccessToken(),
});
```

The adapter does not sign in, refresh, or persist tokens. It only performs the Gmail REST calls required by the shared transport contract:

- `users.getProfile`
- `users.messages.list`
- `users.history.list` with `historyTypes=messageAdded`
- `users.messages.get(format=full)`

An expired history cursor is classified as `HISTORY_EXPIRED`, allowing the host to fall back to a foreground full sync.

## Sync safety

`prepareForegroundFullSync()` captures the mailbox `historyId` before listing messages. Mail arriving during the scan is therefore visible to the next incremental sync instead of being skipped.

`prepareForegroundIncrementalSync()` only treats `messagesAdded` as new-email evidence. Label-only changes are ignored.

`commitMarketMailSyncPlan()` enforces this order:

```text
1. persist normalized Market Mail decisions/state
2. commit Gmail historyId
```

If step 1 fails, the cursor does not advance. If step 2 fails, the next sync can replay the same email and Market Mail idempotency handles duplicates. This is safer than advancing the cursor before persistence.

## Verification

After the dependency is installable:

```bash
npm install
npm run test:market-mail
npx tsc --noEmit
npx tsc --noEmit --project tsconfig.mobile.json
npm run build:mobile
```

The dedicated integration test covers:

- engine contract/privacy capabilities;
- Gmail full-message local intake;
- platform transport install/restore behavior;
- full-sync baseline history cursor capture;
- incremental zero-message cursor advancement;
- persist-before-cursor ordering;
- ephemeral bearer-token injection;
- `messagesAdded` history filtering;
- `format=full` retrieval;
- expired-history classification.

## Package / lockfile merge gate

The source package currently lives in a private repository. The development dependency is therefore pinned to an exact Git commit through SSH. This is suitable for an integration branch only when the installing environment has explicit GitHub access.

Before merging to `main`:

1. Market Mail PR #26 must be approved/merged with valid CI evidence.
2. Create an immutable `market-mail-core-v0.3.0` or newer release/tag.
3. Replace the temporary commit pin with that approved immutable distribution reference.
4. Run npm installation using the real package credential/distribution path.
5. Commit the npm-generated `package-lock.json`; do not hand-edit it.
6. Pass `npm run test:market-mail`, normal tests, TypeScript, mobile TypeScript, and mobile static-build checks.

No Gmail UI, OAuth flow, Dexie schema change, background scheduler, or notification behavior should be merged as part of this package-boundary slice.
