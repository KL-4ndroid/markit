import assert from 'node:assert/strict';
import { resolveSubscriptionExperience, notifySubscriptionExperienceChanged, subscribeSubscriptionExperienceChanged } from '../lib/subscription/experience';
import { resolveModelAccountCapabilities } from '../lib/subscription/subscription-capabilities';
import { evaluateCapabilityAccess } from '../lib/subscription/subscription-access';
import { parseAccountCapabilityApiSuccess } from '../lib/subscription/account-capability-client';

const now = Date.parse('2026-10-26T08:00:00Z');
const ownerId = 'owner';
for (const [planCode, tier] of [['free','free'],['pro','light'],['team','advanced']] as const) {
  const cap = resolveModelAccountCapabilities({ ownerId, planCode, planSource:'admin', billingStatus:'none',
    entitlementStatus:'active', capabilityEvaluatedAt:new Date(now).toISOString(),
    capabilityRefreshAfter:new Date(now + 300000).toISOString(), entitlementEndsAt:new Date(now + 3600000).toISOString() });
  assert.equal(resolveSubscriptionExperience(cap, ownerId, now, 'online'),tier);
  assert.equal(resolveSubscriptionExperience(cap,'another-owner',now,'online'),'unavailable');
  assert.equal(resolveSubscriptionExperience(cap,ownerId,now + 300001,'online'),'unavailable');
  assert.equal(resolveSubscriptionExperience({...cap,entitlementStatus:'inactive'},ownerId,now,'online'),'free');
  assert.equal(parseAccountCapabilityApiSuccess({ok:true,status:'simulation_enabled',capabilities:cap})?.capabilities.planCode,planCode,'Free simulation must parse without granting ordinary admin-Free responses');
  if(planCode==='free') assert.equal(parseAccountCapabilityApiSuccess({ok:true,status:'admin_enabled',capabilities:cap}),null);
  const decision = evaluateCapabilityAccess({ authenticated:true, ownerWorkspaceAvailable:true,
    actorRole:'owner', rolePermission:true, capabilities:cap, feature:'settlementPdf',operation:'execute',
    runtimeEnabled:true,dataReady:true,nowMs:now,network:'online' });
  assert.equal(decision.allowed,planCode==='team','PDF requires advanced, not the old Pro capability');
  assert.equal(cap.features.productCoverPhoto,planCode!=='free');
  assert.equal(cap.features.advancedAnalytics,planCode==='team');
  assert.equal(cap.features.staffCollaboration,planCode==='team');
}
assert.equal(resolveSubscriptionExperience(null,ownerId,now,'online'),'unavailable');
let notifications=0;
const unsubscribe=subscribeSubscriptionExperienceChanged(()=>notifications++);
notifySubscriptionExperienceChanged(); unsubscribe(); notifySubscriptionExperienceChanged();
assert.equal(notifications,1,'switch invalidates all subscribers and supports cleanup');
console.log('PASS three tier boundaries, fresh scoped capabilities, simulation Free parser, PDF gate, and invalidation');
