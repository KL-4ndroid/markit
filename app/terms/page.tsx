/**
 * Terms of Service Page - 服務條款頁面
 * 
 * 白名單路由：無需登入即可訪問
 */

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-8">服務條款</h1>
        
        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">服務說明</h2>
            <p className="text-muted-foreground leading-relaxed">
              出攤本是一款專為市集攤販設計的數位管理系統，提供銷售記錄、統計分析、
              團隊協作等功能。使用本服務即表示您同意遵守本服務條款。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">使用規範</h2>
            <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-2">
              <li>您必須年滿 18 歲或在法定監護人同意下使用本服務</li>
              <li>您對自己帳號的所有活動負責</li>
              <li>禁止使用本服務進行任何非法活動</li>
              <li>禁止嘗試破解、攻擊或干擾本服務的正常運作</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">資料所有權</h2>
            <p className="text-muted-foreground leading-relaxed">
              您保留對所有上傳資料的完整所有權。我們僅作為資料的託管者，
              不會聲稱對您的資料擁有任何權利。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">服務變更</h2>
            <p className="text-muted-foreground leading-relaxed">
              我們保留隨時修改或終止服務的權利，但會提前通知用戶重大變更。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">免責聲明</h2>
            <p className="text-muted-foreground leading-relaxed">
              本服務按「現狀」提供，不提供任何明示或暗示的保證。
              我們不對因使用本服務而產生的任何損失負責。
            </p>
          </section>
        </div>

        <div className="mt-8 text-center">
          <a
            href="/"
            className="text-primary hover:text-primary/85 transition-colors"
          >
            ← 返回首頁
          </a>
        </div>
      </div>
    </div>
  );
}
