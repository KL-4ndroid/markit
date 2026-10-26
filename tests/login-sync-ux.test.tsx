import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SyncStatus } from '../lib/sync/sync-runtime-state';
import { getInitialSyncPresentation } from '../lib/sync/initial-sync-presentation';
import { RecordSyncStatus } from '../components/common/RecordSyncStatus';
import { InitialSyncContent } from '../components/sync/InitialSyncContent';
import { RoleAccessNotice } from '../components/auth/RoleAccessNotice';
import { GlobalLoadingSkeleton } from '../components/auth/GlobalLoadingSkeleton';

const base = { status: SyncStatus.SYNCING, pendingCount: 0, isOnline: true, isTakingLonger: false };
const loading = getInitialSyncPresentation(base);
assert.match(loading.title, /已登入/);
assert.equal(loading.progress, null, 'unknown total must not fabricate progress');
assert.equal(loading.canRetry, false, 'never duplicate an in-flight request');
assert.equal(getInitialSyncPresentation({ ...base, isTakingLonger: true }).canContinue, true);
assert.equal(getInitialSyncPresentation({ ...base, status: SyncStatus.IDLE, isTakingLonger: true }).canContinue, true);

const failed = getInitialSyncPresentation({ ...base, status: SyncStatus.ERROR });
assert.equal(failed.succeeded, false);
assert.equal(failed.canRetry, true);
assert.equal(failed.canContinue, true);
const offline = getInitialSyncPresentation({ ...base, status: SyncStatus.SUCCESS, isOnline: false });
assert.equal(offline.succeeded, false, 'connectivity loss overrides stale completion');
assert.equal(offline.canRetry, false);
assert.equal(offline.canContinue, true);
assert.equal(getInitialSyncPresentation({ ...base, status: SyncStatus.OFFLINE }).canRetry, true, 'a failed network request must remain retryable while the device reports online');
assert.equal(getInitialSyncPresentation({ ...base, status: SyncStatus.SUCCESS, pendingCount: 1 }).succeeded, false);
assert.equal(getInitialSyncPresentation({ ...base, status: SyncStatus.SUCCESS }).succeeded, true);
assert.equal(getInitialSyncPresentation({ ...base, status: SyncStatus.SUCCESS, isTakingLonger: true }).canContinue, false);

for (const progress of [{current:0,total:0}, {current:5,total:4}, {current:NaN,total:4}, {current:-1,total:4}, {current:1,total:Infinity}]) {
  assert.equal(getInitialSyncPresentation({ ...base, downloadProgress:progress }).progress, null);
}
const known = { ...base, downloadProgress:{current:2,total:4,currentItem:'正在讀取紀錄'} };
assert.equal(getInitialSyncPresentation(known).progress?.percentage, 50);
assert.equal(getInitialSyncPresentation({ ...known, status:SyncStatus.ERROR }).progress, null, 'failed attempts hide stale progress');
const html = renderToStaticMarkup(<InitialSyncContent input={known} />);
assert.match(html, /role="progressbar"[^>]*aria-label="目前同步步驟"[^>]*aria-valuemax="4"[^>]*aria-valuenow="2"/);
assert.match(html, /目前步驟：2 \/ 4/);
assert.doesNotMatch(renderToStaticMarkup(<InitialSyncContent input={base} />), /role="progressbar"/);
assert.match(renderToStaticMarkup(<InitialSyncContent input={{...base,status:SyncStatus.ERROR}} error="需重新確認連線" />), /role="alert"[^>]*>需重新確認連線/);

const noWrite = () => { throw new Error('rendering must not request sync or retry'); };
for (const status of Object.values(SyncStatus)) {
  const record = renderToStaticMarkup(<RecordSyncStatus status={status} pendingCount={2} lastSyncAt={null} isOnline={status !== SyncStatus.OFFLINE} onSync={noWrite} />);
  assert.match(record, /<button type="button"[^>]*aria-haspopup="dialog"/);
  assert.match(record, /<span>[^<]+<\/span>/, 'status must be visibly named, not color-only');
  if (status !== SyncStatus.IDLE && status !== SyncStatus.SUCCESS) assert.match(record, /2 筆<\/span>/, 'pending count stays visible during failed/offline/in-flight sync');
  assert.doesNotMatch(record, /disabled=""/, 'status details remain accessible even while syncing/offline');
}
const notice = renderToStaticMarkup(<RoleAccessNotice onRetry={noWrite} />);
assert.match(notice, /已登入，尚無法確認使用權限/);
assert.match(notice, /role="alert"/);
assert.match(notice, /重新確認權限/);
assert.doesNotMatch(notice, /市集總收入|商品清單/);
const skeleton = renderToStaticMarkup(<GlobalLoadingSkeleton message="正在確認登入狀態…" />);
assert.match(skeleton, /role="status"/);
assert.equal(skeleton.split('正在確認登入狀態…').length - 1, 1);

const read = (file: string) => readFileSync(join(__dirname,'..',file),'utf8');
const fallback = read('components/auth/RoleLoadingFallback.tsx');
assert.match(fallback, /roleRefreshState\.needsRetry[\s\S]*<RoleAccessNotice onRetry=\{refreshRole\}/);
assert.doesNotMatch(fallback, /useUserRole\(|from ['"]@\/lib\/supabase|\.from\(/);
const login = read('components/auth/LoginModal.tsx');
assert.match(login, /htmlFor=\{`\$\{formId\}-email`\}/);
assert.match(login, /htmlFor=\{`\$\{formId\}-password`\}/);
assert.match(login, /max-h-\[90dvh\][^\n]*overflow-y-auto/);
assert.doesNotMatch(login, /toast\.error/);
const initial = read('components/sync/InitialSyncDialog.tsx');
assert.match(initial, /status === SyncStatus\.SUCCESS && pendingCount === 0 && isOnline/);
assert.match(initial, /setTimeout\(\(\) => \{[\s\S]*hasSeenSuccessRef\.current = true;[\s\S]*setHasCompletedInitialSync\(initialSyncKey, true\)/);
assert.match(initial, /getSessionStatePort\(\)/);
assert.match(initial, /setIsTakingLonger\(true\), 30000\)[\s\S]*\[status, isOpen, initialSyncKey\]/, 'changing pending counts must not restart the slow-load escape timer');
assert.doesNotMatch(initial, /\b(?:window|document|localStorage|sessionStorage|navigator)\b/);
assert.doesNotMatch(read('lib/sync/initial-sync-presentation.ts'), /\b(?:window|document|navigator|localStorage|fetch)\b/);
console.log('PASS login phases, truthful sync scopes, bounded progress and fail-closed role retry UX');
