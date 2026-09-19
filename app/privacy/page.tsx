import Link from 'next/link';

import { PublicDocumentShell } from '@/components/public/PublicDocumentShell';
import { resolvePublicLegalSupportConfig } from '@/lib/legal/public-legal-support-config';

export default function PrivacyPage() {
  const config = resolvePublicLegalSupportConfig(process.env);

  return (
    <PublicDocumentShell
      title="隱私政策"
      description="Féria 如何蒐集、使用、保存與保護帳號及市集營運資料。"
      effectiveDate={config.effectiveDate}
      publicationReady={config.policyPublicationReady}
    >
      <section className="py-7">
        <h2 className="text-lg font-semibold text-foreground">1. 資料控管者與適用範圍</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          本政策適用於 Féria 出攤筆記的 Web 應用、同步服務、支援流程及您選擇啟用的媒體功能。正式資料控管者為本頁公開設定的服務營運者；若營運者資訊未完整顯示，本版本仍是上架前草案，不得視為已完成對外告知。
        </p>
      </section>

      <section className="py-7">
        <h2 className="text-lg font-semibold text-foreground">2. 蒐集的資料</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
          <li>帳號識別資料：電子郵件、使用者 ID、登入與權限狀態。</li>
          <li>品牌營運資料：品牌設定、市集、商品、成本、成交、互動、備註與分析結果。</li>
          <li>團隊資料：邀請、成員關係、角色、權限與必要的操作紀錄。</li>
          <li>選用媒體：商品封面，以及啟用成交照片功能時所提交的照片與其狀態資料。</li>
          <li>技術與安全資料：版本、錯誤碼、請求時間、必要的稽核與事故診斷資料。</li>
        </ul>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          自由文字、備註與照片可能包含您自行輸入的第三人資料；請只提供完成市集營運目的所必要且有合法依據的內容。
        </p>
      </section>

      <section className="py-7">
        <h2 className="text-lg font-semibold text-foreground">3. 使用目的與方式</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          資料用於驗證帳號、維持工作空間權限、同步與重建資料、呈現營運紀錄、產生您可見的分析與報表、提供支援、偵測濫用及處理安全事故。Féria 不以出售個人資料為營運方式，也不會把品牌營運資料提供給其他品牌作商業使用。
        </p>
      </section>

      <section className="py-7">
        <h2 className="text-lg font-semibold text-foreground">4. 雲端服務與裝置暫存</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          登入後的雲端資料是帳號復原與跨裝置同步的主要可信來源。裝置端資料僅用於效能與離線操作，部分尚未同步的變更可能暫時只存在該裝置；清除瀏覽器資料前應先確認同步狀態。
        </p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          為提供服務，資料可能由受託服務商處理，包括 Supabase 的驗證與資料庫、Vercel 的 Web 主機與伺服器執行環境，以及功能啟用後用於私人照片物件的 Cloudflare R2。實際區域、跨境傳輸與受託契約須在正式上架前完成審查。
        </p>
      </section>

      <section className="py-7">
        <h2 className="text-lg font-semibold text-foreground">5. 保存與刪除</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
          <li>帳號與品牌營運資料原則上保存至帳號存續、使用者刪除資料或完成經驗證的刪除請求為止。</li>
          <li>裝置離線暫存保存至完成同步、使用者清除資料、瀏覽器移除網站資料或裝置政策淘汰為止。</li>
          <li>成交照片物件自成功上傳起保存七日；到期後成交金額與狀態資料仍可能保留，避免形成破損紀錄。</li>
          <li>商品封面保存至替換、刪除商品、主動刪除或帳號清理流程完成為止。</li>
          <li>安全、稽核、支援及未來帳務資料，依處理目的、爭議處理與適用法令保存；各類上限須在正式法務核准前記錄於內部資料保留表。</li>
        </ul>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          依法、爭議處理、安全調查或尚未完成同步所必要的資料，可能在原目的結束後有限度保留；不再需要時會刪除、去識別化或停止利用。
        </p>
      </section>

      <section className="py-7">
        <h2 className="text-lg font-semibold text-foreground">6. 您的選擇與權利</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          經身分驗證後，您可依法請求查詢、閱覽、取得複本、更正、補充、停止蒐集或利用，以及刪除個人資料。工作空間擁有者提出的品牌資料刪除，不會自動取代個別成員對其帳號資料的權利。
        </p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          請透過 <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/support">支援中心</Link> 提出申請。處理前可能要求合理的身分與工作空間權限證明；不需在來信中提供密碼或完整付款資料。
        </p>
      </section>

      <section className="py-7">
        <h2 className="text-lg font-semibold text-foreground">7. 安全與事件通知</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Féria 使用傳輸加密、資料列權限、私有媒體物件、最小權限及操作紀錄等措施降低風險。若知悉個人資料遭竊取、竄改、毀損、滅失或洩漏，會採取必要應變，並依適用法令通知受影響使用者與主管機關。
        </p>
      </section>

      <section className="py-7">
        <h2 className="text-lg font-semibold text-foreground">8. 兒少與政策更新</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          本服務面向市集品牌營運者，不以兒童為主要使用者，也不主動設計兒童個資蒐集流程。重大政策變更會標示新生效日並在生效前提供合理通知；若用途超出原告知範圍，會依適用法令取得必要同意。
        </p>
      </section>
    </PublicDocumentShell>
  );
}
