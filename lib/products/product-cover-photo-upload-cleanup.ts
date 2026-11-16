/** Never remove a retained/current photo while cleaning obsolete versions. */
export async function cleanupProductPhotoKeys(keys:readonly (string|null|undefined)[],retained:readonly string[],remove:(key:string)=>Promise<boolean>):Promise<boolean>{
 const keep=new Set(retained);
 const results=await Promise.all([...new Set(keys.filter((k):k is string=>Boolean(k)&&!keep.has(k!)))].map(async key=>{try{return await remove(key);}catch{return false;}}));
 return results.every(Boolean);
}
/** Unknown transport/finalization outcomes must preserve images and local payload. */
export function isDefiniteProductPhotoRejection(error:{code?:string}|null):boolean{
 return Boolean(error&&/^[A-Z0-9]{5}$/.test(error.code??''));
}
