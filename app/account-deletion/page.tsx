import Link from 'next/link';
import { PublicDocumentShell } from '@/components/public/PublicDocumentShell';
import { resolvePublicLegalSupportConfig,buildSupportMailto } from '@/lib/legal/public-legal-support-config';
import { ACCOUNT_DELETION_REQUEST_WORKFLOW_RELEASE_READY } from '@/lib/subscription/account-deletion-workflow-gate';

export default function AccountDeletionPage(){
 const config=resolvePublicLegalSupportConfig(process.env),enabled=ACCOUNT_DELETION_REQUEST_WORKFLOW_RELEASE_READY;
 const supportHref=buildSupportMailto(config.supportEmail,'帳號與資料刪除');
 return <PublicDocumentShell title="帳號與資料刪除" description="瞭解如何提出帳號刪除需求，以及資料處理範圍。" effectiveDate={config.effectiveDate} publicationReady={config.policyPublicationReady&&enabled}>
  <section className="space-y-6 py-7 text-sm leading-7 text-muted-foreground">
   <div><h2 className="text-lg font-semibold text-foreground">提出刪除需求</h2>
    <p className="mt-2">{enabled?'登入後，前往設定中的帳號與資料頁提出申請，依畫面完成身分確認。':'自助刪除功能尚未正式開放。如需提出帳號或資料刪除需求，請聯絡支援中心；我們會先確認身分與申請範圍。'}</p>
    {enabled&&<Link className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-primary px-4 font-medium text-primary-foreground" href="/settings/account/deletion">前往帳號刪除</Link>}
    {supportHref?<p className="mt-2"><a className="underline underline-offset-4" href={supportHref}>聯絡支援提出刪除需求</a></p>:<p className="mt-2">公開支援信箱尚未設定，請先查看支援中心的最新聯絡資訊。</p>}
    <p>請提供帳號信箱與希望刪除的範圍，不要提供密碼、驗證碼或付款憑證原文。</p>
   </div>
   <div><h2 className="text-lg font-semibold text-foreground">確認與撤回</h2>
    <p className="mt-2">正式申請流程會先檢查待傳資料並要求身分確認。在清理開始前可依申請狀態撤回；開始刪除後，已刪除的資料無法藉由撤回或重新登入復原。</p>
   </div>
   <div><h2 className="text-lg font-semibold text-foreground">資料處理範圍</h2>
    <p className="mt-2">品牌主與員工的資料範圍不同。員工刪帳不應刪除所屬品牌的成交或商品；品牌主的市集、商品、照片及相關紀錄則需逐項核對。必要保留資料、備份與處理期限，以正式隱私政策及核對結果為準，不會將尚待處理的項目標示為已清除。</p>
   </div>
   <div><h2 className="text-lg font-semibold text-foreground">訂閱與付款</h2>
    <p className="mt-2">目前尚未開放正式付款。未來若透過 App Store 或 Google Play 訂閱，刪除帳號與取消商店訂閱是不同操作，仍須在原商店管理訂閱。</p>
   </div>
   <nav aria-label="資料刪除相關連結" className="flex flex-wrap gap-5 border-t pt-5"><Link href="/support" className="underline underline-offset-4">支援中心</Link><Link href="/privacy" className="underline underline-offset-4">隱私政策</Link><Link href="/settings/account" className="underline underline-offset-4">返回帳號設定</Link></nav>
  </section>
 </PublicDocumentShell>;
}
