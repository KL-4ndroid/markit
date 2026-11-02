import assert from 'node:assert/strict';
import {analyzeDeletionR2Inventory} from '../scripts/lib/account-deletion-r2-inventory';
const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const key=`sales-evidence/7d/${owner}/a.webp`,old=`sales-evidence/7d/${owner}/old.webp`,fresh=`sales-evidence/7d/${owner}/new.webp`;
const input={refs:[{ownerId:owner,key,status:'uploaded'}],objects:[{key:old,size:1,modifiedAt:'2026-10-01T00:00:00Z'},{key:fresh,size:1,modifiedAt:'2026-11-02T00:00:00Z'},{key:'unknown/a.webp',size:1}],metadataComplete:true,objectsComplete:true,metadataStable:true,at:'2026-11-02T01:00:00Z'};
const result=analyzeDeletionR2Inventory(input);assert.equal(result.uploadedReferencesNotListed,1);assert.equal(result.agedUnreferencedCandidates,1);assert.equal(result.recentUnreferencedObjects,1);assert.equal(result.unclassifiedObjects,1);
for(const flags of [{metadataComplete:false},{objectsComplete:false},{metadataStable:false}]){
 const partial=analyzeDeletionR2Inventory({...input,...flags});assert.equal(partial.comparisonComplete,false);assert.equal(partial.agedUnreferencedCandidates,0);assert.equal(partial.uploadedReferencesNotListed,0);
}
const shared=analyzeDeletionR2Inventory({...input,refs:[...input.refs,{ownerId:other,key,status:'uploaded'}]});assert.equal(shared.invalidOwnerReferences,1);assert.equal(shared.sharedOwnerReferences,1);
assert.equal(analyzeDeletionR2Inventory({...input,objects:[{key:old,size:1}]}).agedUnreferencedCandidates,0);
assert.equal(analyzeDeletionR2Inventory({...input,refs:[{...input.refs[0],expiresAt:'2026-11-01T00:00:00Z'}]}).pastExpiryUploadedReferencesNotListed,1);
assert.equal(analyzeDeletionR2Inventory({...input,refs:[{...input.refs[0],expiresAt:'invalid'}]}).pastExpiryUploadedReferencesNotListed,0);
console.log('PASS incomplete/changing inventory, ownership mismatch and fresh/unknown objects never become deletion proof');
