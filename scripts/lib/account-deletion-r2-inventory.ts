// Audit tooling only. Candidate classification never authorizes a deletion.
import {isOwnedDeletionObjectKey} from '../../lib/subscription/account-deletion-engine.server';
export type PhotoReference={ownerId:string;key:string;status:string;expiresAt?:string|null};
export type ListedPhotoObject={key:string;size:number;modifiedAt?:string};
export function analyzeDeletionR2Inventory(input:{refs:PhotoReference[];objects:ListedPhotoObject[];metadataComplete:boolean;objectsComplete:boolean;metadataStable:boolean;at:string}){
 const refs=new Map<string,PhotoReference[]>();
 for(const r of input.refs)refs.set(r.key,[...(refs.get(r.key)??[]),r]);
 const keys=new Set(input.objects.map(o=>o.key));
 const ready=input.metadataComplete&&input.objectsComplete&&input.metadataStable;
 const result={comparisonComplete:ready,referencedKeys:refs.size,matchedKeys:0,invalidOwnerReferences:0,sharedOwnerReferences:0,
  uploadedReferencesNotListed:0,pastExpiryUploadedReferencesNotListed:0,otherReferencesNotListed:0,unreferencedObjects:0,agedUnreferencedCandidates:0,recentUnreferencedObjects:0,unclassifiedObjects:0};
 for(const [key,rows] of refs){
  if(rows.some(r=>!isOwnedDeletionObjectKey(key,r.ownerId)))result.invalidOwnerReferences++;
  if(new Set(rows.map(r=>r.ownerId)).size>1)result.sharedOwnerReferences++;
  if(keys.has(key))result.matchedKeys++;
  else if(ready){if(rows.some(r=>r.status==='uploaded')){
   result.uploadedReferencesNotListed++;
   if(rows.filter(r=>r.status==='uploaded').every(r=>Number.isFinite(Date.parse(r.expiresAt??''))&&Date.parse(r.expiresAt!)<=Date.parse(input.at)))result.pastExpiryUploadedReferencesNotListed++;
  }else result.otherReferencesNotListed++;}
 }
 for(const o of input.objects){
  const owner=/^(?:product-cover-photos|sales-evidence(?:-thumbs)?\/7d)\/([^/]+)\//.exec(o.key)?.[1];
  if(!owner||!isOwnedDeletionObjectKey(o.key,owner)){result.unclassifiedObjects++;continue;}
  if(refs.has(o.key)||!ready)continue;
  result.unreferencedObjects++;
  const age=Date.parse(input.at)-Date.parse(o.modifiedAt??'');
  if(!Number.isFinite(age)||age<0)result.unclassifiedObjects++;
  else if(age<86400000)result.recentUnreferencedObjects++;
  else result.agedUnreferencedCandidates++;
 }
 return result;
}
