let epoch=0;
const listeners=new Set<()=>void>();
export const financialReviewEpoch=()=>epoch;
export function subscribeFinancialReviewScope(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener);};}
export function invalidateFinancialReviewScope(){epoch++;listeners.forEach(listener=>listener());}
