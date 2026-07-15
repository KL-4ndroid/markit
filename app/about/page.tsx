import { APP_METADATA } from '@/lib/app-metadata';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl shadow-xl mb-6 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element -- PWA icon 已是預優化小圖，不需要 next/image 額外處理 */}
            <img
              src="/icons/icon-192x192.png"
              alt="Féria - 出攤筆記"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Féria</h1>
          <p className="text-lg text-muted-foreground">Féria - 出攤筆記</p>
        </div>
        
        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">關於我們</h2>
            <p className="text-muted-foreground leading-relaxed">
              Féria - 出攤筆記是專為市集攤販打造的數位管理系統，我們深知市集經營的辛苦與挑戰，
              因此致力於提供簡單、直覺、實用的工具，幫助攤販朋友們更輕鬆地管理生意。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">核心功能</h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-2xl">📊</span>
                <div>
                  <h3 className="font-semibold text-foreground">即時數據分析</h3>
                  <p className="text-muted-foreground text-sm">掌握每日銷售趨勢，做出更明智的決策</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">👥</span>
                <div>
                  <h3 className="font-semibold text-foreground">團隊協作</h3>
                  <p className="text-muted-foreground text-sm">員工管理與權限控制，輕鬆分工合作</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">📱</span>
                <div>
                  <h3 className="font-semibold text-foreground">PWA 應用</h3>
                  <p className="text-muted-foreground text-sm">可安裝到手機桌面，像原生 App 一樣使用</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">🔒</span>
                <div>
                  <h3 className="font-semibold text-foreground">本機儲存</h3>
                  <p className="text-muted-foreground text-sm">資料保存在此裝置，登入後可同步到雲端備份</p>
                </div>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">技術架構</h2>
            <p className="text-muted-foreground leading-relaxed">
              採用現代化的 Web 技術棧，包括 Next.js、Supabase、IndexedDB 等，
              確保應用的穩定性、安全性與效能。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">版本資訊</h2>
            <p className="text-muted-foreground leading-relaxed">
              當前版本：v{APP_METADATA.versionLabel}<br />
              最後更新：{APP_METADATA.lastUpdatedLabel}
            </p>
          </section>
        </div>

        <div className="mt-8 text-center">
          <a
            href="/settings/app"
            className="text-primary hover:text-primary/85 transition-colors"
          >
            ← 返回 App 與版本
          </a>
        </div>
      </div>
    </div>
  );
}
