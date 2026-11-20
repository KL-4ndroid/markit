// Bundled ONLY by the loopback B05 acceptance server; no application route imports this.
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { NativeSubscriptionActions } from '../../components/subscription/NativeSubscriptionActions';
import { installApplePurchaseRuntime } from '../../lib/subscription/apple-purchase-runtime';
import { createApplePurchasePort, type ApplePurchaseBridge } from '../../lib/platform/capacitor/apple-purchases';
import type { InAppPurchaseProduct } from '../../lib/platform/contracts/in-app-purchase';

const ids = ['fixture.pro.month','fixture.pro.year','fixture.team.month','fixture.team.year'];
const token = '11111111-1111-4111-8111-111111111111';
let mode = 'normal', queued = false, lostOnce = false, purchases = 0, verifications = 0;
let renderedStats = () => {};
const products: InAppPurchaseProduct[] = ids.map((id,i) => ({store:'apple_app_store',productId:id,displayName:['輕量版 月繳','輕量版 年繳','高階版 月繳','高階版 年繳'][i],purchaseOptions:[{purchaseOptionId:id,basePlanId:null,offerId:null,pricePhases:[{displayPrice:['NT$59','NT$588','NT$249','NT$2,490'][i],currencyCode:'TWD',billingPeriod:i%2?'P1Y':'P1M',billingCycleCount:null,paymentMode:'recurring'}]}]}));
const tx = {transactionId:'1001',productId:ids[0],accountToken:token,environment:'sandbox',jws:'e30.e30.c2ln'};
const bridge: ApplePurchaseBridge = {
  async products() { return {products}; },
  async purchase(input) {
    purchases++; renderedStats();
    if(mode==='cancel')return {status:'cancelled'};
    if(mode==='pending')return {status:'pending'};
    tx.productId=input.productId; queued=true; return {status:'success',transaction:{...tx}};
  },
  async transactions(input) {return {transactions: queued||input.sync?[{...tx}]:[],accountMismatch:mode==='wrong-account'};},
  async finish() {queued=false;}, async manage() {},
};
installApplePurchaseRuntime({configuration:{enabled:true,productIds:ids,copyReviewed:true,termsUrl:'https://markit-app-mocha.vercel.app/terms',privacyUrl:'https://markit-app-mocha.vercel.app/privacy'},
  port:createApplePurchasePort({bridge,enabled:true,environment:'sandbox',productIds:ids}),
  async connect() {return {accountToken:token,billingOrigin:mode==='other-source'?'google_play':mode==='apple-source'?'apple_app_store':null,hasActiveSubscription:['other-source','apple-source'].includes(mode),
    server:{async verify(){verifications++;renderedStats();await new Promise(r=>setTimeout(r,300));if(mode==='lost-ack'&&!lostOnce){lostOnce=true;return 'retry';}return 'committed';},async refresh(){return true;}}};},
});
function Harness(){
  const [revision,setRevision]=useState(0);const [,updateStats]=useState(0);
  useEffect(() => { renderedStats=()=>updateStats(value=>value+1); return () => { renderedStats=()=>{}; }; }, []);
  return <main className="min-h-screen bg-atelier-canvas px-4 py-5 text-foreground"><div className="mx-auto max-w-3xl">
    <h1 className="text-xl font-semibold">B05 手機流程驗收（合成商店，沒有扣款）</h1>
    <label className="mt-3 block">測試情境 <select className="min-h-11 rounded border p-2" defaultValue="normal" onChange={event=>{mode=event.target.value;queued=false;lostOnce=false;purchases=0;verifications=0;setRevision(value=>value+1);}}>
      <option value="normal">正常購買</option><option value="lost-ack">保存成功但回應遺失</option><option value="cancel">取消</option><option value="pending">待核准</option><option value="wrong-account">帳號不符</option><option value="other-source">其他來源已有訂閱</option><option value="apple-source">Apple 已有訂閱</option>
    </select></label>
    <p className="my-2 text-sm" role="status">商店購買呼叫 {purchases} 次；驗證呼叫 {verifications} 次</p>
    <NativeSubscriptionActions key={revision} ownerId="fixture-owner" accessToken="synthetic-not-a-real-token" capabilityFresh />
  </div></main>;
}
createRoot(document.getElementById('root')!).render(<Harness/>);
