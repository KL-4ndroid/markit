let epoch=0;
export const cashScopeEpoch=()=>epoch;
export function invalidateCashScope(){epoch+=1;}
