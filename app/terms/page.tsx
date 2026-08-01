import Link from 'next/link';

import { PublicDocumentShell } from '@/components/public/PublicDocumentShell';
import { resolvePublicLegalSupportConfig } from '@/lib/legal/public-legal-support-config';

export default function TermsPage() {
  const config = resolvePublicLegalSupportConfig(process.env);

  return (
    <PublicDocumentShell
      title="服務條款"
      description="使用 Féria 出攤筆記時，營運者與帳號使用者共同遵守的服務邊界。"
      effectiveDate={config.effectiveDate}
      publicationReady={config.policyPublicationReady}
    >
      <section className="py-7">
        <h2 className="text-lg font-semibold text-foreground">1. 適用範圍與同意</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Féria 出攤筆記提供市集、商品、成交、成本、互動、分析與團隊協作功能。建立帳號或使用服務，表示您已閱讀並同意本條款與隱私政策。未滿法定成年年齡者，須由法定代理人同意後使用。
        </p>
      </section>

      <section className="py-7">
        <h2 className="text-lg font-semibold text-foreground">2. 帳號與團隊責任</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
          <li>您應提供可聯絡的帳號資料、妥善保管登入方式，並在發現未授權使用時立即通知支援。</li>
          <li>工作空間擁有者負責邀請成員、指派角色與確認成員有權接觸品牌營運資料。</li>
          <li>團隊成員只能在授權範圍內處理資料，不得規避權限或冒用其他帳號。</li>
        </ul>
      </section>

      <section className="py-7">
        <h2 className="text-lg font-semibold text-foreground">3. 服務使用與可用性</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          服務支援離線暫存與登入後同步，但網路、裝置、瀏覽器或第三方雲端服務異常可能造成延遲。尚未同步的裝置資料在清除瀏覽器資料或解除安裝後可能無法復原。分析與報表是營運輔助資訊，不構成會計、稅務、法律或投資建議。
        </p>
      </section>

      <section className="py-7">
        <h2 className="text-lg font-semibold text-foreground">4. 您的內容與必要授權</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          您保有自行輸入內容的權利。為提供同步、備援、分析、團隊協作與您啟用的照片功能，您授權營運者及受託服務商在必要範圍內儲存、處理、傳輸與呈現該內容。您應確保輸入的第三人資料、照片與其他內容具有合法使用依據。
        </p>
      </section>

      <section className="py-7">
        <h2 className="text-lg font-semibold text-foreground">5. 禁止行為</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
          <li>使用服務進行違法、侵權、詐騙、騷擾或危害他人的活動。</li>
          <li>未經授權存取他人工作空間、測試帳號、管理介面或非公開資料。</li>
          <li>干擾服務、繞過安全與訂閱限制，或以自動化方式造成不合理負載。</li>
          <li>上傳惡意程式、機密驗證資料或無權處理的個人資料。</li>
        </ul>
      </section>

      <section className="py-7">
        <h2 className="text-lg font-semibold text-foreground">6. 免費功能與未來訂閱</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          目前版本尚未開放真實付款、定期扣款、續訂、取消或退款，因此不會向使用者收取訂閱費。正式收費前，將在付款確認前清楚揭露方案內容、總價、幣別、計費週期、試用條件、自動續訂、取消方式、服務生效時間、退款與法定解除權資訊，並取得明確同意。頁面上的方案規劃不等於已成立的付費契約。
        </p>
      </section>

      <section className="py-7">
        <h2 className="text-lg font-semibold text-foreground">7. 停權、終止與資料處理</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          發生重大違法、安全風險、權限濫用或持續破壞服務時，營運者得採取必要的限制措施，並在可行範圍內說明原因與申訴方式。您可透過支援中心提出帳號或資料刪除請求；實際刪除範圍與保留例外依隱私政策、尚未同步資料狀態及適用法令處理。
        </p>
      </section>

      <section className="py-7">
        <h2 className="text-lg font-semibold text-foreground">8. 責任邊界</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          營運者會採取合理措施維持服務與保護資料，但無法保證網路與第三方基礎設施永不中斷。任何責任限制均以適用法令允許範圍為限，不排除因故意或重大過失應負的責任，也不影響使用者依法不得預先排除的消費者權利與救濟。
        </p>
      </section>

      <section className="py-7">
        <h2 className="text-lg font-semibold text-foreground">9. 條款更新與聯絡</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          重大變更會在生效前以服務內公告或可聯絡方式通知，並標示新的生效日。付費條件若變更，會依適用法令及訂閱契約處理，不會以本條款單方面消除已成立的權利。
        </p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          問題或申訴請前往 <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/support">支援中心</Link>。準據法、管轄與通訊交易解除權的正式文字，須在付款啟用前完成台灣法務審查，不得以草案自行排除法定權利。
        </p>
      </section>
    </PublicDocumentShell>
  );
}
