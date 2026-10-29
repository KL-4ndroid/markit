import assert from 'node:assert/strict';
import { canResumeBlockedAuth, type AuthCacheBlockedEventDetail } from '../lib/auth/auth-cache-blocked-events';
const blocked: AuthCacheBlockedEventDetail = { action:'passive_signout',userId:'original',message:'',pendingEventCount:0,
  unfinishedSyncQueueCount:0,pendingSalesPhotoEvidenceCreationCount:2,pendingSalesPhotoEvidencePayloadCount:1,blockingReasonCodes:[] };
assert.equal(canResumeBlockedAuth(blocked,'original'),true);
assert.equal(canResumeBlockedAuth(blocked,'different'),false);
assert.equal(canResumeBlockedAuth(blocked,null),false);
assert.equal(canResumeBlockedAuth({...blocked,userId:undefined},'original'),false);
assert.equal(canResumeBlockedAuth({...blocked,action:'staff_status_reset'},'original'),false);
assert.equal(canResumeBlockedAuth({...blocked,action:'identity_switch'},'original'),true);
assert.equal(blocked.pendingSalesPhotoEvidencePayloadCount,1);
console.log('PASS original-account reauthentication closes only its own auth prompt without changing pending data or role reset');
